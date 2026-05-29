CREATE TABLE `dividends` (
	`symbol` text NOT NULL,
	`ex_date` text NOT NULL,
	`cash_amount` real NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`symbol`, `ex_date`)
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`wiki_ticker` text PRIMARY KEY NOT NULL,
	`symbol` text,
	`status` text DEFAULT 'unresolved' NOT NULL,
	`source` text,
	`daily_last_fetched` text,
	`hourly_last_fetched` text,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`symbol` text NOT NULL,
	`date` text NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real,
	`volume` integer,
	`source` text NOT NULL,
	PRIMARY KEY(`symbol`, `date`)
);
--> statement-breakpoint
CREATE TABLE `prices_hourly` (
	`symbol` text NOT NULL,
	`ts` integer NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real,
	`volume` integer,
	`source` text NOT NULL,
	PRIMARY KEY(`symbol`, `ts`)
);
--> statement-breakpoint
CREATE TABLE `splits` (
	`symbol` text NOT NULL,
	`ex_date` text NOT NULL,
	`numerator` real NOT NULL,
	`denominator` real NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`symbol`, `ex_date`)
);
