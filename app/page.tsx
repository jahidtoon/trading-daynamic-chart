"use client";
import dynamic from 'next/dynamic';

const CandlestickChart = dynamic(() => import('./components/CandlestickChart'), { ssr: false });

export default function Home() {
  return (
  <main style={{minHeight:'100vh',height:'100vh',background:'#10131a',padding:0,margin:0}}>
  <CandlestickChart />
    </main>
  );
}
