// app/components/MarketList.tsx
// মার্কেট লিস্ট কম্পোনেন্ট

'use client';
import React, { useEffect, useState } from 'react';
import { fetchMarketData } from '../utils/coingecko';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
}

export default function MarketList() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    // টপ ১০ কয়েন ফেচ করা
    fetchMarketData('bitcoin,ethereum,binancecoin,cardano,solana,polkadot,dogecoin,avalanche-2,chainlink,polygon').then((res) => {
      setCoins(res);
      setLoading(false);
    });

    // লোকাল স্টোরেজ থেকে ফেভারিট লোড
    const savedFavorites = localStorage.getItem('crypto-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const toggleFavorite = (coinId: string) => {
    const newFavorites = favorites.includes(coinId) 
      ? favorites.filter(id => id !== coinId)
      : [...favorites, coinId];
    
    setFavorites(newFavorites);
    localStorage.setItem('crypto-favorites', JSON.stringify(newFavorites));
  };

  if (loading) return <div style={{color:'#fff',textAlign:'center'}}>মার্কেট ডেটা লোড হচ্ছে...</div>;

  return (
    <div style={{
      maxWidth: 800,
      margin: '2rem auto',
      background: '#181c24',
      borderRadius: '12px',
      padding: '1.5rem',
      color: '#fff'
    }}>
      <h2 style={{textAlign:'center',marginBottom:'1.5rem',color:'#00e396'}}>
        টপ ক্রিপ্টো মার্কেট
      </h2>
      
      <div style={{display:'grid',gap:'1rem'}}>
        {coins.map(coin => (
          <div key={coin.id} style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            background:'#222',
            padding:'1rem',
            borderRadius:'8px',
            border: favorites.includes(coin.id) ? '2px solid #00e396' : '1px solid #333'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
              <button 
                onClick={() => toggleFavorite(coin.id)}
                style={{
                  background:'none',
                  border:'none',
                  fontSize:'1.2rem',
                  cursor:'pointer',
                  color: favorites.includes(coin.id) ? '#00e396' : '#666'
                }}
              >
                {favorites.includes(coin.id) ? '★' : '☆'}
              </button>
              <div>
                <div style={{fontWeight:'bold'}}>{coin.name}</div>
                <div style={{fontSize:'0.8rem',color:'#999'}}>{coin.symbol.toUpperCase()}</div>
              </div>
            </div>
            
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:'bold'}}>${coin.current_price.toFixed(2)}</div>
              <div style={{
                fontSize:'0.9rem',
                color: coin.price_change_percentage_24h >= 0 ? '#00e396' : '#ff4757'
              }}>
                {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {favorites.length > 0 && (
        <div style={{marginTop:'2rem',padding:'1rem',background:'#2a2a2a',borderRadius:'8px'}}>
          <h3 style={{color:'#00e396',marginBottom:'0.5rem'}}>আপনার ফেভারিট ({favorites.length}টি)</h3>
          <div style={{fontSize:'0.9rem',color:'#ccc'}}>
            {favorites.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
