import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const prices = sqliteTable(
  "prices",
  {
    symbol: text("symbol").notNull(),
    date: text("date").notNull(), // ISO yyyy-mm-dd
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close"),
    adjClose: real("adj_close"),
    volume: integer("volume"),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.date] })],
);

export const meta = sqliteTable("meta", {
  wikiTicker: text("wiki_ticker").primaryKey(),
  symbol: text("symbol"),
  lastFetched: text("last_fetched"),
  status: text("status"),
});
