import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'

interface HomeProps {
  session: Session | null
}

export default function Home({ session }: HomeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>ミラコスタ空室通知サービス</title>
        <meta name="description" content="東京ディズニーシー・ホテルミラコスタの空室情報をリアルタイムで通知" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-3xl">🏰</span>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  ミラコスタ空室通知
                </h1>
              </div>
              <div className="space-x-4">
                {session ? (
                  <>
                    <Link href="/rooms" className="text-gray-700 hover:text-purple-600">
                      空室一覧
                    </Link>
                    <Link href="/settings" className="text-gray-700 hover:text-purple-600">
                      設定
                    </Link>
                    <Link href="/dashboard" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                      ダッシュボード
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="text-gray-700 hover:text-purple-600">
                      ログイン
                    </Link>
                    <Link href="/auth/signup" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                      新規登録
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        </header>

        {/* ヒーローセクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              ミラコスタの空室を
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                見逃さない
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              東京ディズニーシー直結ホテル「ミラコスタ」の空室情報を、
              LINEやメールでリアルタイムにお知らせします。
            </p>
            {!session && (
              <Link
                href="/auth/signup"
                className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition"
              >
                無料で始める
              </Link>
            )}
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">リアルタイム通知</h3>
              <p className="text-gray-600">
                5分間隔で空室をチェック。空室が出た瞬間に通知を受け取れます。
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">条件指定</h3>
              <p className="text-gray-600">
                希望の日付や部屋タイプを指定。あなたに必要な通知だけを受け取れます。
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2">マルチ通知</h3>
              <p className="text-gray-600">
                LINE・メールの両方で通知可能。お好きな方法で受け取れます。
              </p>
            </div>
          </div>
        </section>

        {/* 料金プラン */}
        <section className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">料金プラン</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-md">
                <h3 className="text-2xl font-bold mb-2">無料プラン</h3>
                <p className="text-4xl font-bold mb-6">
                  ¥0<span className="text-lg text-gray-600">/月</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>基本的な空室通知</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>メール通知</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>空室一覧閲覧</span>
                  </li>
                </ul>
                <Link
                  href="/auth/signup"
                  className="block text-center bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
                >
                  無料で始める
                </Link>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-8 rounded-xl shadow-xl transform scale-105">
                <div className="bg-yellow-400 text-purple-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
                  人気
                </div>
                <h3 className="text-2xl font-bold mb-2">プレミアムプラン</h3>
                <p className="text-4xl font-bold mb-6">
                  ¥980<span className="text-lg opacity-80">/月</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>無料プランの全機能</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>LINE通知対応</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>日付・部屋タイプ指定</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>優先通知配信</span>
                  </li>
                </ul>
                <Link
                  href="/auth/signup"
                  className="block text-center bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100"
                >
                  プレミアムを始める
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* フッター */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                &copy; 2024 ミラコスタ空室通知サービス
              </p>
              <p className="text-sm text-gray-500">
                ※ このサービスは非公式サービスです。東京ディズニーリゾート・ホテルミラコスタとは一切関係ありません。
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
