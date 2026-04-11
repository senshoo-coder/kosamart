import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https') || !key) return null
  return createSupabaseClient(url, key)
}

// 데모 사장님 계정의 store_id 매핑
const DEMO_OWNER_STORES: Record<string, string> = {
  'demo-owner-001': 'central-super',
}

// owner의 store_id를 가져오는 헬퍼
async function getOwnerStoreId(supabase: any, userId: string): Promise<string | null> {
  // 데모 계정 체크
  if (DEMO_OWNER_STORES[userId]) return DEMO_OWNER_STORES[userId]
  // DB 조회
  const { data: user } = await supabase.from('users').select('store_id').eq('id', userId).single()
  return user?.store_id ?? null
}

// GET /api/store/products?store_id=xxx (or __all__ for admin)
export async function GET(req: NextRequest) {
  const storeId = new URL(req.url).searchParams.get('store_id')
  if (!storeId) {
    return NextResponse.json({ data: null, error: 'store_id 필수' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: [], error: null })
  }

  try {
    let query = supabase
      .from('store_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (storeId !== '__all__') {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('store_products query error:', error.message)
      return NextResponse.json({ data: [], error: null })
    }
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}

// POST /api/store/products — 상품 추가
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: null, error: 'Supabase 미설정' }, { status: 500 })
  }

  const body = await req.json()
  const { store_id, name, description, price, original_price, unit, emoji, subcategory, tag, is_available, is_popular, sort_order, image_url } = body

  if (!store_id || !name || price == null) {
    return NextResponse.json({ data: null, error: '필수 항목 누락 (store_id, name, price)' }, { status: 400 })
  }

  // owner는 자기 가게만
  if (role === 'owner') {
    const userId = cookieStore.get('cosmart_user_id')?.value
    if (userId) {
      const ownerStoreId = await getOwnerStoreId(supabase, userId)
      if (ownerStoreId !== store_id) {
        return NextResponse.json({ data: null, error: '본인 가게만 관리 가능' }, { status: 403 })
      }
    }
  }

  const { data, error } = await supabase
    .from('store_products')
    .insert({
      store_id,
      name,
      description: description || '',
      price,
      original_price: original_price || null,
      unit: unit || '개',
      emoji: emoji || '📦',
      subcategory: subcategory || null,
      tag: tag || null,
      is_available: is_available !== false,
      is_popular: is_popular || false,
      sort_order: sort_order || 0,
      image_url: image_url || null,
    })
    .select()
    .single()

  if (error) {
    console.error('product insert error:', error.message)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

// PATCH /api/store/products — 상품 수정
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: null, error: 'Supabase 미설정' }, { status: 500 })
  }

  const body = await req.json()
  const { id, store_id, ...updates } = body

  if (!id) {
    return NextResponse.json({ data: null, error: 'id 필수' }, { status: 400 })
  }

  // owner 권한 체크
  if (role === 'owner') {
    const userId = cookieStore.get('cosmart_user_id')?.value
    if (userId) {
      const ownerStoreId = await getOwnerStoreId(supabase, userId)
      const { data: product } = await supabase.from('store_products').select('store_id').eq('id', id).single()
      if (!product || ownerStoreId !== product.store_id) {
        return NextResponse.json({ data: null, error: '본인 가게 상품만 수정 가능' }, { status: 403 })
      }
    }
  }

  const updateData: any = { updated_at: new Date().toISOString() }
  const allowedFields = ['name', 'description', 'price', 'original_price', 'unit', 'emoji', 'subcategory', 'tag', 'is_available', 'is_popular', 'sort_order', 'image_url']
  for (const f of allowedFields) {
    if (f in updates) updateData[f] = updates[f]
  }

  const { data, error } = await supabase
    .from('store_products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('product update error:', error.message)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

// DELETE /api/store/products?id=xxx
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: null, error: 'Supabase 미설정' }, { status: 500 })
  }

  const productId = new URL(req.url).searchParams.get('id')
  if (!productId) {
    return NextResponse.json({ data: null, error: 'id 필수' }, { status: 400 })
  }

  // owner 권한 체크
  if (role === 'owner') {
    const userId = cookieStore.get('cosmart_user_id')?.value
    if (userId) {
      const ownerStoreId = await getOwnerStoreId(supabase, userId)
      const { data: product } = await supabase.from('store_products').select('store_id').eq('id', productId).single()
      if (!product || ownerStoreId !== product.store_id) {
        return NextResponse.json({ data: null, error: '본인 가게 상품만 삭제 가능' }, { status: 403 })
      }
    }
  }

  const { error } = await supabase
    .from('store_products')
    .delete()
    .eq('id', productId)

  if (error) {
    console.error('product delete error:', error.message)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { deleted: true }, error: null })
}
