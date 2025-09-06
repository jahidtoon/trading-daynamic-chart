import { SeriesFactory } from './types';

// Simple heikin ashi conversion (duplicated for modular isolation)
function toHeikin(candles: any[]) {
  if (!candles.length) return [];
  const result: any[] = [];
  let prevHAOpen = (candles[0].open + candles[0].close) / 2;
  let prevHAClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;
  for (let i=0;i<candles.length;i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? prevHAOpen : (prevHAOpen + prevHAClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    result.push({ time:c.time, open:haOpen, high:haHigh, low:haLow, close:haClose, volume:c.volume });
    prevHAOpen = haOpen; prevHAClose = haClose;
  }
  return result;
}

export const createHeikinSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.heikin) return { series: cache.heikin };
  const ha = toHeikin(candles);
  const series = chart.addCandlestickSeries({
    upColor:'#0ECB81', borderUpColor:'#0ECB81', wickUpColor:'#0ECB81',
    downColor:'#F6465D', borderDownColor:'#F6465D', wickDownColor:'#F6465D'
  });
  series.setData(ha.map(c => ({ time:c.time as any, open:c.open, high:c.high, low:c.low, close:c.close })) as any);
  cache.heikin = series;
  return { series };
};
