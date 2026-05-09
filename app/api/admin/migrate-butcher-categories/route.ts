import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 일회성: 홈앤미트 카테고리 정리
// 돼지고기 → 한돈, 소고기 → 한우, 닭볶음탕용 토막 → 닭고기 (신규)

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

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '관리자 전용' }, { status: 403 })
  }

  const products = await readProducts()
  const changes: { name: string; from: string; to: string }[] = []

  for (const p of products) {
    const isChicken = p.name.includes('닭볶음탕') || p.name.includes('닭고기')
    if (isChicken) {
      if (p.subcategory !== '닭고기') {
        changes.push({ name: p.name, from: p.subcategory ?? '(없음)', to: '닭고기' })
        p.subcategory = '닭고기'
        // 닭고기는 이모지도 닭으로
        if (p.emoji === '🥩' || p.emoji === '🥓') p.emoji = '🍗'
      }
    } else if (p.subcategory === '돼지고기') {
      changes.push({ name: p.name, from: '돼지고기', to: '한돈' })
      p.subcategory = '한돈'
    } else if (p.subcategory === '소고기') {
      changes.push({ name: p.name, from: '소고기', to: '한우' })
      p.subcategory = '한우'
    }
  }

  await writeProducts(products)

  // 결과 카테고리 카운트
  const counts: Record<string, number> = {}
  products.forEach(p => {
    const k = p.subcategory ?? '(미분류)'
    counts[k] = (counts[k] || 0) + 1
  })

  return NextResponse.json({
    data: {
      changed_count: changes.length,
      changes,
      final_categories: counts,
      total: products.length,
    },
    error: null,
  })
}
