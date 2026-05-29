import type { DailyBar, Dividend, HourlyBar, PriceSource, Split } from "./types";

// Massive is Polygon-shaped for aggregates (/v2/aggs/...) but uses its own
// /stocks/v1/ namespace for corporate actions. Base host + auth aren't fully
// documented publicly, so the base URL is env-overridable and we present the
// key both as a Bearer header and an apiKey query param.
const BASE = process.env.MASSIVE_BASE_URL ?? "https://api.massive.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Agg {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export class MassiveSource implements PriceSource {
  readonly name = "massive";

  constructor(private readonly apiKey: string) {}

  private async get(
    path: string,
    params: Record<string, string | number | boolean>,
  ): Promise<any> {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    url.searchParams.set("apiKey", this.apiKey);

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (res.ok) return res.json();
      // Back off on rate-limit / transient server errors, then retry.
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2 ** attempt * 1000);
        continue;
      }
      const body = await res.text().catch(() => "");
      const err: any = new Error(
        `Massive ${res.status} ${res.statusText} on ${path}: ${body.slice(0, 200)}`,
      );
      err.status = res.status;
      throw err;
    }
  }

  private async aggregates(
    symbol: string,
    timespan: "day" | "hour",
    from: string,
    to: string,
  ): Promise<Agg[]> {
    const out: Agg[] = [];
    let path: string | null =
      `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/${timespan}/${from}/${to}`;
    // adjusted=false: we store raw and adjust at read time (ADR-0001).
    let params: Record<string, string | number | boolean> = {
      adjusted: false,
      sort: "asc",
      limit: 50000,
    };
    while (path) {
      const body = await this.get(path, params);
      if (Array.isArray(body?.results)) out.push(...(body.results as Agg[]));
      const next: string | undefined = body?.next_url;
      if (next) {
        const u = new URL(next);
        path = u.pathname;
        params = Object.fromEntries(u.searchParams.entries());
      } else {
        path = null;
      }
    }
    return out;
  }

  async fetchDailyBars(symbol: string, from: string, to: string): Promise<DailyBar[]> {
    const rs = await this.aggregates(symbol, "day", from, to);
    // Daily bar `t` is ET-midnight in ms; the UTC date string is the trading day.
    return rs.map((r) => ({
      date: new Date(r.t).toISOString().slice(0, 10),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v ?? 0,
    }));
  }

  async fetchHourlyBars(symbol: string, from: string, to: string): Promise<HourlyBar[]> {
    const rs = await this.aggregates(symbol, "hour", from, to);
    return rs.map((r) => ({
      ts: r.t,
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v ?? 0,
    }));
  }

  async fetchSplits(symbol: string): Promise<Split[]> {
    try {
      const body = await this.get(`/stocks/v1/splits`, { ticker: symbol, limit: 1000 });
      const rows: any[] = body?.results ?? body?.data ?? (Array.isArray(body) ? body : []);
      return rows
        .map((s) => ({
          exDate: s.execution_date,
          numerator: Number(s.split_to),
          denominator: Number(s.split_from),
        }))
        .filter((s) => s.exDate && s.numerator > 0 && s.denominator > 0);
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }

  async fetchDividends(symbol: string): Promise<Dividend[]> {
    try {
      const body = await this.get(`/stocks/v1/dividends`, { ticker: symbol, limit: 1000 });
      const rows: any[] = body?.results ?? body?.data ?? (Array.isArray(body) ? body : []);
      return rows
        .map((d) => ({ exDate: d.ex_dividend_date, cashAmount: Number(d.cash_amount) }))
        .filter((d) => d.exDate && Number.isFinite(d.cashAmount));
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }
}
