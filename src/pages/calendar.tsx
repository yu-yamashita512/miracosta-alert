import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { NextPage } from 'next'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import ListPlugin from '@fullcalendar/list'
const Tippy = dynamic(() => import('@tippyjs/react'), { ssr: false })
import 'tippy.js/dist/tippy.css'

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false })

type AvEntry = { date: string; is_available: boolean; price: number | null; source?: string }

const CalendarPage: NextPage = () => {
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
              } else {
                // 既存のエントリを更新（rakutenソースを優先）
                const index = merged[room].findIndex((e) => e.date === entry.date)
                if (index >= 0) {
                  if (entry.source === 'rakuten' || merged[room][index].source === 'mock') {
                    merged[room][index] = entry
                  }
                }
              }
            })
            merged[room].sort((a, b) => a.date.localeCompare(b.date))
          })
          return merged
        })

        // 部屋の選択状態を更新（モックデータはデフォルトで非表示）
        setSelectedRooms((prev) => {
          const map = { ...prev }
          Object.entries(json.data).forEach(([room, arr]: [string, AvEntry[]]) => {
            const hasReal = arr.some((e) => e.source && e.source !== 'mock')
            const isMockOnly = arr.every((e) => !e.source || e.source === 'mock')
            if (hasReal) {
              map[room] = true
            } else if (isMockOnly) {
              // モックのみの部屋はデフォルトで非表示
              map[room] = false
            } else if (map[room] === undefined) {
              map[room] = false
            }
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

  return (
    <div style={{ display: 'flex', gap: 12, padding: 12, flexDirection: 'row' }}>
      <aside style={{ width: showSidebar ? 300 : 0, transition: 'width 180ms', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>部屋フィルタ</h3>
          <button onClick={() => setShowSidebar(false)} style={{ background: 'transparent', border: 'none' }}>✕</button>
        </div>
        <div style={{ maxHeight: '72vh', overflow: 'auto', marginTop: 8 }}>
          {Object.keys(data).length === 0 && <div>読み込み中...</div>}
          {Object.keys(data)
            .filter((room) => {
              // モックデータのみの部屋タイプを除外
              const arr = data[room] || []
              const isMockOnly = arr.every((it) => !it.source || it.source === 'mock')
              return !isMockOnly
            })
            .map((room) => {
              const arr = data[room] || []
              return (
                <label key={room} style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!selectedRooms[room]}
                    onChange={(e) => setSelectedRooms((s) => ({ ...s, [room]: e.target.checked }))}
                  />
                  {' '}
                  <span style={{ fontSize: 14 }}>{room}</span>
                </label>
              )
            })}
        </div>
      </aside>

      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: '0 0 12px 0' }}>空室カレンダー</h2>
          <div>
            <button
              onClick={() => {
                // データを再読み込み
                loadData(initialStart, initialEnd)
                // カレンダーの表示範囲も再取得
                if (dateRange) {
                  loadData(dateRange.start, dateRange.end)
                }
              }}
              style={{ marginRight: 8, padding: '6px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              データを再読み込み
            </button>
            <button onClick={() => setShowSidebar((s) => !s)} style={{ marginRight: 8 }}>フィルタ</button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 8, padding: 8 }}>
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
          />
        </div>
      </main>
    </div>
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
