# Competitor source catalogue

This folder captures headline-only ingest metadata for each monitored competitor. The actionable configuration that the automation consumes lives in `catalog.json`. This companion note explains sourcing rationale, access considerations, and fallbacks.

## Topic taxonomy

| ID | Label | Focus |
| --- | --- | --- |
| markets | Markets & Macro | Central banks, equities, rates, FX, commodities |
| finance | Corporate Finance | Balance sheets, earnings, capital markets |
| deals | M&A / Deals | Mergers, restructurings, venture, PE |
| technology | Technology & AI | Big tech, enterprise software, semis, AI |
| policy | Policy & Regulation | Regulatory, geopolitical market impacts |
| media | Media & Telecom | Streaming, telecoms, entertainment |
| startups | Startups & Venture | High-growth, VC and founder coverage |

Times recorded in user schedules are interpreted in the timezone defined by `DISPATCH_TIMEZONE` (default `America/New_York`).

## Source notes

### The Information (`the-information`)
- **Feeds**: `https://www.theinformation.com/feeds/latest`
- **Topics**: technology, startups, media
- **Usage**: Feed exposes teasers without paywalled bodies. Automation captures headline + summary, links to source.
- **Fallback**: If RSS request fails, workflow flags a fetch alert; manual follow-up may be required because site gatekeeps aggressively.

### Wall Street Journal (`wsj`)
- **Feeds**:
  - Markets: `https://feeds.a.dj.com/rss/RSSMarketsMain.xml`
  - Finance: `https://feeds.a.dj.com/rss/RSSMarketsMain.xml`
  - M&A: `https://feeds.a.dj.com/rss/RSSDealBkg.xml`
  - Technology: `https://feeds.a.dj.com/rss/RSSWSJD.xml`
- **Notes**: Article abstracts respect paywall. Reuse limited to metadata, no full text.
- **Fallback**: If any endpoint fails, the workflow records a fetch alert; the email still sends, highlighting the gap.

### Bloomberg (`bloomberg`)
- **Feeds**:
  - Markets podcast headlines: `https://www.bloomberg.com/feed/podcast/etf-report.xml`
  - Tech Take: `https://www.bloomberg.com/feed/podcast/techtake.xml`
- **Notes**: Bloomberg limits RSS breadth. Feeds provide show notes which give enough metadata for surveillance.
- **Fallback**: When parsing fails, automation leans on summary metadata; scraping selectors documented in `catalog.json` but disabled unless explicitly enabled.

### Financial Times (`ft`)
- **Feeds**:
  - Companies/Markets: `https://www.ft.com/rss/companies`
  - World/Policy: `https://www.ft.com/rss/world`
  - Technology: `https://www.ft.com/rss/technology`
- **Notes**: FT RSS exposes standfirst + link. Respect usage limits; only metadata captured.

### TechCrunch (`techcrunch`)
- **Feeds**:
  - Front page: `https://techcrunch.com/feed/`
  - Startups vertical: `https://techcrunch.com/startups/feed/`
- **Notes**: Rich metadata (tags, excerpt). Good for startup coverage bursts.

### CNBC (`cnbc`)
- **Feeds**:
  - Markets: `https://www.cnbc.com/id/100003114/device/rss/rss.html`
  - Finance: `https://www.cnbc.com/id/19836768/device/rss/rss.html`
- **Notes**: High-volume; sender trims to `MAX_ARTICLES_PER_SOURCE` to avoid noise.

## Extending coverage

1. Add new feed metadata to `catalog.json` with a unique `id`.
2. Optionally document legal/technical caveats in this README.
3. Commit changes; the next dispatch run will automatically pick up the new source.

If a new source requires HTML scraping rather than RSS, document selectors inside `catalog.json` (see Bloomberg example) and ensure the fetcher respects robots.txt before enabling.
