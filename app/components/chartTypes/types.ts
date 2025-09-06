import { ISeriesApi } from 'lightweight-charts';

export type ChartVisualType = 'candles' | 'bars' | 'line' | 'area' | 'baseline' | 'heikin' | 'hollow';

export interface Candle {
  time: number; // unix (sec)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SeriesFactoryCtx {
  chart: import('lightweight-charts').IChartApi;
  candles: Candle[];
  cache: Record<string, ISeriesApi<any>>;
}

export interface SeriesFactoryResult {
  series: ISeriesApi<any>;
}

export type SeriesFactory = (ctx: SeriesFactoryCtx) => SeriesFactoryResult;
