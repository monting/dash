# Stock Trading Dashboard

A personal stock trading dashboard built with **Next.js 16**, **React 19**, and **Tailwind CSS**. Periodically fetches stock data into a local SQLite database and visualizes watchlist performance using interactive lightweight charts.

Integrates with a personal stock trading LLM wiki for trade research and decision-making support.

## Tech Stack

* **Next.js 16.x** — Full-stack React framework
* **React 19** — UI library
* **TypeScript** — Type safety
* **Tailwind CSS V4** — Styling
* **lightweight-charts** — Interactive charting library for watchlist visualization
* **Drizzle ORM** — SQLite database management
* **SQLite** — Local data persistence

## Installation & Setup

### Prerequisites

* Node.js 20.x or later
* npm or yarn

### Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Database Setup

Stock data is persisted in a local SQLite database. See the [Database](#database-drizzle--sqlite) section below for schema and usage.

```bash
npm run db:generate  # After schema changes
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio UI for database inspection
```

## Database (Drizzle + SQLite)

### Files

- `src/db/schema.ts` — Drizzle tables: `prices` (raw daily OHLCV, PK `symbol+date`), `prices_hourly` (rolling 7-day intraday, PK `symbol+ts`), `splits`, `dividends`, and `meta` (one row per wiki-ticker)
- `src/db/index.ts` — singleton db client; reuses the connection across hot reloads in dev, sets WAL mode for concurrent reads
- `drizzle.config.ts` — points drizzle-kit at the schema and `data/wiki.db`
- `drizzle/0000_mighty_wilson_fisk.sql` — generated migration (already applied)

### Usage

```ts
import { db } from "@/db";
import { prices, meta } from "@/db/schema";

// query
const rows = await db.select().from(prices).where(eq(prices.symbol, "AAPL"));

// insert
await db.insert(meta).values({ wikiTicker: "Apple_Inc.", symbol: "AAPL", status: "ok" });
```

### Scripts

```bash
npm run db:generate  # after schema changes
npm run db:migrate   # apply migrations
npm run db:studio    # Drizzle Studio UI
```

## Price data retrieval

Standalone CLIs pull **raw** price history from market-data providers (Massive) into
SQLite; the dashboard only ever reads SQLite. Design rationale lives in `docs/adr/`, the
domain glossary in `CONTEXT.md`.

The watchlist is derived (read-only) from the LLM wiki at `../stock_wiki` — the ticker
notes under `markets/equities/*.md`. Set `WIKI_PATH` to override. Copy `.env.example` to
`.env.local` and add your `MASSIVE_API_KEY`.

```bash
npm run sync                       # sync watchlist from the wiki into `meta`
npm run update                     # fetch prices for resolved symbols (syncs first)
npm run update -- --force          # refetch everything, ignore the freshness window
npm run update -- --symbol=NVDA    # one symbol
```

A wiki note resolves to a market symbol via its `symbol:` frontmatter, falling back to the
filename for clean US tickers; foreign/numeric/unidentified notes stay `unresolved` until
you add a `symbol:` (e.g. a US ADR). Scripts run under Node via `tsx` — not Bun — because
`better-sqlite3` is a Node native addon.

## Features

* **Watchlist Dashboard** — Track and visualize your stock positions
* **Interactive Charts** — lightweight-charts integration for candlestick, line, and area charts
* **Historical Price Data** — Periodically fetches and stores stock data in SQLite
* **Stock Research Integration** — Links to personal stock trading LLM wiki at `~/wiki/stock_wiki`
* **Responsive Design** — Works on desktop and tablet
* **Dark Mode** — Easy on the eyes during long trading sessions

All UI components are built with React and styled using Tailwind CSS.

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # Reusable React components
├── db/            # Database schema and client
└── lib/           # Utilities and helpers
```

## Wiki Integration

This dashboard pulls research and analysis from your personal stock trading wiki:

```
~/wiki/stock_wiki  # Source of truth for stock research and trading notes
```

Connect the two by referencing stock symbols from your wiki research in the dashboard watchlist.

## Recent Updates

* **Drizzle ORM Integration** — SQLite schema with Drizzle migrations for stock price data
* **lightweight-charts Library** — Professional charting for watchlist visualization
* **Next.js 16 & React 19** — Latest stable versions with TypeScript support

## License

This project is private and for personal use.
