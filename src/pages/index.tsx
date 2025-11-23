
// --- ここからindex_gem.tsxのデザインを移植 ---
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cinzel, Noto_Serif_JP } from 'next/font/google';
import { Search, Calendar, Users, Castle, Star, ChevronDown } from 'lucide-react';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const notoSerif = Noto_Serif_JP({ subsets: ['latin'], weight: ['400', '700'] });

  const [hotel, setHotel] = useState('');
  const [date, setDate] = useState('');
  const router = useRouter();

  return (
    <main className={`min-h-screen bg-[#0C1445] text-[#F0F4F8] ${notoSerif.className} relative overflow-hidden`}>
      {/* 背景の魔法エフェクト（星のきらめき） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/4 w-1 h-1 bg-[#C5A059] rounded-full animate-pulse shadow-[0_0_10px_#C5A059]"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse delay-150 shadow-[0_0_8px_#C5A059]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C1445] via-[#111a52] to-[#0C1445] opacity-80"></div>
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-[#C5A059]/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Castle className="w-8 h-8 text-[#C5A059]" />
          <h1 className={`${cinzel.className} text-2xl font-bold tracking-wider text-[#C5A059]`}>
            Royal Concierge
          </h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm tracking-widest opacity-80">
          <a href="/calendar" className="hover:text-[#C5A059] transition-colors">空室検索</a>
          <a href="#" className="hover:text-[#C5A059] transition-colors">ホテル一覧</a>
          <a href="#" className="hover:text-[#C5A059] transition-colors">ログイン</a>
        </nav>
      </header>

      {/* メインエリア */}
      <div className="relative z-10 container mx-auto px-4 pt-16 pb-20 flex flex-col items-center">
        {/* キャッチコピー */}
        <div className="text-center mb-12 space-y-4">
          <p className={`${cinzel.className} text-[#C5A059] text-lg tracking-[0.2em]`}>
            Check Availability
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            夢の続きを、<br />
            この場所から。
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto pt-4">
            ご希望のディズニーホテルの空室状況を、リアルタイムでご案内いたします。
            特別な夜のための、魔法の鍵をお探しします。
          </p>
        </div>

        {/* 検索フォーム (Glassmorphism Card) */}
        <div className="w-full max-w-4xl bg-white/5 backdrop-blur-md border border-[#C5A059]/50 rounded-xl p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* ホテル選択 */}
            <div className="md:col-span-4 group relative">
              <label className="block text-xs text-[#C5A059] mb-1 ml-1 tracking-wider">HOTEL</label>
              <div className="relative">
                <Castle className="absolute left-3 top-3 w-5 h-5 text-white/50" />
                <select 
                  className="w-full bg-[#0C1445]/50 border border-[#C5A059]/30 rounded-lg py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-[#C5A059] transition-colors text-white"
                  value={hotel}
                  onChange={(e) => setHotel(e.target.value)}
                >
                  <option value="" className="bg-[#0C1445]">ホテルを選択してください</option>
                  <option value="miracosta" className="bg-[#0C1445]">ホテルミラコスタ</option>
                  <option value="landhotel" className="bg-[#0C1445]">ディズニーランドホテル</option>
                  <option value="ambassador" className="bg-[#0C1445]">アンバサダーホテル</option>
                  <option value="fantasysprings" className="bg-[#0C1445]">ファンタジースプリングスホテル</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-white/30" />
              </div>
            </div>
            {/* 日付選択 */}
            <div className="md:col-span-3">
              <label className="block text-xs text-[#C5A059] mb-1 ml-1 tracking-wider">DATE</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-white/50" />
                <input 
                  type="date" 
                  className="w-full bg-[#0C1445]/50 border border-[#C5A059]/30 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#C5A059] text-white appearance-none"
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            {/* 人数選択 */}
            <div className="md:col-span-2">
              <label className="block text-xs text-[#C5A059] mb-1 ml-1 tracking-wider">GUESTS</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-white/50" />
                <select className="w-full bg-[#0C1445]/50 border border-[#C5A059]/30 rounded-lg py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-[#C5A059] text-white">
                  <option className="bg-[#0C1445]">2 名</option>
                  <option className="bg-[#0C1445]">3 名</option>
                  <option className="bg-[#0C1445]">4 名</option>
                </select>
              </div>
            </div>
            {/* 検索ボタン */}
            <div className="md:col-span-3 flex items-end">
              <button
                className="w-full bg-[#A51C30] hover:bg-[#8a1626] text-white font-bold py-3 px-6 rounded-lg shadow-[0_4px_14px_rgba(165,28,48,0.4)] hover:shadow-[0_6px_20px_rgba(165,28,48,0.6)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                onClick={() => router.push('/calendar')}
              >
                <Search className="w-5 h-5" />
                <span>空室を探す</span>
              </button>
            </div>
          </div>
        </div>

        {/* ホテルカード例（装飾的な表示） */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {[
            { name: 'Tokyo DisneySea Hotel MiraCosta', sub: '冒険の余韻につつまれて', color: 'border-[#C5A059]' },
            { name: 'Tokyo Disneyland Hotel', sub: '夢と魔法の瞬間が続く', color: 'border-[#C5A059]/60' },
            { name: 'Disney Ambassador Hotel', sub: 'アールデコとディズニーの魔法', color: 'border-[#C5A059]/60' },
          ].map((item, idx) => (
            <div key={idx} className={`group relative bg-[#0C1445] border ${item.color} p-1 transition-all duration-500 hover:-translate-y-2`}>
              <div className="absolute inset-0 border border-[#C5A059]/20 m-1 pointer-events-none"></div>
              <div className="h-48 bg-[#1a2255] flex items-center justify-center relative overflow-hidden">
                <Castle className="w-16 h-16 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-2 right-2">
                   <Star className="w-4 h-4 text-[#C5A059] fill-[#C5A059]" />
                </div>
              </div>
              <div className="p-4 text-center">
                <h3 className={`${cinzel.className} text-[#C5A059] text-sm font-bold mb-2`}>
                  {item.name}
                </h3>
                <p className="text-xs text-white/70 font-serif">
                  {item.sub}
                </p>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 shadow-[0_0_30px_rgba(197,160,89,0.3)] transition-opacity duration-500 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
