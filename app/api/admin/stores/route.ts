import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const BUCKET = 'config'
const FILE = 'store-settings.json'

export type DisplayStatus = 'visible' | 'hidden' | 'coming_soon'

export interface StoreSetting {
  is_active: boolean       // 후위 호환: visible 또는 coming_soon이면 true
  display_status: DisplayStatus
  sort_order: number
}

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

async function readSettings(): Promise<Record<string, StoreSetting>> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/${BUCKET}/${FILE}`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return {}
    const raw = await res.json()
    return migrate(raw)
  } catch {
    return {}
  }
}

// 옛 포맷: { "store-id": true }
// 새 포맷: { "store-id": { is_active, display_status, sort_order } }
function migrate(raw: any): Record<string, StoreSetting> {
  const out: Record<string, StoreSetting> = {}
  if (!raw || typeof raw !== 'object') return out
  let idx = 0
  for (const [id, val] of Object.entries(raw)) {
    if (typeof val === 'boolean') {
      out[id] = {
        is_active: val,
        display_status: val ? 'visible' : 'hidden',
        sort_order: idx,
      }
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

async function writeSettings(data: Record<string, StoreSetting>) {
  await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${FILE}`, {
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

// GET /api/admin/stores
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })
  }
  const settings = await readSettings()
  const data = Object.entries(settings).map(([store_id, s]) => ({
    store_id,
    is_active: s.is_active,
    display_status: s.display_status,
    sort_order: s.sort_order,
  }))
  return NextResponse.json({ data, error: null })
}

// PUT /api/admin/stores — display_status / sort_order 업데이트
// body: { store_id, display_status?, sort_order?, is_active? (legacy) }
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { store_id } = body

    if (!store_id) {
      return NextResponse.json({ error: 'store_id 필수' }, { status: 400 })
    }

    const current = await readSettings()
    const existing: StoreSetting = current[store_id] || {
      is_active: true,
      display_status: 'visible',
      sort_order: Object.keys(current).length,
    }

    let next: StoreSetting = { ...existing }

    // display_status 우선 처리
    if (body.display_status === 'visible' || body.display_status === 'hidden' || body.display_status === 'coming_soon') {
      next.display_status = body.display_status
      next.is_active = body.display_status !== 'hidden'
    } else if (typeof body.is_active === 'boolean') {
      // 후위 호환: is_active만 들어오면 visible/hidden으로 매핑
      next.is_active = body.is_active
      next.display_status = body.is_active ? 'visible' : 'hidden'
    }

    if (typeof body.sort_order === 'number') {
      next.sort_order = body.sort_order
    }

    current[store_id] = next
    await writeSettings(current)
    return NextResponse.json({ data: { store_id, ...next }, error: null })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/admin/stores — 일괄 sort_order 재번호 (배치 업데이트)
// body: { orders: [{ store_id, sort_order }] }
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const orders: Array<{ store_id: string; sort_order: number }> = body.orders || []
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'orders 배열 필수' }, { status: 400 })
    }
    const current = await readSettings()
    for (const { store_id, sort_order } of orders) {
      if (!store_id || typeof sort_order !== 'number') continue
      const existing: StoreSetting = current[store_id] || {
        is_active: true,
        display_status: 'visible',
        sort_order,
      }
      current[store_id] = { ...existing, sort_order }
    }
    await writeSettings(current)
    return NextResponse.json({ data: { updated: orders.length }, error: null })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
