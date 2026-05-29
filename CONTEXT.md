# Stock Dashboard

A personal stock trading/research dashboard. It retrieves historical price data from
external providers (starting with Massive) into a local SQLite database and renders fast
charts. Its watchlist is derived from the user's LLM-wiki for stock research.

## Language

**Symbol**:
The market ticker a price-data provider uses to identify a security (e.g. `AAPL`). The
join key for price rows. Resolved from a wiki-ticker, which it may or may not match.
_Avoid_: ticker (ambiguous — could mean the wiki-ticker)

**Wiki-ticker**:
The uppercase filename of a stock's note under the wiki's `markets/equities/` (e.g.
`NVDA`, `SKHYNIX`, `4760`). Often equals the market symbol, but may be a personal
shorthand or a foreign/numeric code that has to be resolved to one.
_Avoid_: ticker

**LLM-wiki**:
The user's Obsidian vault at `~/wiki/stock_wiki` (sibling of this repo). Stock pages live
at `markets/equities/<TICKER>.md`. The dashboard reads it read-only to derive its
watchlist; the wiki never depends on the dashboard.

**Watchlist**:
The set of stocks the dashboard fetches prices for, derived from the wiki's
`markets/equities/*.md` notes (currently ~38). Defined in the wiki, not in the dashboard.
