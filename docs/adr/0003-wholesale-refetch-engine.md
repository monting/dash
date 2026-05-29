# Wholesale idempotent refetch; no incremental queue

Each run refetches a symbol's entire daily window and its 7-day hourly window and upserts
them, rather than tracking and appending only new bars, or maintaining an explicit
job/queue table. Progress and resumability come from the data itself: the rows already in
SQLite plus per-symbol `*_last_fetched` markers in `watchlist` are the ledger — a run skips
symbols refreshed within the freshness window, and an interrupted sweep just resumes on
the next run.

## Why

Because 2–5yr of daily *and* a 7-day hourly window each fit in a single Massive request
(well under the 5,000-bar limit), incremental fetching saves **zero** requests. The only
thing it would buy is fewer row-writes — at the cost of needing a market-holiday calendar
and gap-detection to stay correct, and it still would not self-heal interior holes, vendor
revisions, or today's not-yet-final bar. Wholesale upsert is idempotent and self-correcting,
and at ≤50 symbols a job-queue table earns nothing.

## Consequences

- This is deliberately **not** incremental. Do not "optimize" it into incremental appends
  without first confirming the per-symbol payload still fits in one request — it stops
  being free once a dataset needs pagination (a much larger universe, or deep intraday
  history). At that point an explicit queue + incremental fetch becomes warranted.
