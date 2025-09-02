"use client";
import React from 'react';
import { IndicatorKey } from './indicators/types';

interface Props {
  active: IndicatorKey[];
  onAdd: (key: IndicatorKey) => void;
  onRemove: (key: IndicatorKey) => void;
  onClear: () => void;
  onClose: () => void;
}

const items: { key: IndicatorKey; label: string }[] = [
  { key: 'alligator', label: 'Alligator' },
  { key: 'bb', label: 'Bollinger Bands' },
  { key: 'envelopes', label: 'Envelopes' },
  { key: 'fractal', label: 'Fractal' },
  { key: 'ichimoku', label: 'Ichimoku Cloud' },
  { key: 'keltner', label: 'Keltner channel' },
  { key: 'donchian', label: 'Donchian channel' },
  { key: 'supertrend', label: 'Supertrend' },
  { key: 'sma', label: 'Moving Average' },
  { key: 'psar', label: 'Parabolic SAR' },
  { key: 'zigzag', label: 'Zig Zag' },
];

export default function IndicatorsPanel({ active, onAdd, onRemove, onClear, onClose }: Props) {
  return (
    <div style={{ position:'fixed', left:12, top:60, bottom:60, width:280, background:'#0f1220f2', border:'1px solid #243042', borderRadius:12, zIndex: 12, display:'flex', flexDirection:'column', boxShadow:'0 12px 30px #0008' }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid #243042', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:600 }}>Indicators</div>
        <button onClick={onClose} style={{ background:'transparent', color:'#9ca3af', border:'none', cursor:'pointer' }}>✕</button>
      </div>
      <div style={{ padding:12, overflowY:'auto' }}>
        <div style={{ color:'#9ca3af', fontSize:12, marginBottom:8 }}>TREND INDICATORS</div>
        {items.map(item => {
          const isActive = active.includes(item.key);
          return (
            <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8 }}>
              <div>{item.label}</div>
              {isActive ? (
                <button onClick={() => onRemove(item.key)} style={{ background:'#1f2937', color:'#e5e7eb', border:'1px solid #374151', padding:'4px 8px', borderRadius:6, cursor:'pointer' }}>Remove</button>
              ) : (
                <button onClick={() => onAdd(item.key)} style={{ background:'#111827', color:'#e5e7eb', border:'1px solid #374151', padding:'4px 8px', borderRadius:6, cursor:'pointer' }}>Add</button>
              )}
            </div>
          );
        })}
        {active.length > 0 && (
          <div style={{ marginTop:12 }}>
            <button onClick={onClear} style={{ width:'100%', background:'#7f1d1d', color:'#fff', border:'1px solid #b91c1c', padding:'6px 10px', borderRadius:8, cursor:'pointer' }}>Delete all</button>
          </div>
        )}
      </div>
    </div>
  );
}
