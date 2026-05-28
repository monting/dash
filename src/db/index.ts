import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

// Reuse connection across hot reloads in dev
const globalForDb = globalThis as unknown as { _db: ReturnType<typeof drizzle> };

function makeDb() {
  const sqlite = new Database(path.join(process.cwd(), "data/wiki.db"));
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb._db ?? makeDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb._db = db;
}
