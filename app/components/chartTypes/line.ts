import { SeriesFactory } from './types';

export const createLineSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.line) return { series: cache.line };
  const series = chart.addLineSeries({ color:'#4ade80', lineWidth:2 });
  series.setData(candles.map(c => ({ time:c.time as any, value:c.close })) as any);
  cache.line = series;
  return { series };
};
