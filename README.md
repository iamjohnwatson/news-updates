# Reuters competitor roundup automation

Static GitHub Pages portal plus GitHub Actions-only automation that lets Reuters business reporters configure twice-daily competitor briefings sourced from The Information, WSJ, Bloomberg, FT, TechCrunch, CNBC, and other desks. No servers or databases — every task from intake to email delivery runs inside GitHub.

## Highlights
- React/Vite single-page app deployable to GitHub Pages with token-free access for reporters.
- Configurable topic/source matrix, dual send windows, and GitHub submission options (automatic workflow trigger or pre-filled issue).
- Registration workflow stores subscriber metadata encrypted-at-rest in `user-configs/registry.json` (AES-256-GCM, key held as a secret).
- Scheduled workflow gathers headlines via RSS, composes HTML/text briefs, and dispatches mail via your SMTP provider with graceful degradation for feed hiccups.
- No persistent email storage outside the encrypted registry; runs mask addresses in logs and scrubs after each send.

## Repository layout
```
.github/workflows/   GitHub Actions (registration, digests, Pages deploy)
news-sources/        RSS/API catalogue and sourcing notes
scripts/             Node automation scripts invoked by workflows
src/                 React frontend for GitHub Pages portal
user-configs/        Encrypted subscriber registry (git-tracked)
```

## Frontend (GitHub Pages)
- Built with React + TypeScript using Vite. UI lives in `src/`, styles in `src/styles/`.
- `src/utils/github.ts` pushes submissions to GitHub via workflow dispatch (requires reporter-provided fine-grained token) or opens a ready-to-file issue.
- Configure owner/repo/branch in `.env` (copied from `.env.example`). During CI, the deploy workflow builds the site and publishes the `dist/` artifact with `actions/deploy-pages@v4`.
- Run locally: `cp .env.example .env`, fill the `VITE_*` values, then `npm install` and `npm run dev`.

## Automation workflows
### 1. `register-newsletter.yml`
Triggered manually or by the portal. Validates input, encrypts the email with `NEWSLETTER_ENCRYPTION_KEY`, updates `user-configs/registry.json`, and commits the change via `stefanzweifel/git-auto-commit-action`. Notes:
- Requires `NEWSLETTER_ENCRYPTION_KEY` secret (base64-encoded 32-byte key).
- Topics and sources must match IDs in `news-sources/catalog.json`.
- Inputs accept comma-separated lists (e.g. `markets,technology`).

### 2. `send-digests.yml`
Runs every 30 minutes (and on demand) to determine which subscribers are due in the current window.
- Decrypts registry records, masks addresses in logs, and honours per-user `primary` / `secondary` schedules.
- Fetches RSS feeds via `rss-parser`, limiting to `MAX_ARTICLES_PER_SOURCE` (default 6).
- Builds HTML + plain-text emails with topic grouping. Fetch failures appear in a “Fetch alerts” box so reporters know what to re-check.
- Sends through SMTP using `nodemailer`. Configure host, port, auth, and `SMTP_FROM` via secrets.
- Updates `lastDispatch` timestamps post-send, keeping registry clean. Supports `DRY_RUN=true` (repository variable) to rehearse without actually emailing or mutating state.
- Manual runs can set `force_slot` to `primary` or `secondary` to resend a specific window on demand.

### 3. `deploy-pages.yml`
Builds `npm run build` and publishes the portal to GitHub Pages on `main` pushes or manual dispatch. Configure the Pages site (Settings → Pages) to use the workflow.

## Scripts
- `scripts/register-newsletter.mjs` — input validation, AES-256-GCM encryption, registry update.
- `scripts/send-digests.mjs` — schedule matching, feed aggregation, HTML/text rendering, SMTP dispatch (with dry-run support).

Both scripts are ESM Node 20 modules and rely on configuration passed through environment variables/secrets (see below).

## Secrets & configuration
Everything sensitive belongs in GitHub Secrets or repository variables (used by Actions). `.env.example` lists the keys.

| Key | Location | Purpose |
| --- | --- | --- |
| `NEWSLETTER_ENCRYPTION_KEY` | Secret | Base64 32-byte key for AES-256-GCM email encryption |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Secrets | SMTP transport configuration |
| `DISPATCH_TIMEZONE` | Variable | IANA timezone string, default `America/New_York` |
| `MAX_ARTICLES_PER_SOURCE` | Variable | Cap per source (default 6) |
| `DISPATCH_WINDOW_MINUTES` | Variable | Acceptable +/- window around scheduled HH:MM (default 20) |
| `DRY_RUN` | Variable | Set to `true` to simulate digests without sending |

Frontend `.env` keys (`VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, etc.) can safely live in the repo for local dev, but do **not** include secrets — the portal requests a PAT from reporters only at submission time and never stores it.

## Data flow & privacy
1. Reporter completes the portal form. They can either trigger the registration workflow directly (fine-grained `actions:write` token) or open a pre-filled GitHub issue for manual processing.
2. `register-newsletter` workflow encrypts the email, records masked metadata in `user-configs/registry.json`, and commits the update. No plaintext emails live in git.
3. `send-digests` schedule checks every 30 minutes. When the current time is within `DISPATCH_WINDOW_MINUTES` of a subscriber’s target window, it decrypts the address in-memory, fetches competitor metadata, sends the email, updates `lastDispatch`, and drops the decrypted value.
4. Logs mask the real email using the `::add-mask::` directive. Secrets never leave GitHub Actions.

If a reporter revokes access, running the registration workflow with the same email but blank topics/sources (or removing the entry manually) ejects them. You can also delete their entry from the registry and commit.

## Extending and maintenance
- **Add a new source**: update `news-sources/catalog.json` with feed metadata, document in `news-sources/README.md`, and re-run a dispatch (dry-run recommended).
- **Adjust send cadence**: tweak `schedule` values via the registration workflow or edit the registry entry (the script will normalise when run next).
- **Change styling**: edit `src/styles/layout.css` / `global.css` and rebuild.
- **Testing**: `npm run build` validates the frontend; `node scripts/send-digests.mjs` with `DRY_RUN=true` exercises the backend pipeline locally (requires sample registry + env vars).

## Getting started
1. Fork/clone the repo. Install Node.js 20 (LTS) plus npm.
2. Copy `.env.example` → `.env` and fill the `VITE_*` fields for local dev.
3. Generate a base64 32-byte key (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) and add as the `NEWSLETTER_ENCRYPTION_KEY` secret.
4. Add SMTP credentials as repository secrets.
5. Enable GitHub Pages for the repo (Settings → Pages → Build and deployment → GitHub Actions) and run the `Build and deploy site` workflow once.
6. Trigger `Register newsletter request` with sample data (you can use `DRY_RUN=true` to avoid actual emails) to seed the registry.
7. Let `Send competitor digests` run on schedule or fire manually with `force_slot` as needed.

## Troubleshooting
- **Nothing sends**: ensure the registry has at least one user with valid `primary`/`secondary` times in the chosen timezone and that `DRY_RUN` is not `true`.
- **Feeds missing**: check workflow logs for “Fetch alerts”; feeds behind paywalls may require manual review.
- **SMTP failure**: the workflow surfaces transporter errors; double-check host/port/auth and whether `SMTP_SECURE` should be `true` (e.g. port 465).
- **Portal dispatch fails**: reporters must supply a fine-grained PAT with `actions:write` and `workflows:write` on the repo (explain in the portal copy/README).

## License
Internal Reuters tooling — add an explicit license if this leaves the organisation.
