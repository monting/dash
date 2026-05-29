import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { dividends, meta, prices, pricesHourly, splits } from "../db/schema";
import type { RateLimiter } from "./ratelimit";
import type { PriceSource } from "./sources/types";

const DAILY_YEARS = Number(process.env.DAILY_YEARS ?? 2);
const HOURLY_DAYS = 7;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};
const yearsAgo = (n: number) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d;
};

export interface UpdateCounts {
  daily: number;
  hourly: number;
  splits: number;
  dividends: number;
}

// Wholesale refetch + idempotent upsert of every dataset for one symbol
// (ADR-0003). Raw OHLCV (ADR-0001); the hourly window is pruned to ~7 days.
export async function updateSymbol(
  wikiTicker: string,
  symbol: string,
  source: PriceSource,
  limiter: RateLimiter,
): Promise<UpdateCounts> {
  const src = source.name;
  const now = new Date();
  const today = ymd(now);

  // Daily — full window.
  await limiter.take();
  const daily = await source.fetchDailyBars(symbol, ymd(yearsAgo(DAILY_YEARS)), today);
  if (daily.length) {
    db.insert(prices)
      .values(
        daily.map((b) => ({
          symbol,
          date: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
          source: src,
        })),
      )
      .onConflictDoUpdate({
        target: [prices.symbol, prices.date],
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          volume: sql`excluded.volume`,
          source: sql`excluded.source`,
        },
      })
      .run();
  }
  db.update(meta).set({ dailyLastFetched: now.toISOString() }).where(eq(meta.wikiTicker, wikiTicker)).run();

  // Hourly — rolling 7-day window, then prune anything older.
  await limiter.take();
  const hourly = await source.fetchHourlyBars(symbol, ymd(daysAgo(HOURLY_DAYS)), today);
  if (hourly.length) {
    db.insert(pricesHourly)
      .values(
        hourly.map((b) => ({
          symbol,
          ts: b.ts,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
          source: src,
        })),
      )
      .onConflictDoUpdate({
        target: [pricesHourly.symbol, pricesHourly.ts],
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          volume: sql`excluded.volume`,
          source: sql`excluded.source`,
        },
      })
      .run();
  }
  db.delete(pricesHourly)
    .where(and(eq(pricesHourly.symbol, symbol), lt(pricesHourly.ts, daysAgo(HOURLY_DAYS).getTime())))
    .run();
  db.update(meta).set({ hourlyLastFetched: now.toISOString() }).where(eq(meta.wikiTicker, wikiTicker)).run();

  // Corporate actions — raw, for read-time adjustment (ADR-0001).
  await limiter.take();
  const sp = await source.fetchSplits(symbol);
  if (sp.length) {
    db.insert(splits)
      .values(sp.map((s) => ({ symbol, exDate: s.exDate, numerator: s.numerator, denominator: s.denominator, source: src })))
      .onConflictDoUpdate({
        target: [splits.symbol, splits.exDate],
        set: { numerator: sql`excluded.numerator`, denominator: sql`excluded.denominator`, source: sql`excluded.source` },
      })
      .run();
  }

  await limiter.take();
  const dv = await source.fetchDividends(symbol);
  if (dv.length) {
    db.insert(dividends)
      .values(dv.map((d) => ({ symbol, exDate: d.exDate, cashAmount: d.cashAmount, source: src })))
      .onConflictDoUpdate({
        target: [dividends.symbol, dividends.exDate],
        set: { cashAmount: sql`excluded.cash_amount`, source: sql`excluded.source` },
      })
      .run();
  }

  db.update(meta).set({ status: "ok", lastError: null }).where(eq(meta.wikiTicker, wikiTicker)).run();
  return { daily: daily.length, hourly: hourly.length, splits: sp.length, dividends: dv.length };
}
