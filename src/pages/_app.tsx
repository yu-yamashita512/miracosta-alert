import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'

export default function App({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Supabaseが設定されている場合のみ認証を確認
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://mock.supabase.co'
    
    if (hasSupabase) {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        setSession(session)
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setSession(session)
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  return <Component {...pageProps} session={session} />
}
