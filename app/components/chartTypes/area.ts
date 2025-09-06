import { SeriesFactory } from './types';

export const createAreaSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.area) return { series: cache.area };
  const series = chart.addAreaSeries({ 
    lineColor:'#60a5fa',
    topColor:'rgba(96,165,250,0.25)', 
    bottomColor:'rgba(96,165,250,0.02)', 
    lineWidth:2 
  });
  series.setData(candles.map(c => ({ time:c.time as any, value:c.close })) as any);
  cache.area = series;
  return { series };
};
