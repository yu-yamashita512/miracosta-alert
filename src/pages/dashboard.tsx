import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface User {
  email: string
  subscription_plan: 'free' | 'premium'
}

interface NotificationHistory {
  id: string
  notification_type: 'email' | 'line'
  sent_at: string
  status: 'success' | 'failed'
  room_availability: {
    date: string
    room_type: string
    price: number | null
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('email, subscription_plan')
      .eq('id', session.user.id)
      .single()

    if (userData) {
      setUser(userData)
    }

    // 通知履歴取得
    const { data: historyData } = await supabase
      .from('notification_history')
      .select(`
        id,
        notification_type,
        sent_at,
        status,
        room_availability (
          date,
          room_type,
          price
        )
      `)
      .eq('user_id', session.user.id)
      .order('sent_at', { ascending: false })
      .limit(10)

    if (historyData) {
      setHistory(historyData as any)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>ダッシュボード - ミラコスタ空室通知</title>
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
                <Link href="/calendar" className="text-gray-700 hover:text-purple-600">
                  カレンダー
                </Link>
                <Link href="/rooms" className="text-gray-700 hover:text-purple-600">
                  空室一覧
                </Link>
                <Link href="/notifications" className="text-gray-700 hover:text-purple-600">
                  通知設定
                </Link>
                <Link href="/settings" className="text-gray-700 hover:text-purple-600">
                  設定
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">ダッシュボード</h2>
            <p className="text-gray-600">アカウント情報と通知履歴を確認できます</p>
          </div>

          {/* アカウント情報 */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">アカウント情報</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">メールアドレス:</span>
                <span className="ml-2 font-medium">{user?.email}</span>
              </div>
              <div>
                <span className="text-gray-600">プラン:</span>
                <span
                  className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                    user?.subscription_plan === 'premium'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user?.subscription_plan === 'premium' ? 'プレミアム' : '無料'}
                </span>
              </div>
            </div>
            {user?.subscription_plan === 'free' && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-900 mb-3">
                  プレミアムプランにアップグレードして、LINE通知や条件指定などの追加機能をご利用ください。
                </p>
                <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-semibold">
                  プレミアムにアップグレード
                </button>
              </div>
            )}
          </div>

          {/* 通知履歴 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">通知履歴</h3>
            {history.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                まだ通知履歴がありません
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.notification_type === 'email'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.notification_type === 'email' ? 'メール' : 'LINE'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.status === 'success' ? '成功' : '失敗'}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {item.room_availability?.date} - {item.room_availability?.room_type}
                      </p>
                      {item.room_availability?.price && (
                        <p className="text-sm text-purple-600">
                          ¥{item.room_availability.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {new Date(item.sent_at).toLocaleString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
