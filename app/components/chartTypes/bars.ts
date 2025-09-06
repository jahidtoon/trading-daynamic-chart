import { SeriesFactory } from './types';

export const createBarsSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.bars) return { series: cache.bars };
  const series = chart.addBarSeries({ upColor:'#0ECB81', downColor:'#F6465D', thinBars:false });
  series.setData(candles.map(c => ({ time:c.time as any, open:c.open, high:c.high, low:c.low, close:c.close })) as any);
  cache.bars = series;
  return { series };
};
