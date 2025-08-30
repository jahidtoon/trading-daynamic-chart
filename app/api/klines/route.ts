// app/api/klines/route.ts
// Proxy endpoint to fetch candlestick (kline) data from Binance and return in a format
// suitable for lightweight-charts (time, open, high, low, close, volume)

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
    const interval = url.searchParams.get('interval') || '1m';
    const limit = url.searchParams.get('limit') || '500';

    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`;

  const res = await fetch(binanceUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Binance' }, { status: 502 });
    }

    const klines = (await res.json()) as any[];
    const candles = klines.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    return NextResponse.json({ symbol, interval, candles });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
