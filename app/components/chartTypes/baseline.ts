import { SeriesFactory } from './types';

export const createBaselineSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.baseline) return { series: cache.baseline };
  const base = candles.length ? candles[candles.length-1].close : 0;
  const series = chart.addBaselineSeries({
    baseValue:{ type:'price', price:base },
    topLineColor:'#22c55e', topFillColor1:'rgba(34,197,94,0.25)', topFillColor2:'rgba(34,197,94,0.02)',
    bottomLineColor:'#ef4444', bottomFillColor1:'rgba(239,68,68,0.25)', bottomFillColor2:'rgba(239,68,68,0.02)',
    lineWidth:2,
  });
  series.setData(candles.map(c => ({ time:c.time as any, value:c.close })) as any);
  cache.baseline = series;
  return { series };
};
