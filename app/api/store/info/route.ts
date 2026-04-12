import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const DEMO_OWNER_STORES: Record<string, string> = {
  'demo-owner-001': 'central-super',
  'demo-owner-002': 'banchan',
  'demo-owner-003': 'butcher',
  'demo-owner-004': 'bonjuk',
  'demo-owner-005': 'chicken',
  'demo-owner-006': 'bakery',
}

const FILE_URL = `${SUPA_URL}/storage/v1/object/authenticated/config/stores-config.json`
const UPLOAD_URL = `${SUPA_URL}/storage/v1/object/config/stores-config.json`

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

async function readConfig() {
  try {
    const res = await fetch(FILE_URL, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return { overrides: {}, custom: [], deleted: [] }
    return await res.json()
  } catch { return { overrides: {}, custom: [], deleted: [] } }
}

async function writeConfig(data: any) {
  await fetch(UPLOAD_URL, {
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

// PATCH /api/store/info — owner가 자신의 가게 영업정보 수정
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  const body = await req.json()
  const { store_id, ...fields } = body

  // owner는 자신의 가게만 수정 가능
  let targetStoreId = store_id
  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    if (!ownerStoreId) return NextResponse.json({ error: '가게 정보를 찾을 수 없습니다' }, { status: 403 })
    targetStoreId = ownerStoreId
  }

  // owner가 수정 가능한 필드만 허용
  const ALLOWED = ['name', 'description', 'hours', 'minOrder', 'deliveryFee', 'isOpen', 'bank_account', 'telegram_chat_id']
  const filtered: Record<string, any> = {}
  for (const f of ALLOWED) {
    if (f in fields) filtered[f] = fields[f]
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  const config = await readConfig()
  const customIdx = config.custom?.findIndex((s: any) => s.id === targetStoreId) ?? -1
  if (customIdx >= 0) {
    config.custom[customIdx] = { ...config.custom[customIdx], ...filtered }
  } else {
    config.overrides = config.overrides || {}
    config.overrides[targetStoreId] = { ...config.overrides[targetStoreId], ...filtered }
  }
  await writeConfig(config)

  return NextResponse.json({ data: { store_id: targetStoreId, ...filtered }, error: null })
}
