import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDecipheriv } from 'node:crypto';
import Parser from 'rss-parser';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const requiredEnv = [
  'ENCRYPTION_KEY',
  'REGISTRY_PATH',
  'CATALOG_PATH',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM'
];

for (const key of requiredEnv) {
  if (!process.env[key] || !process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY.trim(), 'base64');
if (encryptionKey.length !== 32) {
  throw new Error('ENCRYPTION_KEY must decode to 32 bytes (base64-encoded).');
}

const registryFile = path.isAbsolute(process.env.REGISTRY_PATH)
  ? process.env.REGISTRY_PATH
  : path.join(path.dirname(__dirname), process.env.REGISTRY_PATH);

const catalogFile = path.isAbsolute(process.env.CATALOG_PATH)
  ? process.env.CATALOG_PATH
  : path.join(path.dirname(__dirname), process.env.CATALOG_PATH);

const timezoneName = process.env.DISPATCH_TIMEZONE ?? 'America/New_York';
const maxArticlesPerSource = Number(process.env.MAX_ARTICLES_PER_SOURCE ?? 6);
const windowMinutes = Number(process.env.DISPATCH_WINDOW_MINUTES ?? 20);
const forceSlot = process.env.FORCE_SLOT ?? 'auto';

const registry = JSON.parse(await readFile(registryFile, 'utf8'));
const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));

const topicMap = new Map(catalog.topics.map((topic) => [topic.id, topic]));
const sourceMap = new Map(catalog.sources.map((source) => [source.id, source]));

const parser = new Parser();

const decryptEmail = (ciphertext) => {
  const [ivPart, tagPart, dataPart] = ciphertext.split(':');
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Ciphertext malformed');
  }
  const iv = Buffer.from(ivPart, 'base64');
  const tag = Buffer.from(tagPart, 'base64');
  const data = Buffer.from(dataPart, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};

const shouldSendWindow = (entry, slot, now) => {
  const targetTime = entry.schedule?.[slot];
  if (!targetTime) return false;
  const [hourStr, minuteStr] = targetTime.split(':');
  const target = dayjs.tz(now.format('YYYY-MM-DD'), timezoneName)
    .hour(Number(hourStr))
    .minute(Number(minuteStr))
    .second(0)
    .millisecond(0);

  let diff = now.diff(target, 'minute');

  if (diff < -windowMinutes) {
    // handle wrap-around when now is just after midnight but schedule is previous day.
    const yesterdayTarget = target.subtract(1, 'day');
    diff = now.diff(yesterdayTarget, 'minute');
    if (diff < -windowMinutes || diff > windowMinutes) {
      return false;
    }
  } else if (Math.abs(diff) > windowMinutes) {
    return false;
  }

  const lastTimestamp = entry.lastDispatch?.[slot];
  if (!lastTimestamp) {
    return true;
  }

  const last = dayjs.tz(lastTimestamp, timezoneName);
  const lastDiff = Math.abs(last.diff(target, 'minute'));
  if (lastDiff <= windowMinutes && last.isSame(target, 'day')) {
    return false;
  }

  if (last.isAfter(now.subtract(windowMinutes, 'minute'))) {
    return false;
  }

  return true;
};

const selectEndpoints = (entry) => {
  const endpoints = [];

  for (const sourceId of entry.sources) {
    const source = sourceMap.get(sourceId);
    if (!source) continue;
    const matchedTopics = new Set(entry.topics);
    const sourceEndpoints = source.endpoints.filter((endpoint) => matchedTopics.has(endpoint.topic));
    if (sourceEndpoints.length) {
      for (const endpoint of sourceEndpoints) {
        endpoints.push({ ...endpoint, source });
      }
    } else {
      for (const endpoint of source.endpoints.slice(0, 2)) {
        endpoints.push({ ...endpoint, source });
      }
    }
  }
  return endpoints;
};

const fetchArticles = async (endpoints) => {
  const articles = [];
  const fetchErrors = [];

  await Promise.all(
    endpoints.map(async ({ source, ...endpoint }) => {
      try {
        const feed = await parser.parseURL(endpoint.url);
        for (const item of feed.items.slice(0, maxArticlesPerSource)) {
          const publishedAt = item.isoDate || item.pubDate || null;
          articles.push({
            sourceId: source.id,
            sourceName: source.name,
            topic: endpoint.topic,
            title: item.title || 'Untitled',
            link: item.link || item.guid || source.homepage,
            summary: item.contentSnippet || item.content?.slice(0, 280) || 'Summary unavailable.',
            publishedAt
          });
        }
      } catch (error) {
        fetchErrors.push({
          source: source.name,
          url: endpoint.url,
          message: error.message
        });
      }
    })
  );

  const deduped = Array.from(
    new Map(articles.map((article) => [article.link, article])).values()
  );

  deduped.sort((a, b) => {
    const dateA = a.publishedAt ? dayjs(a.publishedAt).valueOf() : 0;
    const dateB = b.publishedAt ? dayjs(b.publishedAt).valueOf() : 0;
    return dateB - dateA;
  });

  return { articles: deduped, fetchErrors };
};

const buildEmail = (entry, articles, errors, nowLabel) => {
  const grouped = new Map();
  for (const article of articles) {
    const topic = topicMap.get(article.topic)?.label ?? article.topic;
    if (!grouped.has(topic)) {
      grouped.set(topic, []);
    }
    grouped.get(topic).push(article);
  }

  const htmlSections = [];
  for (const [topic, items] of grouped) {
    const itemsHtml = items
      .slice(0, 10)
      .map(
        (item) => `
          <li>
            <a href="${item.link}">${item.title}</a>
            <div class="meta">${item.sourceName}${
          item.publishedAt ? ` • ${dayjs(item.publishedAt).tz(timezoneName).format('MMM D HH:mm')}` : ''
        }</div>
            <p>${item.summary}</p>
          </li>
        `
      )
      .join('');

    htmlSections.push(`
      <section>
        <h3>${topic}</h3>
        <ul>
          ${itemsHtml}
        </ul>
      </section>
    `);
  }

  const errorBlock = errors.length
    ? `
    <section class="alerts">
      <h3>Fetch alerts</h3>
      <ul>
        ${errors
          .map(
            (error) => `<li><strong>${error.source}</strong> (${error.url}) — ${error.message}. Will retry next run.</li>`
          )
          .join('')}
      </ul>
    </section>
  `
    : '';

  const html = `
  <html>
    <head>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; }
        .header { background: #0f172a; color: #fff; padding: 20px; }
        .header h2 { margin: 0; }
        section { border-bottom: 1px solid #e2e8f0; padding: 16px 20px; }
        section h3 { margin: 0 0 12px; }
        ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
        li { background: #f8fafc; padding: 12px; border-radius: 12px; }
        li a { color: #0f172a; font-weight: 600; text-decoration: none; }
        li .meta { color: #475569; font-size: 0.85rem; margin: 4px 0; }
        li p { margin: 0; color: #1e293b; font-size: 0.9rem; }
        .alerts { background: #fff7ed; }
        .alerts h3 { color: #c2410c; }
        footer { padding: 20px; font-size: 0.8rem; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Reuters competitor roundup</h2>
        <p>${nowLabel}</p>
        <p>Sources: ${entry.sources.map((id) => sourceMap.get(id)?.name ?? id).join(', ')}</p>
      </div>
      ${htmlSections.join('') || '<section><p>No fresh items matched the selected filters.</p></section>'}
      ${errorBlock}
      <footer>
        Email generated ${dayjs().tz(timezoneName).format('MMM D YYYY HH:mm z')} via GitHub Actions. Emails are not stored after send.
      </footer>
    </body>
  </html>
  `;

  const textSections = [];
  for (const [topic, items] of grouped) {
    const lines = items
      .slice(0, 10)
      .map(
        (item) => `• ${item.title} (${item.sourceName}${
          item.publishedAt ? `, ${dayjs(item.publishedAt).tz(timezoneName).format('MMM D HH:mm')}` : ''
        })\n  ${item.link}`
      )
      .join('\n');
    textSections.push(`${topic}\n${lines}`);
  }

  const text = [`Reuters competitor roundup`, nowLabel, '', ...textSections].join('\n\n');

  return { html, text };
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const dryRun = process.env.DRY_RUN === 'true';
if (dryRun) {
  console.log('Running in dry-run mode; emails will not be dispatched.');
} else {
  await transporter.verify();
}

const now = dayjs().tz(timezoneName);

let registryTouched = false;

for (const entry of registry.users) {
  const deliverables = [];
  if (forceSlot === 'primary' || forceSlot === 'secondary') {
    if (entry.schedule?.[forceSlot]) {
      deliverables.push(forceSlot);
    }
  } else {
    if (shouldSendWindow(entry, 'primary', now)) {
      deliverables.push('primary');
    }
    if (shouldSendWindow(entry, 'secondary', now)) {
      deliverables.push('secondary');
    }
  }

  if (!deliverables.length) {
    continue;
  }

  let recipient;
  try {
    recipient = decryptEmail(entry.emailCipher);
  } catch (error) {
    console.error(`Failed to decrypt email for ${entry.emailMask}: ${error.message}`);
    continue;
  }

  console.log(`::add-mask::${recipient}`);

  const endpoints = selectEndpoints(entry);
  const { articles, fetchErrors } = await fetchArticles(endpoints);

  const windowLabel = deliverables
    .map((slot) => `${slot === 'primary' ? 'Primary' : 'Secondary'} window • ${entry.schedule[slot]}`)
    .join(' & ');
  const nowLabel = `${now.format('MMM D YYYY')} — ${windowLabel}`;
  const { html, text } = buildEmail(entry, articles, fetchErrors, nowLabel);

  try {
    if (dryRun) {
      console.log(`[dry-run] Prepared ${deliverables.join(' & ')} window for ${entry.emailMask}`);
    } else {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: recipient,
        subject: `Competitor roundup — ${now.format('MMM D, YYYY HH:mm z')} (${windowLabel})`,
        html,
        text
      });
      console.log(`Dispatched ${deliverables.join(' & ')} window to ${entry.emailMask}`);
      registryTouched = true;
      const timestamp = new Date().toISOString();
      entry.lastDispatch = entry.lastDispatch || { primary: null, secondary: null };
      for (const slot of deliverables) {
        entry.lastDispatch[slot] = timestamp;
      }
      entry.updatedAt = timestamp;
    }
  } catch (error) {
    console.error(`Failed to send email to ${entry.emailMask}: ${error.message}`);
  }
}

if (registryTouched) {
  await writeFile(registryFile, JSON.stringify(registry, null, 2));
  console.log('Registry updated with latest dispatch timestamps.');
} else {
  console.log('No dispatches required this run.');
}
