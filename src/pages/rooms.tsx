import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Room {
  id: string
  date: string
  room_type: string
  is_available: boolean
  price: number | null
  last_checked_at: string | null
  created_at?: string | null
  source?: string | null
}

export default function Rooms() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    availableOnly: false,
    roomType: 'all',
  })

  useEffect(() => {
    checkAuth()
    fetchRooms()
  }, [filter])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
    }
  }

  const fetchRooms = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('room_availability')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (filter.availableOnly) {
        query = query.eq('is_available', true)
      }

      if (filter.roomType !== 'all') {
        query = query.eq('room_type', filter.roomType)
      }

      const { data, error } = await query

      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const roomTypes = [
    'スーペリアルーム ハーバービュー',
    'バルコニールーム ハーバーグランドビュー',
    'ハーバールーム',
    'ポルト・パラディーゾ・サイド スーペリアルーム',
    'テラスルーム ハーバーグランドビュー',
  ]

  return (
    <>
      <Head>
        <title>空室一覧 - ミラコスタ空室通知</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-3xl">🏰</span>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  ミラコスタ空室通知
                </h1>
              </Link>
              <div className="space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-purple-600">
                  ダッシュボード
                </Link>
                <Link href="/settings" className="text-gray-700 hover:text-purple-600">
                  設定
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">空室一覧</h2>
            <p className="text-gray-600">ミラコスタの現在の空室状況を確認できます</p>
          </div>

          {/* フィルター */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  部屋タイプ
                </label>
                <select
                  value={filter.roomType}
                  onChange={(e) => setFilter({ ...filter, roomType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">すべて</option>
                  {roomTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示条件
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.availableOnly}
                    onChange={(e) =>
                      setFilter({ ...filter, availableOnly: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    空室のみ表示
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 空室リスト */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-md text-center">
              <p className="text-gray-600">条件に合う空室が見つかりませんでした</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
                    room.is_available
                      ? 'border-green-500'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            room.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {room.is_available ? '空室あり' : '満室'}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {format(new Date(room.date), 'yyyy年M月d日(E)', { locale: ja })}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {room.room_type}
                      </h3>
                      {room.price && (
                        <p className="text-2xl font-bold text-purple-600">
                          ¥{room.price.toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        最終確認:{' '}
                        {format(new Date(room.last_checked_at), 'M月d日 HH:mm', { locale: ja })}
                      </p>
                    </div>
                    {room.is_available && (
                      <a
                        href="https://reserve.tokyodisneyresort.jp/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
                      >
                        予約する →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
