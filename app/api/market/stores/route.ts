import { NextResponse } from 'next/server'
import { STORES } from '@/lib/market-data'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function fetchJSON(path: string) {
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return null
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/config/${path}`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function computeIsOpen(store: any): boolean {
  if (!store.isOpen) return false
  if (!store.hours) return true
  const now = new Date()
  const h = now.getHours()
  const m = (store.hours as string).match(/^(\d{1,2}):\d{2}~(\d{1,2}):\d{2}$/)
  if (!m) return true
  const start = parseInt(m[1]), end = parseInt(m[2])
  if (h < start || h >= end) return false
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const today = dayKeys[now.getDay()]
  if (store.weekly_closed?.includes(today)) return false
  const todayStr = now.toISOString().slice(0, 10)
  if (store.closed_dates?.includes(todayStr)) return false
  return true
}

// GET /api/market/stores — 고객용 머지된 가게 목록
export async function GET() {
  const [storeSettings, storesConfig] = await Promise.all([
    fetchJSON('store-settings.json'),
    fetchJSON('stores-config.json'),
  ])

  const activeMap: Record<string, boolean> = {}
  if (storeSettings) {
    Object.entries(storeSettings as Record<string, boolean>).forEach(([id, v]) => { activeMap[id] = v })
  }

  const deleted: string[] = storesConfig?.deleted || []
  const overrides: Record<string, any> = storesConfig?.overrides || {}
  const custom: any[] = storesConfig?.custom || []

  // 정적 데이터 + 오버라이드 머지
  const baseStores = STORES
    .filter(s => !deleted.includes(s.id))
    .map(s => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      category: s.category,
      description: s.description,
      isOpen: s.isOpen,
      badge: s.badge,
      hours: s.hours,
      minOrder: s.minOrder,
      deliveryFee: s.deliveryFee,
      accentColor: s.accentColor,
      is_active: activeMap[s.id] !== undefined ? activeMap[s.id] : true,
      isCustom: false,
      ...overrides[s.id],
    }))
    .map(s => ({ ...s, isOpen: computeIsOpen(s) }))

  // 커스텀 가게 추가
  const customStores = custom
    .filter(s => !deleted.includes(s.id))
    .map(s => ({
      ...s,
      is_active: activeMap[s.id] !== undefined ? activeMap[s.id] : true,
      isCustom: true,
    }))
    .map(s => ({ ...s, isOpen: computeIsOpen(s) }))

  return NextResponse.json({ data: [...baseStores, ...customStores], error: null })
}
