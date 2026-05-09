import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 일회성: 코사마트 평창점에 동영방앗간·보성농협·신영김치·유기농 상품 일괄 추가
// 실행 후 이 라우트는 삭제 예정

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const STORE_ID = 'central-super'
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
  // ─── 동영방앗간 ───
  { name: '국산 참기름 350ml',                  price: 39000, original_price: null, unit: '병', emoji: '🫒', subcategory: '동영방앗간', tag: null, is_available: true, is_popular: false, image_url: null, description: '동영방앗간 국산 참깨로 짠 참기름' },
  { name: '국산 들기름 350ml',                  price: 25000, original_price: null, unit: '병', emoji: '🫒', subcategory: '동영방앗간', tag: null, is_available: true, is_popular: false, image_url: null, description: '동영방앗간 국산 들기름' },
  { name: '국산 생들기름 350ml',                price: 28000, original_price: null, unit: '병', emoji: '🫒', subcategory: '동영방앗간', tag: null, is_available: true, is_popular: false, image_url: null, description: '저온 압착 생들기름' },
  { name: '중국산 흑참기름 (국내제조) 350ml',   price: 18000, original_price: null, unit: '병', emoji: '🫒', subcategory: '동영방앗간', tag: null, is_available: true, is_popular: false, image_url: null, description: '중국산 원료, 국내 제조 흑참기름' },

  // ─── 보성농협 (국산 잡곡) ───
  { name: '찹쌀 1kg',          price: 7500,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 찹쌀 (보성농협)' },
  { name: '현미 1kg',          price: 5500,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 현미 (보성농협)' },
  { name: '찰현미 1kg',        price: 7500,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 찰현미 (보성농협)' },
  { name: '찰보리 1kg',        price: 7500,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 찰보리 (보성농협)' },
  { name: '늘보리 1kg',        price: 6500,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 늘보리 (보성농협)' },
  { name: '깐녹두 500g',       price: 14500, original_price: null, unit: '팩', emoji: '🫘', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 깐녹두 (보성농협)' },
  { name: '율무 500g',         price: 12800, original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 율무 (보성농협)' },
  { name: '백태 500g',         price: 6500,  original_price: null, unit: '팩', emoji: '🫘', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 백태 (보성농협)' },
  { name: '서리태 500g',       price: 10500, original_price: null, unit: '팩', emoji: '🫘', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 서리태 (보성농협)' },
  { name: '적두 500g',         price: 18500, original_price: null, unit: '팩', emoji: '🫘', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 적두 (보성농협)' },
  { name: '청차조 500g',       price: 11500, original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 청차조 (보성농협)' },
  { name: '찰기장 500g',       price: 11200, original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 찰기장 (보성농협)' },
  { name: '찰수수 500g',       price: 7800,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 찰수수 (보성농협)' },
  { name: '찰흑미 1kg',        price: 7500,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 찰흑미 (보성농협)' },
  { name: '귀리 500g',         price: 4800,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 귀리 (보성농협)' },
  { name: '혼합10곡 1kg',      price: 9200,  original_price: null, unit: '팩', emoji: '🌾', subcategory: '보성농협', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산 혼합10곡 (보성농협)' },

  // ─── 신영김치 (국산재료) ───
  { name: '배추포기김치 3kg',  price: 27000, original_price: null, unit: '팩', emoji: '🥬', subcategory: '신영김치', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산재료 사용, 신영김치' },
  { name: '총각김치 3kg',      price: 24000, original_price: null, unit: '팩', emoji: '🥬', subcategory: '신영김치', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산재료 사용, 신영김치' },
  { name: '쪽파김치 1.5kg',    price: 39000, original_price: null, unit: '팩', emoji: '🥬', subcategory: '신영김치', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산재료 사용, 신영김치' },
  { name: '갓김치 1.5kg',      price: 15000, original_price: null, unit: '팩', emoji: '🥬', subcategory: '신영김치', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산재료 사용, 신영김치' },
  { name: '열무김치 1.5kg',    price: 11000, original_price: null, unit: '팩', emoji: '🥬', subcategory: '신영김치', tag: null, is_available: true, is_popular: false, image_url: null, description: '국산재료 사용, 신영김치' },

  // ─── 유기농 ───
  { name: '유기농 상하우유 750ml',                price: 4700, original_price: null, unit: '팩', emoji: '🥛', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 우유' },
  { name: '유기농 상하저지방우유 750ml',          price: 4900, original_price: null, unit: '팩', emoji: '🥛', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 저지방 우유' },
  { name: '상하 유기농우유 125ml×4입',            price: 5000, original_price: null, unit: '세트', emoji: '🥛', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 우유, 4팩 세트' },
  { name: '상하 유기농우유 딸기맛 125ml×4입',     price: 5000, original_price: null, unit: '세트', emoji: '🍓', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 딸기맛 우유, 4팩' },
  { name: '상하 유기농우유 코코아맛 125ml×4입',   price: 5000, original_price: null, unit: '세트', emoji: '🍫', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 코코아맛 우유, 4팩' },
  { name: '상하 유기농우유 바닐라맛 125ml×4입',   price: 5000, original_price: null, unit: '세트', emoji: '🍦', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 바닐라맛 우유, 4팩' },
  { name: '상하목장 유기농 요거트 450g',          price: 4300, original_price: null, unit: '팩', emoji: '🥛', subcategory: '유기농', tag: null, is_available: true, is_popular: false, image_url: null, description: '상하목장 유기농 요거트' },
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
      total_visible_in_request: NEW_PRODUCTS.length,
      added_count: added.length,
      skipped_count: skipped.length,
      added,
      skipped,
      final_product_count: existing.length,
    },
    error: null,
  })
}
