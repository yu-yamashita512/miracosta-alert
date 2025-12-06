// カレンダー描画後に、全セルが非表示の週（tr）を非表示にする
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = '.only-other-row { display: none !important; }';
  document.head.appendChild(style);
}

import { useRef, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Cinzel, Noto_Serif_JP } from 'next/font/google';
import { Calendar as CalendarIcon, Castle, Filter, RefreshCw, Bell } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { NextPage } from 'next';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import 'tippy.js/dist/tippy.css';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const notoSerif = Noto_Serif_JP({ subsets: ['latin'], weight: ['400', '700'] });

const Tippy = dynamic(() => import('@tippyjs/react'), { ssr: false });
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

type AvEntry = { date: string; is_available: boolean; price: number | null; source?: string }

// 楽天予約URL生成関数
function generateRakutenReserveUrl(roomType: string, date: string) {
  const hotelNo = '74733';
  const checkin = new Date(date);
  const yyyy = checkin.getFullYear();
  const mm = String(checkin.getMonth() + 1).padStart(2, '0');
  const dd = String(checkin.getDate()).padStart(2, '0');
  
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + 1);
  const cyyyy = checkout.getFullYear();
  const cmm = String(checkout.getMonth() + 1).padStart(2, '0');
  const cdd = String(checkout.getDate()).padStart(2, '0');
  
  return `https://hotel.travel.rakuten.co.jp/hotelinfo/plan/${hotelNo}?f_no=${hotelNo}&f_flg=PLAN&f_nen1=${yyyy}&f_tuki1=${mm}&f_hi1=${dd}&f_nen2=${cyyyy}&f_tuki2=${cmm}&f_hi2=${cdd}&f_otona_su=2&f_s1=0&f_s2=0&f_y1=0&f_y2=0&f_y3=0&f_y4=0&f_heya_su=1`;
}

const Home: NextPage = () => {
  const router = useRouter();
  const calendarRef = useRef<any>(null);
  const [data, setData] = useState<Record<string, AvEntry[]>>({});
  const [selectedRooms, setSelectedRooms] = useState<Record<string, boolean>>({});
  const [showSidebar, setShowSidebar] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // 初期レンジ: 今日〜6ヶ月後（約180日）
  const initialStart = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);
  
  const initialEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  }, []);

  // カレンダーの表示範囲制限: 今日から6ヶ月後まで
  const validRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 6);
    return {
      start: today.toISOString().slice(0, 10),
      end: maxDate.toISOString().slice(0, 10),
    };
  }, []);

  // データ取得関数
  const loadData = async (start: string, end: string) => {
    try {
      const res = await fetch(`/api/availability?start=${start}&end=${end}`);
      const json = await res.json();
      if (json && json.success && json.data) {
        setData((prev) => {
          const merged = { ...prev } as Record<string, AvEntry[]>;
          (Object.entries(json.data) as [string, AvEntry[]][]).forEach(([room, entries]) => {
            if (!merged[room]) {
              merged[room] = [];
            }
            const existingDates = new Set(merged[room].map((e) => e.date));
            entries.forEach((entry) => {
              if (!existingDates.has(entry.date)) {
                merged[room].push(entry);
              }
            });
            merged[room].sort((a, b) => a.date.localeCompare(b.date));
          });
          return merged;
        });
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  useEffect(() => {
    if (dateRange) {
      loadData(dateRange.start, dateRange.end);
    } else {
      loadData(initialStart, initialEnd);
    }
  }, [dateRange, initialStart, initialEnd]);

  // 全部屋タイプリスト
  const allRoomTypes = useMemo(() => Object.keys(data).sort(), [data]);

  // 初期表示: 全部屋選択
  useEffect(() => {
    if (allRoomTypes.length > 0 && Object.keys(selectedRooms).length === 0) {
      const init: Record<string, boolean> = {};
      allRoomTypes.forEach((r) => (init[r] = true));
      setSelectedRooms(init);
    }
  }, [allRoomTypes, selectedRooms]);

  // フィルタされた部屋タイプ
  const filteredRoomTypes = useMemo(() => {
    return allRoomTypes.filter((r) => selectedRooms[r]);
  }, [allRoomTypes, selectedRooms]);

  // FullCalendarイベント生成
  const events = useMemo(() => {
    const result: any[] = [];
    filteredRoomTypes.forEach((roomType) => {
      const entries = data[roomType] || [];
      entries.forEach((entry) => {
        if (entry.is_available) {
          result.push({
            id: `${entry.date}-${roomType}`,
            title: roomType,
            start: entry.date,
            allDay: true,
            backgroundColor: '#C5A059',
            borderColor: '#C5A059',
            extendedProps: {
              roomType,
              price: entry.price,
              source: entry.source,
              date: entry.date,
            },
          });
        }
      });
    });
    return result;
  }, [filteredRoomTypes, data]);

  // カレンダーの日付範囲変更時
  const handleDatesSet = (arg: any) => {
    const start = arg.start.toISOString().slice(0, 10);
    const end = arg.end.toISOString().slice(0, 10);
    setDateRange({ start, end });
  };

  // イベントクリック時: 楽天予約ページへ遷移
  const handleEventClick = (info: any) => {
    const { roomType, date } = info.event.extendedProps;
    const url = generateRakutenReserveUrl(roomType, date);
    window.open(url, '_blank');
  };

  // 全選択/全解除
  const toggleAll = () => {
    const allSelected = allRoomTypes.every((r) => selectedRooms[r]);
    const newState: Record<string, boolean> = {};
    allRoomTypes.forEach((r) => (newState[r] = !allSelected));
    setSelectedRooms(newState);
  };

  // 個別トグル
  const toggleRoom = (room: string) => {
    setSelectedRooms((prev) => ({ ...prev, [room]: !prev[room] }));
  };

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
            MiraCosta Alert
          </h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm tracking-widest opacity-80">
          <button 
            onClick={() => router.push('/dashboard')}
            className="hover:text-[#C5A059] transition-colors flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            通知設定
          </button>
          <button 
            onClick={() => router.push('/auth/login')}
            className="hover:text-[#C5A059] transition-colors"
          >
            ログイン
          </button>
        </nav>
      </header>

      {/* メインエリア */}
      <div className="relative z-10 container mx-auto px-4 pt-8 pb-20">
        {/* キャッチコピー */}
        <div className="text-center mb-8 space-y-4">
          <p className={`${cinzel.className} text-[#C5A059] text-lg tracking-[0.2em]`}>
            Hotel MiraCosta
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            夢の続きを、<br />
            この場所から。
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto pt-4">
            ホテルミラコスタの空室状況をリアルタイムでご案内いたします。<br/>
            特別な夜のための、魔法の鍵をお探しします。
          </p>
        </div>

        {/* カレンダーエリア */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* サイドバー（フィルター） */}
          {showSidebar && (
            <div className="lg:w-80 bg-white/5 backdrop-blur-md border border-[#C5A059]/50 rounded-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${cinzel.className} text-lg text-[#C5A059] tracking-wider`}>
                  <Filter className="inline w-5 h-5 mr-2" />
                  部屋タイプ
                </h3>
                <button
                  onClick={toggleAll}
                  className="text-xs text-white/60 hover:text-[#C5A059] transition-colors"
                >
                  {allRoomTypes.every((r) => selectedRooms[r]) ? '全解除' : '全選択'}
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allRoomTypes.map((room) => (
                  <label key={room} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedRooms[room] || false}
                      onChange={() => toggleRoom(room)}
                      className="w-4 h-4 accent-[#C5A059]"
                    />
                    <span className="text-sm text-white/80 group-hover:text-[#C5A059] transition-colors">
                      {room}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* カレンダー */}
          <div className="flex-1 bg-white/5 backdrop-blur-md border border-[#C5A059]/50 rounded-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${cinzel.className} text-lg text-[#C5A059] tracking-wider`}>
                <CalendarIcon className="inline w-5 h-5 mr-2" />
                空室カレンダー
              </h3>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden text-sm text-white/60 hover:text-[#C5A059] transition-colors"
              >
                {showSidebar ? 'フィルター非表示' : 'フィルター表示'}
              </button>
            </div>
            
            <div className="calendar-container bg-white/10 rounded-lg p-4">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                locale="ja"
                events={events}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                validRange={validRange}
                height="auto"
                eventContent={(arg) => {
                  const { price } = arg.event.extendedProps;
                  return (
                    <Tippy content={`${arg.event.title}${price ? ` - ¥${price.toLocaleString()}` : ''}`}>
                      <div className="text-xs px-1 truncate cursor-pointer">
                        {arg.event.title}
                      </div>
                    </Tippy>
                  );
                }}
              />
            </div>

            <div className="mt-4 text-xs text-white/50 text-center">
              <p>🏰 空室をクリックすると楽天トラベルの予約ページが開きます</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .fc {
          color: #F0F4F8;
        }
        .fc .fc-button {
          background-color: rgba(197, 160, 89, 0.2);
          border-color: #C5A059;
          color: #C5A059;
        }
        .fc .fc-button:hover {
          background-color: rgba(197, 160, 89, 0.4);
        }
        .fc .fc-button-active {
          background-color: #C5A059 !important;
          color: #0C1445 !important;
        }
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: rgba(197, 160, 89, 0.2);
        }
        .fc .fc-daygrid-day-number {
          color: #F0F4F8;
        }
        .fc .fc-col-header-cell-cushion {
          color: #C5A059;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background-color: rgba(197, 160, 89, 0.1);
        }
      `}</style>
    </main>
  );
};

export default Home;
