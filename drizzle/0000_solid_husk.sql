CREATE TABLE `meta` (
	`wiki_ticker` text PRIMARY KEY NOT NULL,
	`symbol` text,
	`last_fetched` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`symbol` text NOT NULL,
	`date` text NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real,
	`adj_close` real,
	`volume` integer,
	PRIMARY KEY(`symbol`, `date`)
);
