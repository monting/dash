// Sync the watchlist from the LLM-wiki into `meta`. Read-only on the wiki.
// Run: bun run sync
import "../src/lib/env";
import { syncWatchlist } from "../src/lib/sync";
import { wikiPath } from "../src/lib/wiki";

const s = syncWatchlist();
console.log(`Synced ${s.total} notes from ${wikiPath()}/markets/equities`);
console.log(`  ${s.resolved} resolved, ${s.unresolved} unresolved  (${s.added} new, ${s.updated} updated)`);
if (s.skipped.length) {
  console.log(`  unresolved — add a \`symbol:\` field in the wiki to enable:`);
  console.log(`    ${s.skipped.join(", ")}`);
}
