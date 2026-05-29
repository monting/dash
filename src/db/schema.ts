import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Raw, unadjusted daily OHLCV. Idempotent wholesale upsert (ADR-0003); we store
// raw and adjust for splits/dividends at read time (ADR-0001).
export const prices = sqliteTable(
  "prices",
  {
    symbol: text("symbol").notNull(),
    date: text("date").notNull(), // ISO yyyy-mm-dd (trading day, ET)
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close"),
    volume: integer("volume"),
    source: text("source").notNull(), // provenance, e.g. "massive"
  },
  (t) => [primaryKey({ columns: [t.symbol, t.date] })],
);

// Raw hourly bars: rolling ~7-day window incl. extended hours. Pruned each run.
export const pricesHourly = sqliteTable(
  "prices_hourly",
  {
    symbol: text("symbol").notNull(),
    ts: integer("ts").notNull(), // epoch ms, UTC (bar start)
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close"),
    volume: integer("volume"),
    source: text("source").notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.ts] })],
);

// Corporate actions, kept raw so the chart layer can adjust on read (ADR-0001).
export const splits = sqliteTable(
  "splits",
  {
    symbol: text("symbol").notNull(),
    exDate: text("ex_date").notNull(), // yyyy-mm-dd
    numerator: real("numerator").notNull(), // split_to
    denominator: real("denominator").notNull(), // split_from
    source: text("source").notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.exDate] })],
);

export const dividends = sqliteTable(
  "dividends",
  {
    symbol: text("symbol").notNull(),
    exDate: text("ex_date").notNull(),
    cashAmount: real("cash_amount").notNull(),
    source: text("source").notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.exDate] })],
);

// One row per wiki-ticker. Derived from the LLM-wiki (ADR-0002) and doubling as
// the fetch-progress ledger (ADR-0003).
export const watchlist = sqliteTable("watchlist", {
  wikiTicker: text("wiki_ticker").primaryKey(),
  symbol: text("symbol"), // resolved market symbol; null when unresolved
  status: text("status").notNull().default("unresolved"), // unresolved | ok | error
  source: text("source"), // pinned source for this symbol, e.g. "massive"
  dailyLastFetched: text("daily_last_fetched"), // ISO timestamp
  hourlyLastFetched: text("hourly_last_fetched"),
  lastError: text("last_error"),
});
