// app/api/markets/route.ts
// Server-side proxy to fetch CoinGecko markets (avoids CORS in browser)

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ids = url.searchParams.get('ids') || 'bitcoin,ethereum';
    const vs_currency = url.searchParams.get('vs_currency') || 'usd';
    const per_page = url.searchParams.get('per_page') || '250';

    const cgUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vs_currency)}&ids=${encodeURIComponent(ids)}&per_page=${encodeURIComponent(per_page)}`;

    const res = await fetch(cgUrl, {
      // Small revalidate window to reduce 429, adjust if needed
      next: { revalidate: 30 },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'tredingviewchart-app/1.0 (education-demo)'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: `CoinGecko error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
