import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https') || !key) return null
  return createSupabaseClient(url, key)
}

// GET /api/admin/stores — store_settings 목록
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get('cosmart_role')?.value !== 'admin') {
    return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: [], error: null })
  }

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .order('name')

    if (error) {
      console.error('store_settings query error:', error.message)
      return NextResponse.json({ data: [], error: null })
    }
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}
