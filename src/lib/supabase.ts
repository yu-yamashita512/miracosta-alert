import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// サービスロールキー用（サーバーサイドのみ）
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey
)
