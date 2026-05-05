import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 일회성 마이그레이션 엔드포인트
// 평창동 상점가 가게 명단 업데이트 (2026.05.05)
// 실행 후 이 라우트는 삭제 예정

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const STORES_CONFIG_FILE = 'stores-config.json'
const STORE_SETTINGS_FILE = 'store-settings.json'

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

async function readJSON(filename: string): Promise<any> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/config/${filename}`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

async function writeJSON(filename: string, data: any) {
  await fetch(`${SUPA_URL}/storage/v1/object/config/${filename}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      apikey: SUPA_KEY,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: JSON.stringify(data),
  })
}

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '관리자 전용' }, { status: 403 })
  }

  // 1. stores-config.json 업데이트 (이름 변경 + 커스텀 가게 추가)
  const config = await readJSON(STORES_CONFIG_FILE)
  config.overrides = config.overrides || {}
  config.custom = config.custom || []
  config.deleted = config.deleted || []

  // 1-1. 기존 정적 가게 이름 변경 (overrides)
  config.overrides['central-super'] = { ...config.overrides['central-super'], name: '코사마트 평창점' }
  config.overrides['butcher']       = { ...config.overrides['butcher'],       name: '홈앤미트' }
  config.overrides['chicken']       = { ...config.overrides['chicken'],       name: '페리카나' }
  config.overrides['banchan']       = { ...config.overrides['banchan'],       name: '옥김치' }
  config.overrides['bakery']        = { ...config.overrides['bakery'],        name: '베이커리' }
  // 본죽은 이름 그대로

  // 1-2. 신규 커스텀 가게 추가 (id 충돌 시 업데이트)
  function upsertCustom(store: any) {
    const idx = config.custom.findIndex((s: any) => s.id === store.id)
    if (idx >= 0) config.custom[idx] = { ...config.custom[idx], ...store }
    else config.custom.push(store)
  }

  upsertCustom({
    id: 'okkimchi-dosirak',
    name: '옥김치',
    emoji: '🍱',
    category: '도시락',
    description: '매일 만드는 신선한 도시락',
    isOpen: true,
    badge: '',
    hours: '09:00~21:00',
    minOrder: 15000,
    deliveryFee: 0,
    accentColor: '#10b981',
  })

  upsertCustom({
    id: 'bunsik',
    name: '분식',
    emoji: '🍜',
    category: '기타',
    description: '곧 만나요!',
    isOpen: true,
    badge: '',
    hours: '11:00~22:00',
    minOrder: 10000,
    deliveryFee: 2000,
    accentColor: '#e29100',
  })

  await writeJSON(STORES_CONFIG_FILE, config)

  // 2. store-settings.json 업데이트 (display_status + sort_order)
  // 새 포맷으로 일괄 작성 (옛 boolean 형식 자동 마이그레이션)
  const settings: Record<string, { is_active: boolean; display_status: string; sort_order: number }> = {
    'central-super':     { is_active: true,  display_status: 'visible',     sort_order: 0 },
    'butcher':           { is_active: true,  display_status: 'visible',     sort_order: 1 },
    'chicken':           { is_active: true,  display_status: 'visible',     sort_order: 2 },
    'banchan':           { is_active: true,  display_status: 'visible',     sort_order: 3 },
    'okkimchi-dosirak':  { is_active: true,  display_status: 'visible',     sort_order: 4 },
    'bunsik':            { is_active: true,  display_status: 'coming_soon', sort_order: 5 },
    'bakery':            { is_active: true,  display_status: 'coming_soon', sort_order: 6 },
    'bonjuk':            { is_active: true,  display_status: 'coming_soon', sort_order: 7 },
    'hamburger':         { is_active: false, display_status: 'hidden',      sort_order: 99 },
  }

  // 기존 설정 유지(다른 가게)하면서 위 항목만 덮어쓰기
  const existing = await readJSON(STORE_SETTINGS_FILE)
  const merged = { ...existing, ...settings }
  await writeJSON(STORE_SETTINGS_FILE, merged)

  return NextResponse.json({
    data: {
      stores_renamed: ['central-super', 'butcher', 'chicken', 'banchan', 'bakery'],
      stores_added: ['okkimchi-dosirak', 'bunsik'],
      hidden: ['hamburger'],
      coming_soon: ['bunsik', 'bakery', 'bonjuk'],
      total_visible: 5,
      total_coming_soon: 3,
      total_hidden: 1,
    },
    error: null,
  })
}
