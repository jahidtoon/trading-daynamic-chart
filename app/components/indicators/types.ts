import { ISeriesApi } from 'lightweight-charts';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorKey =
  | 'sma'
  | 'bb'
  | 'envelopes'
  | 'fractal'
  | 'ichimoku'
  | 'keltner'
  | 'donchian'
  | 'supertrend'
  | 'psar'
  | 'zigzag'
  | 'alligator';

export interface LineOutput {
  type: 'line';
  color: string;
  data: Array<{ time: number; value: number }>; // Only valid numbers, no nulls
}

export interface AreaOutput {
  type: 'area';
  color: string;
  data: Array<{ time: number; value: number }>; // Only valid numbers, no nulls
}

export type IndicatorOutput = LineOutput | AreaOutput;

export interface IndicatorDefinition {
  key: IndicatorKey;
  label: string;
}

export type SeriesEntry = { key: IndicatorKey; series: ISeriesApi<any>[] };
