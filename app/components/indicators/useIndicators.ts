import { useCallback, useRef, useState } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { MutableRefObject } from 'react';
import { Candle, IndicatorKey, IndicatorOutput, SeriesEntry } from './types';
import {
  calcSMA,
  calcBollinger,
  calcEnvelopes,
  calcFractalsMarkers,
  calcIchimoku,
  calcKeltner,
  calcDonchian,
  calcSupertrend,
  calcPSARMarkers,
  calcZigZag,
  calcAlligator,
} from './calculators';

export function useIndicators(chartRef: MutableRefObject<IChartApi | null>, seriesRef: MutableRefObject<ISeriesApi<any> | null>) {
  const [active, setActive] = useState<IndicatorKey[]>([]);
  const seriesMap = useRef<Map<IndicatorKey, SeriesEntry>>(new Map());
  const markerMap = useRef<Map<IndicatorKey, any[]>>(new Map());

  const upsertSeries = useCallback((key: IndicatorKey, outputs: IndicatorOutput[]) => {
    const chart = chartRef.current; 
    if (!chart) return;
    
    let entry = seriesMap.current.get(key);
    if (!entry) {
      try {
        const series = outputs.map((o) => {
          if (o.type === 'line') {
            // Special styling for ZigZag
            if (key === 'zigzag') {
              return chart.addLineSeries({ color: o.color, lineWidth: 3, lineStyle: 0 } as any);
            }
            return chart.addLineSeries({ color: o.color, lineWidth: 2 } as any);
          }
          if (o.type === 'area') return chart.addAreaSeries({ lineColor: o.color, topColor: 'rgba(0,0,0,0)', bottomColor: 'rgba(0,0,0,0)' } as any);
          return chart.addLineSeries({ color: '#fff', lineWidth: 2 } as any);
        });
        entry = { key, series };
        seriesMap.current.set(key, entry);
      } catch (error) {
        console.error(`Error creating series for ${key}:`, error);
        return;
      }
    }
    
    entry.series.forEach((s, i) => { 
      if (outputs[i] && outputs[i].data.length > 0) {
        try {
          // Validate data before setting
          const validData = outputs[i].data.filter(d => 
            d.value !== null && 
            d.value !== undefined && 
            !isNaN(d.value) && 
            isFinite(d.value) &&
            d.time > 0
          );
          
          if (validData.length > 0) {
            s.setData(validData as any);
          }
        } catch (error) {
          console.error(`Error setting data for ${key} series ${i}:`, error);
        }
      }
    });
  }, [chartRef]);

  const setMarkers = useCallback((key: IndicatorKey, markers: any[] | null) => {
    // Temporarily disable markers to prevent crosshair errors
    return;
    
    // if (markers) markerMap.current.set(key, markers); else markerMap.current.delete(key);
    // const main = seriesRef.current; if (!main) return;
    // const all: any[] = []; markerMap.current.forEach(arr => all.push(...arr));
    // try { (main as any).setMarkers(all); } catch {}
  }, [seriesRef]);

  const clear = useCallback(() => {
    const chart = chartRef.current; if (!chart) return;
    seriesMap.current.forEach(({ series }) => { try { series.forEach(s => (chart as any).removeSeries(s)); } catch {} });
    seriesMap.current.clear();
    markerMap.current.clear();
    // Disable markers clearing to prevent crosshair errors
    // const main = seriesRef.current as any; if (main && (main.setMarkers)) { try { main.setMarkers([]); } catch {} }
    setActive([]);
  }, [chartRef, seriesRef]);

  const remove = useCallback((key: IndicatorKey) => {
    const chart = chartRef.current; if (!chart) return;
    const entry = seriesMap.current.get(key);
    if (entry) { try { entry.series.forEach(s => (chart as any).removeSeries(s)); } catch {} seriesMap.current.delete(key); }
    markerMap.current.delete(key);
    // Disable markers updating to prevent crosshair errors
    // const main = seriesRef.current as any; if (main && (main.setMarkers)) { const all: any[] = []; markerMap.current.forEach(arr => all.push(...arr)); try { main.setMarkers(all); } catch {} }
    setActive(prev => prev.filter(k => k !== key));
  }, [chartRef, seriesRef]);

  const update = useCallback((candles: Candle[], intervalSec: number) => {
    active.forEach((key) => {
      let outputs: IndicatorOutput[] = [];
      let markers: any[] | null = null;
      
      try {
        switch (key) {
          case 'sma': outputs = calcSMA(candles); break;
          case 'bb': outputs = calcBollinger(candles); break;
          case 'envelopes': outputs = calcEnvelopes(candles); break;
          case 'fractal': markers = calcFractalsMarkers(candles); break;
          case 'ichimoku': outputs = calcIchimoku(candles, intervalSec); break;
          case 'keltner': outputs = calcKeltner(candles); break;
          case 'donchian': outputs = calcDonchian(candles); break;
          case 'supertrend': outputs = calcSupertrend(candles); break;
          case 'psar': markers = calcPSARMarkers(candles); break;
          case 'zigzag': outputs = calcZigZag(candles); break;
          case 'alligator': outputs = calcAlligator(candles, intervalSec); break;
        }
        
        if (outputs.length) upsertSeries(key, outputs);
        if (markers) setMarkers(key, markers);
      } catch (error) {
        console.error(`Error calculating ${key}:`, error);
      }
    });
  }, [active, upsertSeries, setMarkers]);

  const add = useCallback((key: IndicatorKey, candles: Candle[], intervalSec: number) => {
    if (active.includes(key)) return;
    
    // compute and draw immediately for this key
    let outputs: IndicatorOutput[] = [];
    let markers: any[] | null = null;
    
    try {
      switch (key) {
        case 'sma': outputs = calcSMA(candles); break;
        case 'bb': outputs = calcBollinger(candles); break;
        case 'envelopes': outputs = calcEnvelopes(candles); break;
        case 'fractal': markers = calcFractalsMarkers(candles); break;
        case 'ichimoku': outputs = calcIchimoku(candles, intervalSec); break;
        case 'keltner': outputs = calcKeltner(candles); break;
        case 'donchian': outputs = calcDonchian(candles); break;
        case 'supertrend': outputs = calcSupertrend(candles); break;
        case 'psar': markers = calcPSARMarkers(candles); break;
        case 'zigzag': outputs = calcZigZag(candles); break;
        case 'alligator': outputs = calcAlligator(candles, intervalSec); break;
      }
      
      if (outputs.length) upsertSeries(key, outputs);
      setMarkers(key, markers);
      setActive(prev => [...prev, key]);
    } catch (error) {
      console.error(`Error adding ${key}:`, error);
    }
  }, [active, upsertSeries, setMarkers]);

  return { active, add, remove, clear, update };
}
