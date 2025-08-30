// app/components/CandlestickChart.tsx
// QouteX-style candlestick + volume using lightweight-charts

'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

interface Candle {
  time: number; // unix timestamp (sec)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  symbol?: string; // e.g., BTCUSDT
}

export default function CandlestickChart({ symbol = 'BTCUSDT' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState(symbol);
  const [tf, setTf] = useState<'1h' | '4h' | '1d' | 'all'>('all');
  const [chartType, setChartType] = useState<'candles' | 'bars' | 'line' | 'area' | 'baseline' | 'heikin' | 'hollow'>('candles');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const tfRef = useRef<'1h' | '4h' | '1d' | 'all'>('all');
  const lastCandlesRef = useRef<Candle[]>([]);
  // Keep last candle time to drive zoom window
  const lastTimeRef = useRef<number | null>(null);
  // Track whether we should maintain auto zoom or honor user's manual zoom
  const rangeModeRef = useRef<'auto' | 'manual'>('auto');
  const isProgrammaticRangeChange = useRef(false);

  // Popular Binance pairs
  const popularPairs = useRef<string[]>([
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','TRXUSDT',
    'MATICUSDT','DOTUSDT','LTCUSDT','LINKUSDT','SHIBUSDT','AVAXUSDT','OPUSDT','ARBUSDT'
  ]);

  // Fetch candles with resolution based on current timeframe for professional density
  const fetchCandles = async () => {
    let interval: '1m' | '5m' | '15m' = '15m';
    let limit = 96 * 15; // default: 15 days of 15m bars
    switch (tfRef.current) {
      case '1h':
        interval = '1m';
        limit = 120; // ~2 hours buffer
        break;
      case '4h':
        interval = '5m';
        limit = 300; // 4h + buffer
        break;
      case '1d':
        interval = '15m';
        limit = 120; // ~1 day + buffer
        break;
      case 'all':
      default:
        interval = '15m';
        limit = 96 * 15; // 15 days
    }
    const res = await fetch(`/api/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
    const json = await res.json();
    return json.candles as Candle[];
  };

  const loadCandles = async () => {
    setLoading(true);
    const candles = await fetchCandles();
    lastCandlesRef.current = candles;
    if (!seriesRef.current) return;
    applySeriesDataForType(chartType);
    // Update last time reference and fit to all (15 days) or apply zoom
    lastTimeRef.current = candles.length ? candles[candles.length - 1].time : null;
    if (tfRef.current === 'all' || !lastTimeRef.current) {
      chartRef.current?.timeScale().fitContent();
    } else {
      applyZoomToTf(tfRef.current);
    }
    setLoading(false);
  };

  const applyZoomToTf = (next: '1h' | '4h' | '1d' | 'all') => {
    const chart = chartRef.current;
    const last = lastTimeRef.current;
    if (!chart || !last) return;
    if (next === 'all') {
      isProgrammaticRangeChange.current = true;
      chart.timeScale().fitContent();
      // release flag after microtask
      setTimeout(() => { isProgrammaticRangeChange.current = false; }, 0);
      return;
    }
  // Exact presets: 1H, 4H, and 1D
  const durSec = next === '1h' ? 3600 : next === '4h' ? 4 * 3600 : 24 * 3600;
  const from = last - durSec;
    isProgrammaticRangeChange.current = true;
    chart.timeScale().setVisibleRange({ from: from as unknown as Time, to: last as unknown as Time });
    setTimeout(() => { isProgrammaticRangeChange.current = false; }, 0);
  };

  // Timeframe control
  const handleSetTf = (next: '1h' | '4h' | '1d' | 'all') => {
    if (tfRef.current === next) return;
    setTf(next);
    tfRef.current = next;
    rangeModeRef.current = 'auto';
    loadCandles();
  };

  // Pair control
  const handleSetPair = (next: string) => {
    if (!next || next === pair) return;
    setPair(next);
    rangeModeRef.current = 'auto';
    loadCandles();
  };

  // Convert standard candles to Heikin Ashi candles
  const toHeikinAshi = (candles: Candle[]): Candle[] => {
    if (!candles.length) return [];
    const result: Candle[] = [];
    let prevHAOpen = (candles[0].open + candles[0].close) / 2;
    let prevHAClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const haClose = (c.open + c.high + c.low + c.close) / 4;
      const haOpen = i === 0 ? prevHAOpen : (prevHAOpen + prevHAClose) / 2;
      const haHigh = Math.max(c.high, haOpen, haClose);
      const haLow = Math.min(c.low, haOpen, haClose);
      result.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: c.volume });
      prevHAOpen = haOpen;
      prevHAClose = haClose;
    }
    return result;
  };

  // Build series for current chart type and set data
  const rebuildSeries = (type: typeof chartType) => {
    if (!chartRef.current) return;
    // remove old series if exists
    if (seriesRef.current) {
      try { /* @ts-ignore */ chartRef.current.removeSeries(seriesRef.current); } catch {}
      seriesRef.current = null as any;
    }
    const chart = chartRef.current;
    switch (type) {
      case 'bars':
        seriesRef.current = chart.addBarSeries({
          upColor: '#0ECB81', downColor: '#F6465D', thinBars: false,
          priceLineVisible: true,
        }) as any;
        break;
      case 'line':
        seriesRef.current = chart.addLineSeries({ color: '#4ade80', lineWidth: 2 }) as any;
        break;
      case 'area':
        seriesRef.current = chart.addAreaSeries({
          lineColor: '#60a5fa', topColor: 'rgba(96,165,250,0.25)', bottomColor: 'rgba(96,165,250,0.02)', lineWidth: 2,
        }) as any;
        break;
      case 'baseline': {
        const basePrice = lastCandlesRef.current.length ? lastCandlesRef.current[lastCandlesRef.current.length - 1].close : 0;
        seriesRef.current = chart.addBaselineSeries({
          baseValue: { type: 'price', price: basePrice },
          topLineColor: '#22c55e', topFillColor1: 'rgba(34,197,94,0.25)', topFillColor2: 'rgba(34,197,94,0.02)',
          bottomLineColor: '#ef4444', bottomFillColor1: 'rgba(239,68,68,0.25)', bottomFillColor2: 'rgba(239,68,68,0.02)',
          lineWidth: 2,
        }) as any;
        break;
      }
      case 'hollow':
        seriesRef.current = chart.addCandlestickSeries({
          upColor: 'rgba(0,0,0,0)', borderUpColor: '#0ECB81', wickUpColor: '#0ECB81',
          downColor: '#F6465D', borderDownColor: '#F6465D', wickDownColor: '#F6465D',
        }) as any;
        break;
      case 'heikin':
      case 'candles':
      default:
        seriesRef.current = chart.addCandlestickSeries({
          upColor: '#0ECB81', borderUpColor: '#0ECB81', wickUpColor: '#0ECB81',
          downColor: '#F6465D', borderDownColor: '#F6465D', wickDownColor: '#F6465D',
        }) as any;
        break;
    }
    applySeriesDataForType(type);
  };

  const applySeriesDataForType = (type: typeof chartType) => {
    if (!seriesRef.current) return;
    const raw = lastCandlesRef.current;
    let source: Candle[] = raw;
    if (type === 'heikin') source = toHeikinAshi(raw);
    if (type === 'candles' || type === 'hollow' || type === 'bars') {
      const ohlc = source.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }));
      seriesRef.current.setData(ohlc as any);
    } else if (type === 'line' || type === 'area' || type === 'baseline') {
      const line = source.map(c => ({ time: c.time as any, value: c.close }));
      seriesRef.current.setData(line as any);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

  const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#10131a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#222' },
        horzLines: { color: '#222' },
      },
      rightPriceScale: { borderColor: '#333' },
  timeScale: { borderColor: '#333', timeVisible: true, secondsVisible: false, rightOffset: 12 },
      autoSize: true,
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

  // initial series
  rebuildSeries(chartType);

    const handleResize = () => chart.applyOptions({ autoSize: true });
    window.addEventListener('resize', handleResize);

    // Detect user-driven zoom/pan and switch to manual mode
    const unsub = chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      if (isProgrammaticRangeChange.current) return;
      rangeModeRef.current = 'manual';
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      // library uses unsubscribe with same function; here we just remove chart which clears subs
      chart.remove();
      chartRef.current = null;
  seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCandles().then((candles) => {
  if (!seriesRef.current) return;
      // Cast to expected types to satisfy TS for different lib versions
  lastCandlesRef.current = candles;
  applySeriesDataForType(chartType);
      lastTimeRef.current = candles.length ? candles[candles.length - 1].time : null;
      if (rangeModeRef.current === 'auto') {
        if (tfRef.current === 'all' || !lastTimeRef.current) {
          isProgrammaticRangeChange.current = true;
          chartRef.current?.timeScale().fitContent();
          setTimeout(() => { isProgrammaticRangeChange.current = false; }, 0);
        } else {
          applyZoomToTf(tfRef.current);
        }
      }
      setLoading(false);
    });
    // live polling every 10s (with in-flight guard) to avoid heavy loads for 15d window
    const fetchingRef = { current: false } as { current: boolean };
    const id = setInterval(() => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      fetchCandles()
        .then((candles) => {
          if (!seriesRef.current) return;
          lastCandlesRef.current = candles;
          applySeriesDataForType(chartType);
          lastTimeRef.current = candles.length ? candles[candles.length - 1].time : null;
          if (rangeModeRef.current === 'auto') {
            if (tfRef.current === 'all' || !lastTimeRef.current) {
              isProgrammaticRangeChange.current = true;
              chartRef.current?.timeScale().fitContent();
              setTimeout(() => { isProgrammaticRangeChange.current = false; }, 0);
            } else {
              applyZoomToTf(tfRef.current);
            }
          }
        })
        .finally(() => { fetchingRef.current = false; });
    }, 10000);

    return () => clearInterval(id);
  }, [pair]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, background: '#10131a', color: '#fff' }}>
      {/* Top-left timeframe selector */}
      <div
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 10,
          background: '#0f1220d9', border: '1px solid #243042', borderRadius: 10, padding: '6px 8px',
          display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 6px 20px #0006'
        }}
      >
        {(['1h','4h','1d','all'] as const).map(iv => {
          const labelMap: Record<string,string> = { '1h':'1H','4h':'4H','1d':'1D','all':'15D' };
          const active = tf === iv;
          return (
            <button key={iv}
              onClick={() => handleSetTf(iv)}
              style={{
                background: active? '#1f2937':'#111827', color:'#e5e7eb', border:'1px solid #374151',
                padding:'6px 10px', borderRadius:6, cursor:'pointer'
              }}
            >{labelMap[iv]}</button>
          );
        })}
        {/* Chart type selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowTypeMenu(s => !s)}
            style={{ background:'#111827', color:'#e5e7eb', border:'1px solid #374151', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}
          >Type ▾</button>
          {showTypeMenu && (
            <div style={{ position:'absolute', top: '110%', left: 0, background:'#0f1220', border:'1px solid #243042', borderRadius:8, padding:6, display:'grid', gap:4, zIndex:20 }}>
              {[
                {key:'candles', label:'Candles'},
                {key:'hollow', label:'Hollow Candles'},
                {key:'bars', label:'Bars'},
                {key:'line', label:'Line'},
                {key:'area', label:'Area'},
                {key:'baseline', label:'Baseline'},
                {key:'heikin', label:'Heikin Ashi'},
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => { setChartType(opt.key as any); setShowTypeMenu(false); rebuildSeries(opt.key as any); }}
                  style={{ textAlign:'left', background: chartType===opt.key?'#1f2937':'#111827', color:'#e5e7eb', border:'1px solid #374151', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}
                >{opt.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top toolbar for currency selection */}
      <div
        style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          background: '#0f1220d9', border: '1px solid #243042', borderRadius: 10, padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 20px #0006'
        }}
      >
        <span style={{ color: '#9ca3af', fontSize: 12 }}>Symbol</span>
        <select
          value={pair}
          onChange={(e) => handleSetPair(e.target.value)}
          style={{
            background: '#111827', color: '#e5e7eb', border: '1px solid #374151',
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer', minWidth: 140
          }}
        >
          {popularPairs.current.map((p) => (
            <option key={p} value={p}>{p.replace('USDT','/USDT')}</option>
          ))}
        </select>
        {loading && <span style={{ fontSize: 12, color: '#aaa' }}>লোড হচ্ছে…</span>}
      </div>

      <div ref={containerRef} style={{ height: '100vh', width: '100vw' }} />
    </div>
  );
}
