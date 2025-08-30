// utils/coingecko.ts
// CoinGecko API থেকে ডেটা ফেচ করার জন্য হেল্পার ফাংশন

import axios from 'axios';

// Use internal proxy to avoid CORS and reduce 429s
const BASE_URL = '/api';

export async function fetchMarketData(ids = 'bitcoin,ethereum', vs_currency = 'usd') {
  const url = `${BASE_URL}/markets`;
  const params = { vs_currency, ids };
  const response = await axios.get(url, { params });
  return response.data;
}
