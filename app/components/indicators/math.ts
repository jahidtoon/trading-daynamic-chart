import { Candle } from './types';

export const sma = (values: number[], period: number) => {
  const res: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) res[i] = sum / period;
  }
  return res;
};

export const ema = (values: number[], period: number) => {
  const res: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    prev = prev == null ? v : (v - prev) * k + prev;
    if (i >= period - 1) res[i] = prev;
  }
  return res;
};

export const smma = (values: number[], period: number) => {
  if (values.length < period) return new Array(values.length).fill(null);
  
  const res: (number | null)[] = new Array(values.length).fill(null);
  
  // First SMMA value is SMA of first 'period' values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let smmaValue = sum / period;
  res[period - 1] = smmaValue;
  
  // Subsequent SMMA values: (prevSMMA * (period - 1) + currentValue) / period
  for (let i = period; i < values.length; i++) {
    smmaValue = (smmaValue * (period - 1) + values[i]) / period;
    res[i] = smmaValue;
  }
  
  return res;
};

export const trueRange = (candles: Candle[], i: number) => {
  if (i === 0) return candles[0].high - candles[0].low;
  const prevClose = candles[i - 1].close;
  return Math.max(
    candles[i].high - candles[i].low,
    Math.abs(candles[i].high - prevClose),
    Math.abs(candles[i].low - prevClose)
  );
};

export const atr = (candles: Candle[], period: number) => {
  const trs: number[] = candles.map((_, i) => trueRange(candles, i));
  const res: (number | null)[] = new Array(candles.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < trs.length; i++) {
    const v = trs[i];
    if (i === period - 1) {
      let sum = 0; for (let j = 0; j < period; j++) sum += trs[j];
      prev = sum / period;
    } else if (i >= period) {
      prev = ((prev as number) * (period - 1) + v) / period;
    }
    if (i >= period - 1) res[i] = prev;
  }
  return res;
};
