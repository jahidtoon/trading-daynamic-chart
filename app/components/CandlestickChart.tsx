// app/components/CandlestickChart.tsx
// QouteX-style candlestick + volume using lightweight-charts

'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { ChartVisualType, Candle as CandleType } from './chartTypes/types';
import { createCandlesSeries } from './chartTypes/candles';
import { createBarsSeries } from './chartTypes/bars';
import { createLineSeries } from './chartTypes/line';
import { createAreaSeries } from './chartTypes/area';
import { createBaselineSeries } from './chartTypes/baseline';
import { createHollowSeries } from './chartTypes/hollow';
import { createHeikinSeries } from './chartTypes/heikin';
import IndicatorsPanel from './IndicatorsPanel';
import { IndicatorKey } from './indicators/types';
import { useIndicators } from './indicators/useIndicators';

interface Candle extends CandleType {}

interface Props {
  symbol?: string; // e.g., BTCUSDT
}

export default function CandlestickChart({ symbol = 'BTCUSDT' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  // Cache created series per type to avoid removing/adding flicker
  const seriesCacheRef = useRef<Record<string, ISeriesApi<any>>>({});
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingType, setIsChangingType] = useState(false); // New state for type changing
  const [pair, setPair] = useState(symbol);
  const [tf, setTf] = useState<'1h' | '4h' | '1d' | 'all'>('all');
  const [chartType, setChartType] = useState<ChartVisualType>('candles');
  // Ref to always-current chart type so background intervals don't use stale closure
  const chartTypeRef = useRef<ChartVisualType>('candles');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true); // Phase 1: Auto-scroll control
  const autoScrollRef = useRef(true); // Immediate reference for live updates
  
  const tfRef = useRef<'1h' | '4h' | '1d' | 'all'>('all');
  const lastCandlesRef = useRef<Candle[]>([]);
  // Keep last candle time to drive zoom window
  const lastTimeRef = useRef<number | null>(null);
  // Track whether we should maintain auto zoom or honor user's manual zoom
  const rangeModeRef = useRef<'auto' | 'manual'>('auto');
  const isProgrammaticRangeChange = useRef(false);
  
  // Indicator states
  const [showIndicators, setShowIndicators] = useState(false);
  const [showVolume, setShowVolume] = useState(true); // Volume visibility control
  const { active, add, remove, clear, update } = useIndicators(chartRef, seriesRef);

  // Popular Binance pairs
  const popularPairs = useRef<string[]>([
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','TRXUSDT',
    'MATICUSDT','DOTUSDT','LTCUSDT','LINKUSDT','SHIBUSDT','AVAXUSDT','OPUSDT','ARBUSDT'
  ]);

  // Fetch candles with resolution based on current timeframe for professional density
  const fetchCandles = async () => {
    let interval: '1m' | '5m' | '15m' = '15m';
    let limit = 1000; // Limit to 1000 candles for performance (Phase 1 optimization)
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
    if (!seriesRef.current) {
      activateSeries(chartTypeRef.current);
    } else {
      applySeriesDataForType(chartTypeRef.current);
    }
    lastTimeRef.current = candles.length ? candles[candles.length - 1].time : null;
    if (autoScroll) {
      if (tfRef.current === 'all' || !lastTimeRef.current) {
        chartRef.current?.timeScale().fitContent();
      } else {
        applyZoomToTf(tfRef.current);
      }
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
    // Don't reset range mode on timeframe change - preserve user's scroll preference
    // rangeModeRef.current = 'auto';  // Commented out to preserve user preference
    loadCandles();
  };

    // Pair control
  const handleSetPair = (next: string) => {
    if (!next || next === pair) return;
    setPair(next);
    // Don't reset user interaction flags on pair change - preserve user's scroll preference
    // rangeModeRef.current = 'auto';  // Commented out to preserve user preference
    // userInteractedRef.current = false;  // Commented out to preserve user preference
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

  // Smooth chart type change handler
  const handleChartTypeChange = (newType: typeof chartType) => {
    if (newType === chartType || isChangingType) return;
    
    // Set changing state to prevent multiple clicks
    setIsChangingType(true);
    
    // Update state and rebuild series immediately
    setChartType(newType);
  chartTypeRef.current = newType; // keep ref in sync for interval updates
    setShowTypeMenu(false);
    activateSeries(newType); // use cached series switching
    
    // Reset changing state
    setTimeout(() => setIsChangingType(false), 50);
  };

  const activateSeries = (type: ChartVisualType) => {
    if (!chartRef.current || !lastCandlesRef.current.length) return;
    const chart = chartRef.current;
    const raw = lastCandlesRef.current;

    // Hide existing
    Object.values(seriesCacheRef.current).forEach(s => { try { (s as any).applyOptions({ visible:false }); } catch {} });

    // Create via factories
    if (!seriesCacheRef.current[type]) {
      const ctx = { chart, candles: raw, cache: seriesCacheRef.current };
      switch (type) {
        case 'bars':
          seriesCacheRef.current[type] = createBarsSeries(ctx).series; break;
        case 'line':
          seriesCacheRef.current[type] = createLineSeries(ctx).series; break;
        case 'area':
          seriesCacheRef.current[type] = createAreaSeries(ctx).series; break;
        case 'baseline':
          seriesCacheRef.current[type] = createBaselineSeries(ctx).series; break;
        case 'hollow':
          seriesCacheRef.current[type] = createHollowSeries(ctx).series; break;
        case 'heikin':
          seriesCacheRef.current[type] = createHeikinSeries(ctx).series; break;
        case 'candles':
        default:
          seriesCacheRef.current[type] = createCandlesSeries(ctx).series; break;
      }
    }
    seriesRef.current = seriesCacheRef.current[type];
    try { (seriesRef.current as any).applyOptions({ visible:true }); } catch {}

    // Volume update stays same
    if (volumeSeriesRef.current && showVolume) {
      try { volumeSeriesRef.current.setData(raw.map(c => ({ time:c.time as any, value:c.volume, color:c.close>=c.open?'#26a69a':'#ef5350' })) as any); } catch {}
    }

    if (tfRef.current === 'all') chart.timeScale().fitContent(); else applyZoomToTf(tfRef.current);
  };

  const applySeriesDataForType = (type: ChartVisualType) => {
    if (!seriesRef.current || !lastCandlesRef.current.length) {
      console.log('⚠️ Cannot apply series data: missing series or data');
      return;
    }
    
    const raw = lastCandlesRef.current;
    let source: Candle[] = raw;
    if (type === 'heikin') source = toHeikinAshi(raw);
    
    console.log(`📊 Applying ${type} data with ${source.length} candles`);
    
    // Apply volume data (Phase 1 - Professional Feature)
    if (volumeSeriesRef.current && source.length && showVolume) {
      const volumeData = source.map(c => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? '#26a69a' : '#ef5350'
      }));
      volumeSeriesRef.current.setData(volumeData as any);
    }

    // Apply main series data based on chart type
    try {
      if (type === 'candles' || type === 'hollow' || type === 'bars' || type === 'heikin') {
        const ohlc = source.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }));
        seriesRef.current.setData(ohlc as any);
        console.log(`✅ Applied OHLC data for ${type}`);
      } else if (type === 'line' || type === 'area' || type === 'baseline') {
        const line = source.map(c => ({ time: c.time as any, value: c.close }));
        seriesRef.current.setData(line as any);
        console.log(`✅ Applied line data for ${type}`);
      }
    } catch (error) {
      console.error('❌ Error applying series data:', error);
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

    // Create volume series (Phase 1 - Professional Feature) with proper separation
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;
    
    // Configure volume price scale to be at bottom 20% of chart
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

  // Don't create series here - wait for data to load first

    const handleResize = () => chart.applyOptions({ autoSize: true });
    window.addEventListener('resize', handleResize);

    // Detect user-driven zoom/pan and switch to manual mode
    const unsub = chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      if (isProgrammaticRangeChange.current) return;
      console.log('🔄 User manual scroll detected - switching to manual mode');
      rangeModeRef.current = 'manual';
      autoScrollRef.current = false; // Immediate update for live updates
      setAutoScroll(false); // Phase 1: Auto-disable auto-scroll on manual interaction
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      // library uses unsubscribe with same function; here we just remove chart which clears subs
      chart.remove();
      chartRef.current = null;
  seriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCandles().then((candles) => {
      if (!chartRef.current) return;
      
      // Store candles data
      lastCandlesRef.current = candles;
      lastTimeRef.current = candles.length ? candles[candles.length - 1].time : null;
      
      // Create series with data if it doesn't exist
      if (!seriesRef.current) {
  activateSeries(chartTypeRef.current);
      } else {
  applySeriesDataForType(chartTypeRef.current);
      }
      
      // Update indicators with new data
      if (candles.length > 0) {
        const intervalSec = tfRef.current === '1h' ? 60 : tfRef.current === '4h' ? 240 : tfRef.current === '1d' ? 1440 : 900;
        update(candles, intervalSec);
      }
      
      if (autoScroll) {
        // Only auto-scroll if the auto-scroll button is ON
        console.log('📊 Pair changed - auto-scroll is ON, applying zoom');
        autoScrollRef.current = true; // Sync the ref
        if (tfRef.current === 'all' || !lastTimeRef.current) {
          isProgrammaticRangeChange.current = true;
          chartRef.current?.timeScale().fitContent();
          setTimeout(() => { isProgrammaticRangeChange.current = false; }, 0);
        } else {
          applyZoomToTf(tfRef.current);
        }
      } else {
        console.log('📊 Pair changed - auto-scroll is OFF, preserving position');
        autoScrollRef.current = false; // Sync the ref
      }
      // If autoScroll is false, preserve current chart position
      setLoading(false);
    });
    // Phase 1 Fix: More frequent updates with better performance (1 second for live data)
    const fetchingRef = { current: false } as { current: boolean };
    const id = setInterval(() => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      fetchCandles()
        .then((candles) => {
          if (!seriesRef.current) return;
          
          lastCandlesRef.current = candles;
          // Use ref so latest selected type determines data shape (fixes line series blank issue)
          applySeriesDataForType(chartTypeRef.current);
          lastTimeRef.current = candles.length ? candles[candles.length - 1].time : null;
          
          // Update indicators with new live data
          if (candles.length > 0) {
            const intervalSec = tfRef.current === '1h' ? 60 : tfRef.current === '4h' ? 240 : tfRef.current === '1d' ? 1440 : 900;
            update(candles, intervalSec);
          }
          
          // Phase 1 Fix: Apply auto-scroll or restore manual position
          if (!autoScrollRef.current) {
            // Auto-scroll is disabled (user has manually scrolled) - preserve current view
            console.log('🚫 Auto-scroll disabled - preserving current view');
            // Do nothing - preserve current view
          } else {
            // Auto-scroll is enabled - follow the latest data
            console.log('📈 Auto-scrolling to latest data');
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
    }, 1000); // Phase 1: Faster updates for live trading

    return () => clearInterval(id);
  }, [pair]);

  // Volume visibility control
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({
        visible: showVolume
      });
    }
    
    // Also control the volume price scale visibility
    if (chartRef.current) {
      chartRef.current.priceScale('volume').applyOptions({
        visible: showVolume
      });
    }
  }, [showVolume]);

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
                  onClick={() => handleChartTypeChange(opt.key as any)}
                  disabled={isChangingType}
                  style={{ 
                    textAlign:'left', 
                    background: chartType===opt.key?'#1f2937':'#111827', 
                    color: isChangingType ? '#666' : '#e5e7eb', 
                    border:'1px solid #374151', 
                    padding:'6px 10px', 
                    borderRadius:6, 
                    cursor: isChangingType ? 'wait' : 'pointer',
                    opacity: isChangingType ? 0.6 : 1
                  }}
                >{opt.label}</button>
              ))}
            </div>
          )}
        </div>
        
        {/* Auto-scroll toggle (Phase 1 Professional Feature) */}
        <button
          onClick={() => {
            const newAutoScroll = !autoScroll;
            setAutoScroll(newAutoScroll);
            autoScrollRef.current = newAutoScroll; // Immediate sync
            if (newAutoScroll) {
              console.log('🔄 Auto-scroll manually enabled');
              rangeModeRef.current = 'auto';
              // Immediately apply zoom when enabling auto-scroll
              if (tfRef.current === 'all') {
                chartRef.current?.timeScale().fitContent();
              } else {
                applyZoomToTf(tfRef.current);
              }
            } else {
              console.log('🔄 Auto-scroll manually disabled');
            }
          }}
          style={{
            background: autoScroll ? '#059669' : '#111827',
            color: '#e5e7eb',
            border: '1px solid #374151',
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          📺 {autoScroll ? 'Auto' : 'Manual'}
        </button>
        
        {/* Indicators button (Phase 1 Professional Feature) */}
        <button
          onClick={() => setShowIndicators(s => !s)}
          style={{
            background: showIndicators ? '#1f2937' : '#111827',
            color: '#e5e7eb',
            border: '1px solid #374151',
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          📊 Indicators
        </button>
        
        {/* Volume toggle button (Phase 1 Professional Feature) */}
        <button
          onClick={() => setShowVolume(s => !s)}
          style={{
            background: showVolume ? '#1f2937' : '#111827',
            color: '#e5e7eb',
            border: '1px solid #374151',
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          � Volume
        </button>
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
        
        {/* Phase 2: Market Status Indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4,
          color: '#10b981',
          fontSize: 12
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: loading ? '#f59e0b' : '#10b981',
            animation: loading ? 'pulse 2s infinite' : 'none'
          }} />
          {loading ? 'Loading...' : 'Live'}
        </div>
        
        {loading && <span style={{ fontSize: 12, color: '#aaa' }}>লোড হচ্ছে…</span>}
      </div>

      {/* Indicators Panel (Phase 1 Professional Feature) */}
      {showIndicators && (
        <IndicatorsPanel
          active={active}
          onAdd={(key) => {
            if (lastCandlesRef.current.length > 0) {
              const intervalSec = tfRef.current === '1h' ? 60 : tfRef.current === '4h' ? 240 : tfRef.current === '1d' ? 1440 : 900; // 15m default
              add(key, lastCandlesRef.current, intervalSec);
            }
          }}
          onRemove={remove}
          onClear={clear}
          onClose={() => setShowIndicators(false)}
        />
      )}

      <div ref={containerRef} style={{ height: '100vh', width: '100vw' }} />
    </div>
  );
}
