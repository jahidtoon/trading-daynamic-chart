// app/components/CryptoMarketChart.tsx
// CoinGecko API থেকে ডেটা নিয়ে recharts দিয়ে চার্ট দেখানোর কম্পোনেন্ট

'use client';
import React, { useEffect, useState } from 'react';
import { fetchMarketData } from '../utils/coingecko';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

export default function CryptoMarketChart() {
  const [data, setData] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoins, setSelectedCoins] = useState('bitcoin,ethereum,binancecoin');

  const fetchData = async () => {
    try {
      const res = await fetchMarketData(selectedCoins);
      setData(res);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // লাইভ আপডেট: প্রতি ১০ সেকেন্ডে ডেটা রিফ্রেশ
    const interval = setInterval(fetchData, 10000);
    
    return () => clearInterval(interval);
  }, [selectedCoins]);

  const coinOptions = [
    { value: 'bitcoin,ethereum,binancecoin', label: 'BTC, ETH, BNB' },
    { value: 'bitcoin,ethereum,cardano', label: 'BTC, ETH, ADA' },
    { value: 'bitcoin,ethereum,solana', label: 'BTC, ETH, SOL' },
  ];

  if (loading) return <div style={{color:'#fff',background:'#222',padding:'1rem',borderRadius:'8px'}}>লোড হচ্ছে...</div>;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 800,
        margin: '2rem auto',
        background: '#181c24',
        borderRadius: '12px',
        boxShadow: '0 2px 16px #0002',
        padding: '1.5rem',
        color: '#fff',
      }}
    >
      <h2 style={{textAlign:'center',marginBottom:'1rem',color:'#00e396'}}>ক্রিপ্টো মার্কেট (CoinGecko API)</h2>
      
      {/* কয়েন সিলেক্টর */}
      <div style={{marginBottom:'1.5rem',textAlign:'center'}}>
        <label style={{marginRight:'0.5rem',color:'#ccc'}}>কয়েন সিলেক্ট করুন:</label>
        <select 
          value={selectedCoins} 
          onChange={(e) => setSelectedCoins(e.target.value)}
          style={{
            background:'#333',
            color:'#fff',
            border:'1px solid #555',
            borderRadius:'4px',
            padding:'0.5rem'
          }}
        >
          {coinOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      
      {/* লাইভ স্ট্যাটাস */}
      <div style={{textAlign:'center',marginBottom:'1rem',fontSize:'0.9rem',color:'#00e396'}}>
        🔴 লাইভ আপডেট (প্রতি ১০ সেকেন্ডে)
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" stroke="#fff" />
          <YAxis dataKey="current_price" stroke="#fff" />
          <Tooltip contentStyle={{background:'#222',border:'none',color:'#fff'}}/>
          <Line type="monotone" dataKey="current_price" stroke="#00e396" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
      
      {/* কয়েন তালিকা */}
      <div style={{marginTop:'1.5rem'}}>
        <h3 style={{color:'#00e396',marginBottom:'1rem'}}>বর্তমান দাম:</h3>
        <div style={{display:'grid',gap:'0.5rem'}}>
          {data.map(coin => (
            <div key={coin.id} style={{
              display:'flex',
              justifyContent:'space-between',
              background:'#222',
              padding:'0.7rem',
              borderRadius:'6px'
            }}>
              <span>{coin.name} ({coin.symbol.toUpperCase()})</span>
              <span style={{color: coin.price_change_percentage_24h >= 0 ? '#00e396' : '#ff4757'}}>
                ${coin.current_price.toFixed(2)} 
                ({coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
