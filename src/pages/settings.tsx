import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState({
    targetDates: [] as string[],
    targetRoomTypes: [] as string[],
    notificationViaEmail: true,
    notificationViaLine: false,
    isActive: true,
  })
  const [lineToken, setLineToken] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }

    // 通知設定取得
    const { data: settingsData } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (settingsData) {
      const data = settingsData as any
      setSettings({
        targetDates: data.target_dates || [],
        targetRoomTypes: data.target_room_types || [],
        notificationViaEmail: data.notification_via_email,
        notificationViaLine: data.notification_via_line,
        isActive: data.is_active,
      })
    }

    // LINEトークン取得
    const { data: userData } = await supabase
      .from('users')
      .select('line_notify_token')
      .eq('id', session.user.id)
      .single()

    if (userData) {
      const user = userData as any
      if (user.line_notify_token) {
        setLineToken(user.line_notify_token)
      }
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('ログインが必要です')

      // 通知設定を更新
      const { error: settingsError } = await (supabase as any)
        .from('notification_settings')
        .update({
          target_dates: settings.targetDates,
          target_room_types: settings.targetRoomTypes,
          notification_via_email: settings.notificationViaEmail,
          notification_via_line: settings.notificationViaLine,
          is_active: settings.isActive,
        })
        .eq('user_id', session.user.id)

      if (settingsError) throw settingsError

      // LINEトークンを更新
      if (lineToken) {
        const { error: tokenError } = await (supabase as any)
          .from('users')
          .update({ line_notify_token: lineToken })
          .eq('id', session.user.id)

        if (tokenError) throw tokenError
      }

      setMessage('設定を保存しました')
    } catch (error: any) {
      setMessage('エラー: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const roomTypes = [
    'スーペリアルーム ハーバービュー',
    'バルコニールーム ハーバーグランドビュー',
    'ハーバールーム',
    'ポルト・パラディーゾ・サイド スーペリアルーム',
    'テラスルーム ハーバーグランドビュー',
  ]

  const toggleRoomType = (roomType: string) => {
    if (settings.targetRoomTypes.includes(roomType)) {
      setSettings({
        ...settings,
        targetRoomTypes: settings.targetRoomTypes.filter((t) => t !== roomType),
      })
    } else {
      setSettings({
        ...settings,
        targetRoomTypes: [...settings.targetRoomTypes, roomType],
      })
    }
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
        <title>設定 - ミラコスタ空室通知</title>
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
                <Link href="/rooms" className="text-gray-700 hover:text-purple-600">
                  空室一覧
                </Link>
                <Link href="/dashboard" className="text-gray-700 hover:text-purple-600">
                  ダッシュボード
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">通知設定</h2>
            <p className="text-gray-600">通知条件をカスタマイズできます</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            {/* 通知方法 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">通知方法</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notificationViaEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationViaEmail: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2">メール通知</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notificationViaLine}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationViaLine: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2">LINE通知（プレミアムプラン）</span>
                </label>
              </div>
            </div>

            {/* LINEトークン */}
            {settings.notificationViaLine && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">LINE Notifyトークン</h3>
                <input
                  type="text"
                  value={lineToken}
                  onChange={(e) => setLineToken(e.target.value)}
                  placeholder="LINE Notifyトークンを入力"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="mt-2 text-sm text-gray-600">
                  <a
                    href="https://notify-bot.line.me/ja/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    LINE Notify
                  </a>
                  からトークンを取得してください
                </p>
              </div>
            )}

            {/* 部屋タイプ指定 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                通知する部屋タイプ（プレミアムプラン）
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                未選択の場合、すべての部屋タイプで通知されます
              </p>
              <div className="space-y-2">
                {roomTypes.map((roomType) => (
                  <label key={roomType} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.targetRoomTypes.includes(roomType)}
                      onChange={() => toggleRoomType(roomType)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2">{roomType}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 通知の有効/無効 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">通知状態</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.isActive}
                  onChange={(e) =>
                    setSettings({ ...settings, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-2">通知を有効にする</span>
              </label>
            </div>

            {/* メッセージ */}
            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.includes('エラー')
                    ? 'bg-red-50 text-red-800'
                    : 'bg-green-50 text-green-800'
                }`}
              >
                {message}
              </div>
            )}

            {/* 保存ボタン */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
