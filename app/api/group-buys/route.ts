import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { DEMO_GROUP_BUY, DEMO_PRODUCTS } from '@/lib/demo-data'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

// GET /api/group-buys
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  if (isDemoMode) {
    const gb = { ...DEMO_GROUP_BUY, products: DEMO_PRODUCTS }
    const filtered = !status || status === 'all' || gb.status === status ? [gb] : []
    return NextResponse.json({ data: filtered, error: null })
  }

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('group_buys')
    .select(`*, products(*)`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  const filtered = status && status !== 'all'
    ? (data || []).filter((gb: { status: string }) => gb.status === status)
    : (data || [])

  return NextResponse.json({ data: filtered, error: null })
}

// POST /api/group-buys
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, order_deadline, delivery_date } = body

  if (!title?.trim()) {
    return NextResponse.json({ data: null, error: '필수 항목 누락' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('group_buys')
    .insert({ title, description, order_deadline, delivery_date, status: 'draft' })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
