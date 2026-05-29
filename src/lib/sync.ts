import { eq } from "drizzle-orm";
import { db } from "../db";
import { watchlist } from "../db/schema";
import { readWatchlist } from "./wiki";

export interface SyncStats {
  total: number;
  resolved: number;
  unresolved: number;
  added: number;
  updated: number;
  skipped: string[]; // wiki-tickers with no resolvable symbol
}

// Upserts the wiki watchlist into `watchlist` without clobbering fetch state
// (lastFetched markers, ok/error status). See ADR-0002 / ADR-0003.
export function syncWatchlist(): SyncStats {
  const entries = readWatchlist();
  let resolved = 0;
  let unresolved = 0;
  let added = 0;
  let updated = 0;

  for (const e of entries) {
    if (e.symbol) resolved++;
    else unresolved++;

    const existing = db.select().from(watchlist).where(eq(watchlist.wikiTicker, e.wikiTicker)).get();
    if (!existing) {
      db.insert(watchlist)
        .values({
          wikiTicker: e.wikiTicker,
          symbol: e.symbol,
          status: e.symbol ? "pending" : "unresolved",
          source: e.symbol ? "massive" : null,
        })
        .run();
      added++;
    } else {
      // Preserve ok/error (fetch outcome); only (re)set the resolution status.
      const status = e.symbol
        ? existing.status === "ok" || existing.status === "error"
          ? existing.status
          : "pending"
        : "unresolved";
      db.update(watchlist)
        .set({
          symbol: e.symbol,
          status,
          source: e.symbol ? (existing.source ?? "massive") : existing.source,
        })
        .where(eq(watchlist.wikiTicker, e.wikiTicker))
        .run();
      updated++;
    }
  }

  return {
    total: entries.length,
    resolved,
    unresolved,
    added,
    updated,
    skipped: entries.filter((e) => !e.symbol).map((e) => e.wikiTicker),
  };
}
