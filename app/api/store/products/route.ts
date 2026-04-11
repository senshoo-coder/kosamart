import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { STORES } from '@/lib/market-data'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface Product {
  id: string
  store_id: string
  name: string
  description: string
  price: number
  original_price: number | null
  unit: string
  emoji: string
  subcategory: string | null
  tag: string | null
  is_available: boolean
  is_popular: boolean
  sort_order: number
  image_url: string | null
}

const DEMO_OWNER_STORES: Record<string, string> = {
  'demo-owner-001': 'central-super',
  'demo-owner-002': 'banchan',
  'demo-owner-003': 'butcher',
  'demo-owner-004': 'bonjuk',
  'demo-owner-005': 'chicken',
  'demo-owner-006': 'bakery',
}

function fileUrl(storeId: string) {
  return `${SUPA_URL}/storage/v1/object/authenticated/config/products-${storeId}.json`
}
function uploadUrl(storeId: string) {
  return `${SUPA_URL}/storage/v1/object/config/products-${storeId}.json`
}

async function readProducts(storeId: string): Promise<Product[]> {
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return getStaticProducts(storeId)
  try {
    const res = await fetch(fileUrl(storeId), {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return getStaticProducts(storeId)
    const data = await res.json()
    return Array.isArray(data) ? data : getStaticProducts(storeId)
  } catch {
    return getStaticProducts(storeId)
  }
}

async function writeProducts(storeId: string, products: Product[]) {
  await fetch(uploadUrl(storeId), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      apikey: SUPA_KEY,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: JSON.stringify(products),
  })
}

function getStaticProducts(storeId: string): Product[] {
  const store = STORES.find(s => s.id === storeId)
  if (!store) return []
  return store.products.map((p, i) => ({
    id: p.id,
    store_id: storeId,
    name: p.name,
    description: p.description,
    price: p.price,
    original_price: p.originalPrice || null,
    unit: p.unit,
    emoji: p.emoji,
    subcategory: p.subcategory || null,
    tag: p.tag || null,
    is_available: p.isAvailable,
    is_popular: p.isPopular || false,
    sort_order: i,
    image_url: null,
  }))
}

async function getOwnerStoreId(): Promise<string | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('cosmart_user_id')?.value
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' || !userId) return null
  if (DEMO_OWNER_STORES[userId]) return DEMO_OWNER_STORES[userId]
  // DB fallback
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return null
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(SUPA_URL, SUPA_KEY)
    const { data } = await sb.from('users').select('store_id').eq('id', userId).single()
    return data?.store_id ?? null
  } catch { return null }
}

// GET /api/store/products?store_id=xxx (or __all__)
export async function GET(req: NextRequest) {
  const storeId = new URL(req.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ data: null, error: 'store_id 필수' }, { status: 400 })

  if (storeId === '__all__') {
    const all = await Promise.all(STORES.map(s => readProducts(s.id)))
    return NextResponse.json({ data: all.flat(), error: null })
  }

  const products = await readProducts(storeId)
  return NextResponse.json({ data: products, error: null })
}

// POST /api/store/products — 상품 추가
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const body = await req.json()
  const { store_id, name, description, price, original_price, unit, emoji,
    subcategory, tag, is_available, is_popular, sort_order, image_url } = body

  if (!store_id || !name || price == null) {
    return NextResponse.json({ data: null, error: '필수 항목 누락 (store_id, name, price)' }, { status: 400 })
  }

  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    if (ownerStoreId !== store_id) {
      return NextResponse.json({ data: null, error: '본인 가게만 관리 가능' }, { status: 403 })
    }
  }

  const products = await readProducts(store_id)
  const newProduct: Product = {
    id: crypto.randomUUID(),
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
    sort_order: sort_order ?? products.length,
    image_url: image_url || null,
  }
  products.push(newProduct)
  await writeProducts(store_id, products)
  return NextResponse.json({ data: newProduct, error: null })
}

// PATCH /api/store/products — 상품 수정 (is_available 토글 포함)
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const body = await req.json()
  const { id, store_id, ...updates } = body
  if (!id) return NextResponse.json({ data: null, error: 'id 필수' }, { status: 400 })

  // store_id 결정: body에서 받거나 owner 자신의 store
  let targetStoreId = store_id
  if (!targetStoreId && role === 'owner') {
    targetStoreId = await getOwnerStoreId()
  }
  if (!targetStoreId) {
    // id로 store 찾기 (정적 데이터에서)
    for (const s of STORES) {
      if (s.products.find(p => p.id === id)) { targetStoreId = s.id; break }
    }
  }
  if (!targetStoreId) return NextResponse.json({ data: null, error: 'store_id를 찾을 수 없습니다' }, { status: 400 })

  let products = await readProducts(targetStoreId)
  const idx = products.findIndex(p => p.id === id)

  if (idx < 0) {
    // 정적 데이터에 있지만 Storage에 없는 경우 → 초기화 후 저장
    const staticProds = getStaticProducts(targetStoreId)
    const staticIdx = staticProds.findIndex(p => p.id === id)
    if (staticIdx < 0) return NextResponse.json({ data: null, error: '상품을 찾을 수 없습니다' }, { status: 404 })
    // 정적 데이터로 초기화하고 업데이트
    products = staticProds
    products[staticIdx] = { ...products[staticIdx], ...updates }
    await writeProducts(targetStoreId, products)
    return NextResponse.json({ data: products[staticIdx], error: null })
  }

  const allowedFields = ['name', 'description', 'price', 'original_price', 'unit', 'emoji',
    'subcategory', 'tag', 'is_available', 'is_popular', 'sort_order', 'image_url']
  for (const f of allowedFields) {
    if (f in updates) (products[idx] as any)[f] = updates[f]
  }
  await writeProducts(targetStoreId, products)
  return NextResponse.json({ data: products[idx], error: null })
}

// DELETE /api/store/products?id=xxx
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('id')
  const storeIdParam = searchParams.get('store_id')
  if (!productId) return NextResponse.json({ data: null, error: 'id 필수' }, { status: 400 })

  let targetStoreId = storeIdParam
  if (!targetStoreId && role === 'owner') targetStoreId = await getOwnerStoreId()
  if (!targetStoreId) {
    for (const s of STORES) {
      if (s.products.find(p => p.id === productId)) { targetStoreId = s.id; break }
    }
  }
  if (!targetStoreId) return NextResponse.json({ data: null, error: 'store_id를 찾을 수 없습니다' }, { status: 400 })

  let products = await readProducts(targetStoreId)
  const before = products.length
  products = products.filter(p => p.id !== productId)

  if (products.length === before) {
    // 정적 데이터에서 초기화 후 삭제
    products = getStaticProducts(targetStoreId).filter(p => p.id !== productId)
  }

  await writeProducts(targetStoreId, products)
  return NextResponse.json({ data: { deleted: true }, error: null })
}
