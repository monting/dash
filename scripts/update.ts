// Fetch prices for every resolved watchlist symbol into SQLite.
// Run: bun run update            (syncs first, skips fresh symbols)
//      bun run update --force     (refetch everything)
//      bun run update --symbol=NVDA
//      bun run update --no-sync
import "../src/lib/env";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { watchlist } from "../src/db/schema";
import { updateSymbol } from "../src/lib/fetcher";
import { RateLimiter } from "../src/lib/ratelimit";
import { getSource } from "../src/lib/sources";
import { syncWatchlist } from "../src/lib/sync";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const noSync = args.includes("--no-sync");
  const only = args.find((a) => a.startsWith("--symbol="))?.split("=")[1];
  const freshMs = Number(process.env.FRESH_HOURS ?? 12) * 3_600_000;
  const rpm = Number(process.env.MASSIVE_RPM ?? 5);

  if (!noSync) {
    const s = syncWatchlist();
    console.log(`sync: ${s.resolved} resolved, ${s.unresolved} unresolved`);
  }

  let rows = db.select().from(watchlist).all().filter((r) => !!r.symbol);
  if (only) rows = rows.filter((r) => r.wikiTicker === only || r.symbol === only);

  if (rows.length === 0) {
    console.log("Nothing to fetch (no resolved symbols).");
    return;
  }

  // Fail fast with a clear message if the key is missing.
  try {
    getSource("massive");
  } catch (e: any) {
    console.error(`\n${e.message}\nGet a key from massive.com, put it in .env.local, then re-run.`);
    process.exitCode = 1;
    return;
  }

  const limiter = new RateLimiter(rpm, 60_000);
  let ok = 0;
  let skipped = 0;
  let errored = 0;

  for (const r of rows) {
    if (!force && r.dailyLastFetched && Date.now() - new Date(r.dailyLastFetched).getTime() < freshMs) {
      skipped++;
      continue;
    }
    try {
      const source = getSource(r.source ?? "massive");
      const c = await updateSymbol(r.wikiTicker, r.symbol!, source, limiter);
      console.log(`✓ ${r.wikiTicker} (${r.symbol}) — daily ${c.daily}, hourly ${c.hourly}, splits ${c.splits}, div ${c.dividends}`);
      ok++;
    } catch (e: any) {
      db.update(watchlist)
        .set({ status: "error", lastError: String(e?.message ?? e).slice(0, 500) })
        .where(eq(watchlist.wikiTicker, r.wikiTicker))
        .run();
      console.error(`✗ ${r.wikiTicker} (${r.symbol}) — ${e?.message ?? e}`);
      errored++;
    }
  }

  console.log(`\nDone: ${ok} updated, ${skipped} fresh-skipped, ${errored} errored  (${rows.length} resolved).`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
