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

type DisplayStatus = 'visible' | 'hidden' | 'coming_soon'
interface StoreSetting { is_active: boolean; display_status: DisplayStatus; sort_order: number }

function migrateSettings(raw: any): Record<string, StoreSetting> {
  const out: Record<string, StoreSetting> = {}
  if (!raw || typeof raw !== 'object') return out
  let idx = 0
  for (const [id, val] of Object.entries(raw)) {
    if (typeof val === 'boolean') {
      out[id] = { is_active: val, display_status: val ? 'visible' : 'hidden', sort_order: idx }
    } else if (val && typeof val === 'object') {
      const v = val as any
      const display_status: DisplayStatus =
        v.display_status === 'hidden' || v.display_status === 'coming_soon'
          ? v.display_status
          : (v.is_active === false ? 'hidden' : 'visible')
      out[id] = {
        is_active: display_status !== 'hidden',
        display_status,
        sort_order: typeof v.sort_order === 'number' ? v.sort_order : idx,
      }
    }
    idx++
  }
  return out
}

// GET /api/market/stores — 고객용 머지된 가게 목록
export async function GET() {
  const [storeSettings, storesConfig] = await Promise.all([
    fetchJSON('store-settings.json'),
    fetchJSON('stores-config.json'),
  ])

  const settings = migrateSettings(storeSettings)

  const deleted: string[] = storesConfig?.deleted || []
  const overrides: Record<string, any> = storesConfig?.overrides || {}
  const custom: any[] = storesConfig?.custom || []

  function settingFor(id: string, fallbackOrder: number): StoreSetting {
    return settings[id] ?? { is_active: true, display_status: 'visible', sort_order: fallbackOrder }
  }

  // 정적 데이터 + 오버라이드 머지
  const baseStores = STORES
    .filter(s => !deleted.includes(s.id))
    .map((s, i) => {
      const setting = settingFor(s.id, i)
      return {
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
        is_active: setting.is_active,
        display_status: setting.display_status,
        sort_order: setting.sort_order,
        isCustom: false,
        ...overrides[s.id],
      }
    })
    .map(s => ({ ...s, isOpen: computeIsOpen(s) }))

  // 커스텀 가게 추가
  const customStores = custom
    .filter(s => !deleted.includes(s.id))
    .map((s, i) => {
      const setting = settingFor(s.id, STORES.length + i)
      return {
        ...s,
        is_active: setting.is_active,
        display_status: setting.display_status,
        sort_order: setting.sort_order,
        isCustom: true,
      }
    })
    .map(s => ({ ...s, isOpen: computeIsOpen(s) }))

  // sort_order 기준으로 정렬 (오름차순)
  const merged = [...baseStores, ...customStores].sort(
    (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
  )

  return NextResponse.json({ data: merged, error: null })
}
