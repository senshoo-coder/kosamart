import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 일회성: 홈앤미트(butcher)에 한우·한돈 상품 일괄 추가
// 실행 후 이 라우트는 삭제 예정

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const STORE_ID = 'butcher'
const FILE = `products-${STORE_ID}.json`

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

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

async function readProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/config/${FILE}`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function writeProducts(products: Product[]) {
  await fetch(`${SUPA_URL}/storage/v1/object/config/${FILE}`, {
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

type NewProduct = Omit<Product, 'id' | 'store_id' | 'sort_order'>

const NEW_PRODUCTS: NewProduct[] = [
  // ─── 한우 ───
  { name: '한우 등심 ++ 100g',     price: 20000, original_price: null, unit: '100g', emoji: '🥩', subcategory: '한우', tag: null, is_available: true, is_popular: false, image_url: null, description: '한우 1++ 등심' },
  { name: '한우 채끝 ++ 100g',     price: 20000, original_price: null, unit: '100g', emoji: '🥩', subcategory: '한우', tag: null, is_available: true, is_popular: false, image_url: null, description: '한우 1++ 채끝' },
  { name: '한우 안심 ++ 100g',     price: 19000, original_price: null, unit: '100g', emoji: '🥩', subcategory: '한우', tag: null, is_available: true, is_popular: false, image_url: null, description: '한우 1++ 안심' },
  { name: '한우 양지 ++ 100g',     price:  7500, original_price: null, unit: '100g', emoji: '🥩', subcategory: '한우', tag: null, is_available: true, is_popular: false, image_url: null, description: '한우 1++ 양지' },
  { name: '한우 국거리 ++ 100g',   price:  5500, original_price: null, unit: '100g', emoji: '🥩', subcategory: '한우', tag: null, is_available: true, is_popular: false, image_url: null, description: '한우 1++ 국거리용' },
  { name: '한우 불고기 ++ 100g',   price:  5500, original_price: null, unit: '100g', emoji: '🥩', subcategory: '한우', tag: null, is_available: true, is_popular: false, image_url: null, description: '한우 1++ 불고기용' },

  // ─── 한돈 ───
  { name: '한돈 오겹살 100g',      price:  3400, original_price: null, unit: '100g', emoji: '🥓', subcategory: '한돈', tag: null, is_available: true, is_popular: false, image_url: null, description: '한돈 오겹살' },
  { name: '한돈 목살 100g',        price:  3100, original_price: null, unit: '100g', emoji: '🥓', subcategory: '한돈', tag: null, is_available: true, is_popular: false, image_url: null, description: '한돈 목살' },
]

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '관리자 전용' }, { status: 403 })
  }

  const existing = await readProducts()
  const existingNames = new Set(existing.map(p => p.name))

  let nextOrder = existing.reduce((max, p) => Math.max(max, p.sort_order ?? 0), -1) + 1
  const added: string[] = []
  const skipped: string[] = []

  for (const np of NEW_PRODUCTS) {
    if (existingNames.has(np.name)) {
      skipped.push(np.name)
      continue
    }
    existing.push({
      ...np,
      id: crypto.randomUUID(),
      store_id: STORE_ID,
      sort_order: nextOrder++,
    })
    added.push(np.name)
  }

  await writeProducts(existing)

  return NextResponse.json({
    data: {
      requested: NEW_PRODUCTS.length,
      added_count: added.length,
      skipped_count: skipped.length,
      added,
      skipped,
      final_product_count: existing.length,
    },
    error: null,
  })
}
