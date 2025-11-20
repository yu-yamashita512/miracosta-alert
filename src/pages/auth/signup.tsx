import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })

      if (error) throw error

      if (data.user) {
        // ユーザーテーブルにも追加
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          subscription_plan: 'free',
        })

        // 初期通知設定を作成
        await supabase.from('notification_settings').insert({
          user_id: data.user.id,
          notification_via_email: true,
          notification_via_line: false,
          is_active: true,
        })

        setSuccess(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>新規登録 - ミラコスタ空室通知</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="text-center text-6xl mb-4">🏰</div>
            <h2 className="text-center text-3xl font-bold text-gray-900">
              新規登録
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/auth/login" className="font-medium text-purple-600 hover:text-purple-500">
                ログイン
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSignup}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="メールアドレス"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="パスワード（6文字以上）"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  登録が完了しました！ダッシュボードに移動します...
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loading ? '登録中...' : '新規登録'}
              </button>
            </div>

            <p className="text-xs text-center text-gray-500">
              登録することで、利用規約とプライバシーポリシーに同意したものとみなされます。
            </p>
          </form>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-purple-600">
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
