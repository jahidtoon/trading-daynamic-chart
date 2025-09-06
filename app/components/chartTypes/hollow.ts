import { SeriesFactory } from './types';

export const createHollowSeries: SeriesFactory = ({ chart, candles, cache }) => {
  if (cache.hollow) return { series: cache.hollow };
  const series = chart.addCandlestickSeries({
    upColor:'rgba(0,0,0,0)', borderUpColor:'#0ECB81', wickUpColor:'#0ECB81',
    downColor:'#F6465D', borderDownColor:'#F6465D', wickDownColor:'#F6465D'
  });
  series.setData(candles.map(c => ({ time:c.time as any, open:c.open, high:c.high, low:c.low, close:c.close })) as any);
  cache.hollow = series;
  return { series };
};
