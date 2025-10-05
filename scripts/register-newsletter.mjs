import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createCipheriv, randomBytes } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const requiredEnv = ['EMAIL', 'TOPICS', 'SOURCES', 'PRIMARY_SEND_TIME', 'ENCRYPTION_KEY', 'REGISTRY_PATH'];

for (const key of requiredEnv) {
  if (!process.env[key] || !process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const email = process.env.EMAIL.trim().toLowerCase();
const topics = process.env.TOPICS.split(',').map((value) => value.trim()).filter(Boolean);
const sources = process.env.SOURCES.split(',').map((value) => value.trim()).filter(Boolean);
const primarySendTime = process.env.PRIMARY_SEND_TIME.trim();
const secondarySendTime = process.env.SECONDARY_SEND_TIME?.trim() || null;
const notes = process.env.NOTES?.trim() || '';
const registryPath = process.env.REGISTRY_PATH.trim();
const encryptionKey = process.env.ENCRYPTION_KEY.trim();

const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;

if (!timePattern.test(primarySendTime)) {
  throw new Error('Primary send time must be HH:MM in 24h format.');
}

if (secondarySendTime && !timePattern.test(secondarySendTime)) {
  throw new Error('Secondary send time must be HH:MM in 24h format.');
}

if (!topics.length) {
  throw new Error('At least one topic is required.');
}

if (!sources.length) {
  throw new Error('At least one source is required.');
}

const maskEmail = (value) => {
  const [user, domain] = value.split('@');
  if (!domain) return '***';
  const maskedUser =
    user.length <= 2 ? `${user[0] ?? '*'}***` : `${user.slice(0, 2)}***${user.slice(-1)}`;
  return `${maskedUser}@${domain}`;
};

const encodeEmail = (value) => {
  const keyBuffer = Buffer.from(encryptionKey, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte key encoded in base64.');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
};

const userId = createHash('sha256').update(email).digest('hex').slice(0, 16);
const emailCipher = encodeEmail(email);
const masked = maskEmail(email);

const registryFile = path.isAbsolute(registryPath)
  ? registryPath
  : path.join(path.dirname(__dirname), registryPath);

const registryDir = path.dirname(registryFile);
await mkdir(registryDir, { recursive: true });

let registry;
try {
  const raw = await readFile(registryFile, 'utf8');
  registry = JSON.parse(raw);
} catch (error) {
  if (error.code === 'ENOENT') {
    registry = { version: 1, users: [] };
  } else {
    throw error;
  }
}

if (!Array.isArray(registry.users)) {
  throw new Error('Registry file is corrupt — `users` must be an array.');
}

const now = new Date().toISOString();

const nextRecord = {
  id: userId,
  emailCipher,
  emailMask: masked,
  topics,
  sources,
  schedule: {
    primary: primarySendTime,
    secondary: secondarySendTime
  },
  notes,
  createdAt: now,
  updatedAt: now,
  lastDispatch: {
    primary: null,
    secondary: null
  }
};

const existingIndex = registry.users.findIndex((entry) => entry.id === userId);

if (existingIndex >= 0) {
  const existing = registry.users[existingIndex];
  nextRecord.createdAt = existing.createdAt;
  nextRecord.lastDispatch = existing.lastDispatch ?? { primary: null, secondary: null };
  registry.users[existingIndex] = nextRecord;
} else {
  registry.users.push(nextRecord);
}

await writeFile(registryFile, JSON.stringify(registry, null, 2));

console.log(`::add-mask::${email}`);
console.log(`Registered configuration for ${masked} with ${topics.length} topics and ${sources.length} sources.`);
