import { Candle, IndicatorOutput } from './types';
import { sma, ema, smma, atr } from './math';

// Helper function to filter out null values for lightweight-charts
const filterValidData = (data: Array<{ time: number; value: number | null }>): Array<{ time: number; value: number }> => {
  return data.filter(item => 
    item.value !== null && 
    item.value !== undefined && 
    !isNaN(item.value) && 
    isFinite(item.value)
  ) as Array<{ time: number; value: number }>;
};

export const calcSMA = (candles: Candle[], period = 20): IndicatorOutput[] => {
  const closes = candles.map(c => c.close);
  const s = sma(closes, period);
  const data = candles.map((c, i) => ({ time: c.time, value: s[i] }))
    .filter(item => item.value !== null && item.value !== undefined && !isNaN(item.value)) as Array<{ time: number; value: number }>;
  
  return [{ type: 'line', color: '#f59e0b', data }];
};

export const calcBollinger = (candles: Candle[], period = 20, mult = 2): IndicatorOutput[] => {
  const closes = candles.map(c => c.close);
  const mid = sma(closes, period);
  const std: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (i >= period - 1) {
      let sum = 0; let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) { sum += closes[j]; sumSq += closes[j] * closes[j]; }
      const mean = sum / period;
      std[i] = Math.sqrt(sumSq / period - mean * mean);
    }
  }
  const upper = filterValidData(candles.map((c, i) => ({ time: c.time, value: mid[i] != null && std[i] != null ? (mid[i] as number) + mult * (std[i] as number) : null })));
  const lower = filterValidData(candles.map((c, i) => ({ time: c.time, value: mid[i] != null && std[i] != null ? (mid[i] as number) - mult * (std[i] as number) : null })));
  const middle = filterValidData(candles.map((c, i) => ({ time: c.time, value: mid[i] ?? null })));
  return [
    { type: 'line', color: '#60a5fa', data: upper },
    { type: 'line', color: '#60a5fa', data: middle },
    { type: 'line', color: '#60a5fa', data: lower },
  ];
};

export const calcEnvelopes = (candles: Candle[], period = 20, percent = 2): IndicatorOutput[] => {
  const closes = candles.map(c => c.close);
  const mid = sma(closes, period);
  const upper = filterValidData(candles.map((c, i) => ({ time: c.time, value: mid[i] != null ? (mid[i] as number) * (1 + percent / 100) : null })));
  const lower = filterValidData(candles.map((c, i) => ({ time: c.time, value: mid[i] != null ? (mid[i] as number) * (1 - percent / 100) : null })));
  const middle = filterValidData(candles.map((c, i) => ({ time: c.time, value: mid[i] ?? null })));
  return [
    { type: 'line', color: '#a78bfa', data: upper },
    { type: 'line', color: '#a78bfa', data: middle },
    { type: 'line', color: '#a78bfa', data: lower },
  ];
};

export const calcFractalsMarkers = (candles: Candle[]) => {
  const markers: any[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const w = candles.slice(i - 2, i + 3);
    const m = candles[i];
    const isHigh = w.every(c => m.high >= c.high);
    const isLow = w.every(c => m.low <= c.low);
    if (isHigh) markers.push({ time: m.time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', size: 1 } as any);
    if (isLow) markers.push({ time: m.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', size: 1 } as any);
  }
  return markers;
};

export const calcIchimoku = (candles: Candle[], intervalSec: number): IndicatorOutput[] => {
  const hh = (i: number, len: number) => Math.max(...candles.slice(i - len + 1, i + 1).map(c => c.high));
  const ll = (i: number, len: number) => Math.min(...candles.slice(i - len + 1, i + 1).map(c => c.low));
  const tenkan: (number | null)[] = new Array(candles.length).fill(null);
  const kijun: (number | null)[] = new Array(candles.length).fill(null);
  const spanA: (number | null)[] = new Array(candles.length).fill(null);
  const spanB: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (i >= 9 - 1) tenkan[i] = (hh(i, 9) + ll(i, 9)) / 2;
    if (i >= 26 - 1) kijun[i] = (hh(i, 26) + ll(i, 26)) / 2;
    if (i >= 26 - 1) spanA[i] = tenkan[i] != null && kijun[i] != null ? ((tenkan[i] as number) + (kijun[i] as number)) / 2 : null;
    if (i >= 52 - 1) spanB[i] = (hh(i, 52) + ll(i, 52)) / 2;
  }
  const shiftSec = intervalSec * 26;
  const toLine = (arr: (number | null)[]) => filterValidData(candles.map((c, i) => ({ time: c.time, value: arr[i] ?? null })));
  const shift = (arr: (number | null)[], sec: number) => filterValidData(candles.map((c, i) => ({ time: c.time + sec, value: arr[i] ?? null })));
  return [
    { type: 'line', color: '#f472b6', data: toLine(tenkan) },
    { type: 'line', color: '#22d3ee', data: toLine(kijun) },
    { type: 'line', color: '#34d399', data: shift(spanA, shiftSec) },
    { type: 'line', color: '#fb7185', data: shift(spanB, shiftSec) },
    { type: 'line', color: '#9ca3af', data: filterValidData(candles.map((c, i) => ({ time: c.time - shiftSec, value: candles[i].close }))) },
  ];
};

export const calcKeltner = (candles: Candle[], period = 20, atrPeriod = 10, mult = 2): IndicatorOutput[] => {
  const typical = candles.map(c => (c.high + c.low + c.close) / 3);
  const center = ema(typical, period);
  const atrVals = atr(candles, atrPeriod);
  const upper = filterValidData(candles.map((c, i) => ({ time: c.time, value: center[i] != null && atrVals[i] != null ? (center[i] as number) + mult * (atrVals[i] as number) : null })));
  const lower = filterValidData(candles.map((c, i) => ({ time: c.time, value: center[i] != null && atrVals[i] != null ? (center[i] as number) - mult * (atrVals[i] as number) : null })));
  const mid = filterValidData(candles.map((c, i) => ({ time: c.time, value: center[i] ?? null })));
  return [
    { type: 'line', color: '#f59e0b', data: mid },
    { type: 'line', color: '#f59e0b', data: upper },
    { type: 'line', color: '#f59e0b', data: lower },
  ];
};

export const calcDonchian = (candles: Candle[], period = 20): IndicatorOutput[] => {
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (i >= period - 1) {
      upper[i] = Math.max(...candles.slice(i - period + 1, i + 1).map(c => c.high));
      lower[i] = Math.min(...candles.slice(i - period + 1, i + 1).map(c => c.low));
    }
  }
  const mid = filterValidData(candles.map((c, i) => ({ time: c.time, value: upper[i] != null && lower[i] != null ? ((upper[i] as number) + (lower[i] as number)) / 2 : null })));
  return [
    { type: 'line', color: '#22c55e', data: filterValidData(candles.map((c, i) => ({ time: c.time, value: upper[i] }))) },
    { type: 'line', color: '#ef4444', data: filterValidData(candles.map((c, i) => ({ time: c.time, value: lower[i] }))) },
    { type: 'line', color: '#9ca3af', data: mid },
  ];
};

export const calcSupertrend = (candles: Candle[], atrPeriod = 10, mult = 3): IndicatorOutput[] => {
  const atrVals = atr(candles, atrPeriod);
  const basicUpper: (number | null)[] = new Array(candles.length).fill(null);
  const basicLower: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (i >= atrPeriod - 1 && atrVals[i] != null) {
      const hl2 = (candles[i].high + candles[i].low) / 2;
      basicUpper[i] = hl2 + mult * (atrVals[i] as number);
      basicLower[i] = hl2 - mult * (atrVals[i] as number);
    }
  }
  const finalUpper: (number | null)[] = new Array(candles.length).fill(null);
  const finalLower: (number | null)[] = new Array(candles.length).fill(null);
  const trendUp: (number | null)[] = new Array(candles.length).fill(null);
  const trendDown: (number | null)[] = new Array(candles.length).fill(null);
  let up: number | null = null; let down: number | null = null; let inUp = true;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) continue;
    const bu = basicUpper[i];
    const bl = basicLower[i];
    finalUpper[i] = (bu != null && (up == null || bu < up)) ? bu : up;
    finalLower[i] = (bl != null && (down == null || bl > down)) ? bl : down;
    const prevClose = candles[i - 1].close;
    if (inUp) {
      if (finalLower[i] != null && prevClose < (finalLower[i] as number)) inUp = false;
    } else {
      if (finalUpper[i] != null && prevClose > (finalUpper[i] as number)) inUp = true;
    }
    if (inUp) {
      trendUp[i] = finalLower[i];
      down = finalUpper[i] ?? down;
    } else {
      trendDown[i] = finalUpper[i];
      up = finalLower[i] ?? up;
    }
    up = finalUpper[i] ?? up; down = finalLower[i] ?? down;
  }
  return [
    { type: 'line', color: '#22c55e', data: filterValidData(candles.map((c, i) => ({ time: c.time, value: trendUp[i] }))) },
    { type: 'line', color: '#ef4444', data: filterValidData(candles.map((c, i) => ({ time: c.time, value: trendDown[i] }))) },
  ];
};

export const calcPSARMarkers = (candles: Candle[], step = 0.02, maxStep = 0.2) => {
  if (candles.length === 0) return [] as any[];
  let psar = candles[0].low;
  let bull = true;
  let af = step;
  let ep = candles[0].high;
  const markers: any[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    psar = psar + af * (ep - psar);
    if (bull) {
      if (c.low < psar) { bull = false; psar = ep; ep = c.low; af = step; }
      else { if (c.high > ep) { ep = c.high; af = Math.min(maxStep, af + step); } }
    } else {
      if (c.high > psar) { bull = true; psar = ep; ep = c.high; af = step; }
      else { if (c.low < ep) { ep = c.low; af = Math.min(maxStep, af + step); } }
    }
    markers.push({ time: c.time, position: bull ? 'belowBar' : 'aboveBar', color: '#eab308', shape: 'circle', size: 0.5 } as any);
  }
  return markers;
};

export const calcZigZag = (candles: Candle[], deviationPct = 2): IndicatorOutput[] => {
  if (candles.length < 3) return [];
  
  const pivots: { i: number; price: number; type: 'high' | 'low' }[] = [];
  
  // Find initial direction
  let currentHigh = candles[0];
  let currentLow = candles[0];
  let highIndex = 0;
  let lowIndex = 0;
  
  // Find first significant pivot
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].high > currentHigh.high) {
      currentHigh = candles[i];
      highIndex = i;
    }
    if (candles[i].low < currentLow.low) {
      currentLow = candles[i];
      lowIndex = i;
    }
    
    // Check for significant move
    const upMove = ((currentHigh.high - currentLow.low) / currentLow.low) * 100;
    const downMove = ((currentHigh.high - currentLow.low) / currentHigh.high) * 100;
    
    if (upMove >= deviationPct && highIndex > lowIndex) {
      pivots.push({ i: lowIndex, price: currentLow.low, type: 'low' });
      pivots.push({ i: highIndex, price: currentHigh.high, type: 'high' });
      break;
    }
    if (downMove >= deviationPct && lowIndex > highIndex) {
      pivots.push({ i: highIndex, price: currentHigh.high, type: 'high' });
      pivots.push({ i: lowIndex, price: currentLow.low, type: 'low' });
      break;
    }
  }
  
  if (pivots.length === 0) return [];
  
  // Continue finding pivots
  let lastPivot = pivots[pivots.length - 1];
  let extremeIndex = lastPivot.i;
  let extremePrice = lastPivot.price;
  
  for (let i = lastPivot.i + 1; i < candles.length; i++) {
    if (lastPivot.type === 'high') {
      // Looking for next low
      if (candles[i].low < extremePrice) {
        extremePrice = candles[i].low;
        extremeIndex = i;
      }
      
      // Check if we have a significant move up from the extreme low
      const moveUp = ((candles[i].high - extremePrice) / extremePrice) * 100;
      if (moveUp >= deviationPct) {
        pivots.push({ i: extremeIndex, price: extremePrice, type: 'low' });
        lastPivot = pivots[pivots.length - 1];
        extremePrice = candles[i].high;
        extremeIndex = i;
      }
    } else {
      // Looking for next high
      if (candles[i].high > extremePrice) {
        extremePrice = candles[i].high;
        extremeIndex = i;
      }
      
      // Check if we have a significant move down from the extreme high
      const moveDown = ((extremePrice - candles[i].low) / extremePrice) * 100;
      if (moveDown >= deviationPct) {
        pivots.push({ i: extremeIndex, price: extremePrice, type: 'high' });
        lastPivot = pivots[pivots.length - 1];
        extremePrice = candles[i].low;
        extremeIndex = i;
      }
    }
  }
  
  // Add the last extreme if it's significant
  if (extremeIndex > lastPivot.i) {
    const lastType = lastPivot.type === 'high' ? 'low' : 'high';
    pivots.push({ i: extremeIndex, price: extremePrice, type: lastType });
  }
  
  if (pivots.length < 2) return [];
  
  // Create line data connecting the pivots
  const rawData = pivots.map(p => ({ time: candles[p.i].time, value: p.price }));
  
  // Remove duplicates and sort by time
  const uniqueData = rawData.reduce((acc, current) => {
    const existing = acc.find(item => item.time === current.time);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, [] as Array<{ time: number; value: number }>);
  
  const data = uniqueData.sort((a, b) => a.time - b.time);
  
  return [{ type: 'line', color: '#ff6b35', data }];
};

export const calcAlligator = (candles: Candle[], intervalSec: number): IndicatorOutput[] => {
  if (candles.length < 13) return [];
  
  const median = candles.map(c => (c.high + c.low) / 2);
  
  // Calculate the three lines with proper SMMA
  const jaw = smma(median, 13);    // Blue line (13-period SMMA)
  const teeth = smma(median, 8);   // Red line (8-period SMMA) 
  const lips = smma(median, 5);    // Green line (5-period SMMA)
  
  // Apply forward shifts for future displacement
  const jawShift = 8;    // Jaw shifts 8 periods forward
  const teethShift = 5;  // Teeth shifts 5 periods forward  
  const lipsShift = 3;   // Lips shifts 3 periods forward
  
  const shiftData = (arr: (number | null)[], shift: number) => {
    return candles.map((c, i) => ({
      time: c.time + (shift * intervalSec),
      value: arr[i] ?? null
    })).filter(item => item.value !== null) as Array<{ time: number; value: number }>;
  };
  
  return [
    { type: 'line', color: '#2563eb', data: shiftData(jaw, jawShift) },     // Blue Jaw
    { type: 'line', color: '#dc2626', data: shiftData(teeth, teethShift) }, // Red Teeth
    { type: 'line', color: '#16a34a', data: shiftData(lips, lipsShift) },   // Green Lips
  ];
};
