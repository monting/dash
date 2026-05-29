import { MassiveSource } from "./massive";
import type { PriceSource } from "./types";

const cache = new Map<string, PriceSource>();

export function getSource(name = "massive"): PriceSource {
  const cached = cache.get(name);
  if (cached) return cached;

  let source: PriceSource;
  switch (name) {
    case "massive": {
      const key = process.env.MASSIVE_API_KEY;
      if (!key) throw new Error("MASSIVE_API_KEY is not set (add it to .env.local)");
      source = new MassiveSource(key);
      break;
    }
    default:
      throw new Error(`Unknown source: ${name}`);
  }
  cache.set(name, source);
  return source;
}

export type { DailyBar, Dividend, HourlyBar, PriceSource, Split } from "./types";
