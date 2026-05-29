# Watchlist is derived from the LLM-wiki (read-only)

The dashboard's universe of symbols is not maintained in the dashboard. It is derived,
read-only, from the user's Obsidian stock-research vault at `~/wiki/stock_wiki` —
specifically the ticker notes under `markets/equities/<TICKER>.md`. The dashboard reads
each note's wiki-ticker (the filename) and an optional `symbol:` frontmatter field; it
never writes back to the wiki.

## Resolution rules

- Market symbol = the note's `symbol:` frontmatter if present, else the filename
  (correct for clean US tickers like `NVDA`, `META`, `GOOG`).
- Every fetch goes to Massive (US-only) in v1 — there is no international data source.
  Foreign / home-listed names are tracked via their US ADR when one exists: the note's
  `symbol:` holds the ADR (e.g. SK Hynix → `HXSCL`, TSMC → `TSM`).
- Notes with no resolvable symbol — tagged `unidentified`, or a foreign name with no
  ADR (e.g. Taiwan `4760`) — are skipped with `status = unresolved`, never fetched.

## Why

The wiki is where the research — and therefore the knowledge of what a ticker *is* —
already lives (notes already record "Nasdaq:NVDA", "KOSPI:000660"). Keeping it the single
source of truth means the dashboard stays a dumb downstream reader and the two projects
evolve independently.

## Consequences

- Coverage grows as the wiki matures; placeholder notes without a resolvable symbol
  simply don't chart yet.
- Renaming or deleting a wiki note changes the dashboard's universe on the next sync.
- ADR proxies are imperfect: unsponsored OTC ADRs (e.g. SK Hynix `HXSCL`) are thinly
  traded and diverge from the home listing in liquidity, FX, and trading hours.
