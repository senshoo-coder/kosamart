import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https') || !key) return null
  return createSupabaseClient(url, key)
}

// GET /api/market/stores — 고객용 활성 가게 is_active 상태 목록
export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: null, error: null })
  }

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('store_id, is_active')

    if (error) {
      return NextResponse.json({ data: null, error: null })
    }
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: null })
  }
}
