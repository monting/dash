import fs from "node:fs";
import path from "node:path";

// Reads the watchlist from the LLM-wiki's markets/equities notes (ADR-0002).
// Read-only: the dashboard never writes to the wiki.

export interface WatchlistEntry {
  wikiTicker: string; // note filename, uppercase
  symbol: string | null; // resolved market symbol, or null if unresolved
}

// A plausible US ticker when no explicit `symbol:` override is given.
const US_TICKER = /^[A-Z]{1,5}$/;

export function wikiPath(): string {
  return process.env.WIKI_PATH ?? path.join(process.cwd(), "..", "stock_wiki");
}

// Minimal frontmatter parse — enough for `symbol:` (string) and `tags:` (list),
// which is all the resolver needs. The vault follows a controlled convention.
function parseFrontmatter(text: string): Record<string, string | string[]> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string | string[]> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const val = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      out[kv[1]] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      out[kv[1]] = val.replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

export function readWatchlist(): WatchlistEntry[] {
  const dir = path.join(wikiPath(), "markets", "equities");
  if (!fs.existsSync(dir)) {
    throw new Error(`Wiki equities dir not found: ${dir} (set WIKI_PATH in .env.local)`);
  }

  const entries: WatchlistEntry[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const wikiTicker = file.slice(0, -3);
    const fm = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
    const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];
    const explicit = typeof fm.symbol === "string" && fm.symbol ? (fm.symbol as string) : null;

    let symbol: string | null;
    if (explicit) {
      symbol = explicit; // wiki-provided override (e.g. an ADR for a foreign name)
    } else if (tags.includes("unidentified")) {
      symbol = null; // explicitly flagged as not-a-known-ticker
    } else if (US_TICKER.test(wikiTicker)) {
      symbol = wikiTicker; // clean US ticker — filename is the symbol
    } else {
      symbol = null; // numeric/foreign/odd — needs an explicit `symbol:`
    }

    entries.push({ wikiTicker, symbol });
  }
  return entries.sort((a, b) => a.wikiTicker.localeCompare(b.wikiTicker));
}
