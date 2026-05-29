# Store raw OHLCV; adjust for splits/dividends at read time

We store only raw (unadjusted) daily OHLCV, plus separate `splits` and `dividends`
tables, and compute split/dividend-adjusted series at chart time — rather than persisting
the provider's adjusted close.

Adjusted prices are recomputed retroactively whenever a new corporate action occurs, so a
stored adjusted close is not immutable. Keeping raw data append-only is what makes our
"fetch once" model correct, and it lets us reconcile multiple providers later (raw OHLCV
is comparable across vendors; adjusted close is computed differently by each). Read-time
adjustment is cheap for daily data.

## Consequences

- The `prices` table drops its `adj_close` column.
- We must fetch and maintain corporate actions (splits, dividends) per symbol.
- The chart/query layer must apply the adjustment; plotting raw `close` directly on a
  multi-year chart will show discontinuities on split dates.
