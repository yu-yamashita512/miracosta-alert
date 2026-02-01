import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 環境変数（Supabase の Secrets に設定）:
// TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

function percentEncode(str: string) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/'/g, '%27')
}

function generateNonce(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let nonce = ''
  crypto.getRandomValues(new Uint32Array(length)).forEach((v) => {
    nonce += chars[v % chars.length]
  })
  return nonce
}

async function hmacSha1(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder()
  const keyData = enc.encode(key)
  const msgData = enc.encode(msg)
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  // base64 encode
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return b64
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const text: string = body.text
    const dedupeKey: string | undefined = body.dedupe_key

    if (!text) return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 重複チェック: dedupeKey が与えられた場合、同じキーで投稿済みならスキップ
    if (dedupeKey) {
      const { data: existing } = await supabase
        .from('twitter_history')
        .select('*')
        .eq('dedupe_key', dedupeKey)
        .limit(1)

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ success: false, message: 'duplicate' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // OAuth1.0a署名生成
    const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY')!
    const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET')!
    const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN')!
    const accessTokenSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET')!

    const method = 'POST'
    const url = 'https://api.twitter.com/1.1/statuses/update.json'

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: generateNonce(16),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: String(Math.floor(Date.now() / 1000)),
      oauth_token: accessToken,
      oauth_version: '1.0',
    }

    // request params (status text)
    const reqParams: Record<string, string> = { status: text }

    // collect all params for base string
    const allParams: Array<[string, string]> = []
    Object.entries(oauthParams).forEach(([k, v]) => allParams.push([percentEncode(k), percentEncode(v)]))
    Object.entries(reqParams).forEach(([k, v]) => allParams.push([percentEncode(k), percentEncode(v)]))

    allParams.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
    const paramString = allParams.map(([k, v]) => `${k}=${v}`).join('&')

    const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&')
    const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`
    const signature = await hmacSha1(signingKey, baseString)
    oauthParams['oauth_signature'] = signature

    const authHeader = 'OAuth ' + Object.entries(oauthParams).map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`).join(', ')

    // POST to Twitter
    const formBody = new URLSearchParams({ status: text }).toString()
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    })

    const respText = await resp.text()
    if (!resp.ok) {
      console.error('Twitter API error', resp.status, respText)
      return new Response(JSON.stringify({ success: false, status: resp.status, body: respText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 成功したら履歴を保存
    if (dedupeKey) {
      await supabase.from('twitter_history').insert({ dedupe_key: dedupeKey, text, created_at: new Date().toISOString() })
    }

    return new Response(JSON.stringify({ success: true, body: JSON.parse(respText) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('post-to-twitter error', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
