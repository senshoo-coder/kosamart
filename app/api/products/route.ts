import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/products
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const groupBuyId = searchParams.get('group_buy_id')

  const supabase = await createAdminClient()

  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })

  if (groupBuyId) {
    query = query.eq('group_buy_id', groupBuyId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

// POST /api/products
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { group_buy_id, name, description, price, unit, stock_limit, image_url } = body

  if (!group_buy_id || !name?.trim() || !price) {
    return NextResponse.json({ data: null, error: '필수 항목 누락' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .insert({ group_buy_id, name, description, price, unit, stock_limit, image_url, is_available: true })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
