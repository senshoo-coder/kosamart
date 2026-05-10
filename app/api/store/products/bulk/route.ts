import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { STORES } from '@/lib/market-data'

// POST /api/store/products/bulk
// body: { store_id: string, products: Array<NewProduct> }
//
// 동작: 기존 상품 보존, 이름 일치 시 건너뛰기 (idempotent)
// 권한: admin 전체, owner는 본인 가게만

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

async function getOwnerStoreId(): Promise<string | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('cosmart_user_id')?.value
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' || !userId) return null
  if (DEMO_OWNER_STORES[userId]) return DEMO_OWNER_STORES[userId]
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return null
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(SUPA_URL, SUPA_KEY)
    const { data } = await sb.from('users').select('store_id').eq('id', userId).single()
    return data?.store_id ?? null
  } catch { return null }
}

async function readProducts(storeId: string): Promise<Product[]> {
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return []
  try {
    const res = await fetch(
      `${SUPA_URL}/storage/v1/object/authenticated/config/products-${storeId}.json`,
      { headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function writeProducts(storeId: string, products: Product[]) {
  await fetch(`${SUPA_URL}/storage/v1/object/config/products-${storeId}.json`, {
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

export async function POST(req: NextRequest) {
  // 1. 권한 체크
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ data: null, error: '잘못된 요청' }, { status: 400 })

  const { store_id, products } = body as { store_id: string; products: any[] }
  if (!store_id) return NextResponse.json({ data: null, error: 'store_id 필수' }, { status: 400 })
  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ data: null, error: 'products 배열 필수' }, { status: 400 })
  }
  if (products.length > 500) {
    return NextResponse.json({ data: null, error: '한 번에 500개 이하만 등록 가능합니다' }, { status: 400 })
  }

  // 2. owner는 본인 가게만
  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    if (!ownerStoreId || ownerStoreId !== store_id) {
      return NextResponse.json({ data: null, error: '본인 가게만 관리 가능' }, { status: 403 })
    }
  }

  // 3. store_id 유효성 (정적 + 커스텀 모두 허용)
  const isStaticStore = STORES.some(s => s.id === store_id)
  // 커스텀 가게 검증은 생략 (admin이 알아서 옳은 ID 사용)
  // 정적 가게 ID와 다른데 admin이 아니면 차단
  if (!isStaticStore && role !== 'admin') {
    return NextResponse.json({ data: null, error: '알 수 없는 가게 ID' }, { status: 400 })
  }

  // 4. 기존 상품 로드
  const existing = await readProducts(store_id)
  const existingNames = new Set(existing.map(p => p.name.trim()))
  let nextOrder = existing.reduce((m, p) => Math.max(m, p.sort_order ?? 0), -1) + 1

  // 5. 각 상품 검증·추가
  const added: string[] = []
  const skipped: { name: string; reason: string }[] = []
  const errors: { row: number; name: string; reason: string }[] = []

  products.forEach((row: any, i: number) => {
    const rowNum = i + 2 // 엑셀 기준 (1행은 헤더)
    const name = String(row.name ?? '').trim()
    if (!name) {
      errors.push({ row: rowNum, name: '(빈 행)', reason: '상품명 누락' })
      return
    }
    const price = Number(row.price)
    if (!Number.isFinite(price) || price < 0) {
      errors.push({ row: rowNum, name, reason: '가격이 숫자가 아니거나 0 미만' })
      return
    }
    const originalPrice = row.original_price != null && row.original_price !== ''
      ? Number(row.original_price) : null
    if (originalPrice != null && (!Number.isFinite(originalPrice) || originalPrice < 0)) {
      errors.push({ row: rowNum, name, reason: '정가가 숫자가 아니거나 0 미만' })
      return
    }
    if (name.length > 100) {
      errors.push({ row: rowNum, name, reason: '상품명이 너무 깁니다 (100자 초과)' })
      return
    }
    if (existingNames.has(name)) {
      skipped.push({ name, reason: '이미 존재' })
      return
    }
    // 중복 행 체크 (엑셀 안 자체에 같은 이름)
    if (added.includes(name)) {
      skipped.push({ name, reason: '엑셀 내 중복' })
      return
    }

    existing.push({
      id: crypto.randomUUID(),
      store_id,
      name,
      description: String(row.description ?? '').trim().slice(0, 500),
      price,
      original_price: originalPrice,
      unit: String(row.unit ?? '개').trim().slice(0, 20) || '개',
      emoji: String(row.emoji ?? '📦').trim().slice(0, 4) || '📦',
      subcategory: row.subcategory ? String(row.subcategory).trim().slice(0, 50) : null,
      tag: row.tag ? String(row.tag).trim().slice(0, 50) : null,
      is_available: row.is_available !== false,
      is_popular: !!row.is_popular,
      sort_order: nextOrder++,
      image_url: row.image_url ? String(row.image_url).trim() : null,
    })
    added.push(name)
    existingNames.add(name)
  })

  // 6. 모두 검증 통과한 것만 저장
  if (added.length > 0) {
    await writeProducts(store_id, existing)
  }

  return NextResponse.json({
    data: {
      added_count: added.length,
      skipped_count: skipped.length,
      error_count: errors.length,
      added,
      skipped,
      errors,
      final_product_count: existing.length,
    },
    error: null,
  })
}
