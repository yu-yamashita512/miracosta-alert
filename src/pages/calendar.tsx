// カレンダー描画後に、全セルが非表示の週（tr）を非表示にする
import { useRef } from 'react';
type AvEntry = { date: string; is_available: boolean; price: number | null; source?: string }

import { Cinzel, Noto_Serif_JP } from 'next/font/google';
import { Calendar as CalendarIcon, Filter, RefreshCw } from 'lucide-react';
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const notoSerif = Noto_Serif_JP({ subsets: ['latin'], weight: ['400', '700'] });

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NextPage } from 'next';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ListPlugin from '@fullcalendar/list';
const Tippy = dynamic(() => import('@tippyjs/react'), { ssr: false });
import 'tippy.js/dist/tippy.css';
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

const CalendarPage: NextPage = () => {
  const calendarRef = useRef<any>(null)
  const [data, setData] = useState<Record<string, AvEntry[]>>({})
  const [selectedRooms, setSelectedRooms] = useState<Record<string, boolean>>({})
  const [showSidebar, setShowSidebar] = useState(true)
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  // 初期レンジ: 今日〜6ヶ月後（約180日）
  const initialStart = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }, [])
  const initialEnd = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  }, [])

  // カレンダーの表示範囲制限: 今日から6ヶ月後まで
  const validRange = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setMonth(maxDate.getMonth() + 6)
    return {
      start: today.toISOString().slice(0, 10),
      end: maxDate.toISOString().slice(0, 10),
    }
  }, [])

  // データ取得関数
  const loadData = async (start: string, end: string) => {
    try {
      const res = await fetch(`/api/availability?start=${start}&end=${end}`)
      const json = await res.json()
      if (json && json.success && json.data) {
        // 既存のデータとマージ（同じキーは上書き）
        setData((prev) => {
          const merged = { ...prev } as Record<string, AvEntry[]>
          (Object.entries(json.data) as [string, AvEntry[]][]).forEach(([room, entries]) => {
            if (!merged[room]) {
              merged[room] = []
            }
            // 既存のエントリとマージ（日付で重複チェック）
            const existingDates = new Set(merged[room].map((e) => e.date))
            entries.forEach((entry) => {
              if (!existingDates.has(entry.date)) {
                merged[room].push(entry)
              }
            })
            merged[room].sort((a, b) => a.date.localeCompare(b.date))
          })
          return merged
        })

        // 部屋の選択状態を更新（モックデータはデフォルトで非表示）
        setSelectedRooms((prev) => {
          const map = Object.assign({}, prev) as Record<string, boolean>
          (Object.entries(json.data) as [string, AvEntry[]][]).forEach(([room, arr]) => {
            map[room] = true
          })
          return map
        })
      }
    } catch (err) {
      console.error('load availability', err)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    loadData(initialStart, initialEnd)
  }, [initialStart, initialEnd])

  // カレンダーの表示範囲が変わったときにデータを取得
  const handleDatesSet = (arg: any) => {
    const viewStart = arg.start.toISOString().slice(0, 10)
    const viewEnd = arg.end.toISOString().slice(0, 10)
    setDateRange({ start: viewStart, end: viewEnd })
    
    // 表示範囲の開始日から6ヶ月後までデータを取得
    const endDate = new Date(arg.start)
    endDate.setMonth(endDate.getMonth() + 6)
    const fetchEnd = endDate.toISOString().slice(0, 10)
    
    // 表示範囲のデータを取得（既に取得済みの場合はスキップ）
    loadData(viewStart, fetchEnd)
  }

  const events = useMemo(() => {
    const ev: Array<any> = []
    Object.entries(data).forEach(([room, arr]) => {
      arr.forEach((e) => {
        if (!e.is_available) return
        ev.push({
          id: `${room}-${e.date}`,
          title: e.price ? `空室 ¥${e.price.toLocaleString()}` : '空室',
          start: e.date,
          allDay: true,
          extendedProps: { room, price: e.price },
          backgroundColor: `hsl(${hashString(room) % 360} 60% 60%)`,
          borderColor: `hsl(${hashString(room) % 360} 60% 40%)`,
        })
      })
    })
    return ev
  }, [data])

  const filteredEvents = useMemo(() => events.filter((ev) => selectedRooms[ev.extendedProps.room]), [events, selectedRooms])

  // カスタムイベント描画（tooltips を使う）
  const eventContent = (arg: any) => {
    const { event } = arg
    const room = event.extendedProps.room
    const price = event.extendedProps.price
    return (
      <Tippy content={<EventTooltip room={room} price={price} date={event.startStr} />} touch="hold">
        <div style={{ padding: '4px 6px', borderRadius: 6, color: '#111', fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{event.title}</div>
          <div style={{ opacity: 0.9, fontSize: 11 }}>{room}</div>
        </div>
      </Tippy>
    )
  }

  // カレンダー描画後に空行を非表示にする副作用
  useEffect(() => {
    // 0.5秒後にDOM操作（描画タイミングのズレ対策）
    const timer = setTimeout(() => {
      const calendarEl = document.querySelector('.fc-daygrid-body');
      if (!calendarEl) return;
      const weekRows = calendarEl.querySelectorAll('.fc-daygrid-week');
      weekRows.forEach((row) => {
        // その週の全セルがfc-day-otherかつfc-day-disabled（非表示セル）なら非表示
        const cells = Array.from(row.querySelectorAll('.fc-daygrid-day'));
        const allHidden = cells.every(cell => cell.classList.contains('fc-day-other') && (cell as HTMLElement).style.visibility === 'hidden');
        if (allHidden) {
          (row as HTMLElement).style.display = 'none';
        } else {
          (row as HTMLElement).style.display = '';
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [dateRange]);

  return (
    <main className={`min-h-screen bg-[#0C1445] text-[#F0F4F8] ${notoSerif.className} relative overflow-hidden`}>
      {/* 背景の魔法エフェクト（星のきらめき） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-1/4 w-1 h-1 bg-[#C5A059] rounded-full animate-pulse shadow-[0_0_10px_#C5A059]"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse delay-150 shadow-[0_0_8px_#C5A059]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C1445] via-[#111a52] to-[#0C1445] opacity-80"></div>
      </div>

      <div className="relative z-10 flex gap-8 px-4 py-10 md:py-16 max-w-7xl mx-auto">
        {/* サイドバー */}
        <aside className={`transition-all duration-200 bg-[#111a52]/80 border border-[#C5A059]/30 rounded-2xl shadow-lg p-6 w-72 min-w-[220px] max-w-xs ${showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'} flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${cinzel.className} text-[#C5A059] text-lg font-bold tracking-wider`}>部屋フィルタ</h3>
            <button onClick={() => setShowSidebar(false)} className="text-[#C5A059] hover:text-white transition-colors text-xl font-bold">✕</button>
          </div>
          <div className="max-h-[72vh] overflow-auto mt-2 custom-scrollbar">
            {Object.keys(data).length === 0 && <div className="text-white/60">読み込み中...</div>}
            {Object.keys(data).map((room) => {
              const arr = data[room] || []
              return (
                <label key={room} className="flex items-center gap-2 mb-3 cursor-pointer text-white/90 hover:text-[#C5A059] transition-colors">
                  <input
                    type="checkbox"
                    checked={!!selectedRooms[room]}
                    onChange={(e) => setSelectedRooms((s) => ({ ...s, [room]: e.target.checked }))}
                    className="accent-[#C5A059] w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">{room}</span>
                </label>
              )
            })}
          </div>
        </aside>

        {/* メインカレンダー */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`${cinzel.className} text-2xl md:text-3xl font-bold text-[#C5A059] tracking-wider mb-0`}>空室カレンダー</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  loadData(initialStart, initialEnd)
                  if (dateRange) {
                    loadData(dateRange.start, dateRange.end)
                  }
                }}
                className="flex items-center gap-1 bg-[#A51C30] hover:bg-[#8a1626] text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>再読み込み</span>
              </button>
              <button
                onClick={() => setShowSidebar((s) => !s)}
                className="flex items-center gap-1 bg-[#C5A059]/90 hover:bg-[#C5A059] text-[#0C1445] font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200"
              >
                <Filter className="w-4 h-4" />
                <span>フィルタ</span>
              </button>
            </div>
          </div>

          <div className="bg-white/10 border border-[#C5A059]/30 rounded-2xl shadow-xl p-4 md:p-8">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin, ListPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' }}
              events={filteredEvents}
              eventContent={eventContent}
              eventDisplay="block"
              height="auto"
              dayMaxEventRows={3}
              expandRows={true}
              datesSet={handleDatesSet}
              validRange={validRange}
              dayMaxEvents={true}
              showNonCurrentDates={false}
            />
          </div>
        </main>
      </div>
    </main>
  )
}

const EventTooltip = ({ room, price, date }: { room: string; price: number | null; date: string }) => {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{room}</div>
      <div style={{ marginBottom: 4 }}>{date}</div>
      <div style={{ fontSize: 14 }}>{price ? `価格: ¥${price.toLocaleString()}` : '価格情報なし'}</div>
    </div>
  )
}

function hashString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

export default CalendarPage
