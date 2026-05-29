// A price data source. Sources are interchangeable workers behind the fetcher;
// v1 ships only Massive. Each returns RAW (unadjusted) data — see ADR-0001.

export interface DailyBar {
  date: string; // yyyy-mm-dd, trading day (ET)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HourlyBar {
  ts: number; // epoch ms, UTC (bar start)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Split {
  exDate: string; // yyyy-mm-dd
  numerator: number; // split_to
  denominator: number; // split_from
}

export interface Dividend {
  exDate: string; // yyyy-mm-dd
  cashAmount: number;
}

export interface PriceSource {
  readonly name: string;
  fetchDailyBars(symbol: string, from: string, to: string): Promise<DailyBar[]>;
  fetchHourlyBars(symbol: string, from: string, to: string): Promise<HourlyBar[]>;
  fetchSplits(symbol: string): Promise<Split[]>;
  fetchDividends(symbol: string): Promise<Dividend[]>;
}
