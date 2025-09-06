import { SeriesFactory } from './types';

export const createCandlesSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.candles) return { series: cache.candles };
  const series = chart.addCandlestickSeries({
    upColor: '#0ECB81', borderUpColor: '#0ECB81', wickUpColor: '#0ECB81',
    downColor: '#F6465D', borderDownColor: '#F6465D', wickDownColor: '#F6465D'
  });
  series.setData(candles.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })) as any);
  cache.candles = series;
  return { series };
};
