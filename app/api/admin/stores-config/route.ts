import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const FILE_URL = `${SUPA_URL}/storage/v1/object/authenticated/config/stores-config.json`
const UPLOAD_URL = `${SUPA_URL}/storage/v1/object/config/stores-config.json`

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

export interface StoresConfig {
  overrides: Record<string, Partial<StoreData>>
  custom: StoreData[]
  deleted: string[]
}

export interface StoreData {
  id: string
  name: string
  emoji: string
  category: string
  description: string
  isOpen: boolean
  badge?: string
  hours?: string
  minOrder: number
  deliveryFee: number
  accentColor: string
  bank_account?: string  // 계좌이체 정보 (예: "국민은행 123-456-789012 (홍길동)")
}

async function readConfig(): Promise<StoresConfig> {
  try {
    const res = await fetch(FILE_URL, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return { overrides: {}, custom: [], deleted: [] }
    return await res.json()
  } catch {
    return { overrides: {}, custom: [], deleted: [] }
  }
}

async function writeConfig(data: StoresConfig) {
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

// GET — 전체 config 조회
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const config = await readConfig()
  return NextResponse.json({ data: config, error: null })
}

// POST — 새 가게 추가
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const store: StoreData = await req.json()
  if (!store.id || !store.name) return NextResponse.json({ error: 'id, name 필수' }, { status: 400 })

  const config = await readConfig()
  if (config.custom.find(s => s.id === store.id)) {
    return NextResponse.json({ error: '이미 존재하는 ID입니다' }, { status: 409 })
  }
  config.custom.push(store)
  config.deleted = config.deleted.filter(d => d !== store.id)
  await writeConfig(config)
  return NextResponse.json({ data: store, error: null })
}

// PATCH — 기존 가게 수정 (정적 → overrides, 커스텀 → custom 배열 직접 수정)
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const config = await readConfig()
  const customIdx = config.custom.findIndex(s => s.id === id)
  if (customIdx >= 0) {
    config.custom[customIdx] = { ...config.custom[customIdx], ...fields }
  } else {
    config.overrides[id] = { ...config.overrides[id], ...fields }
  }
  await writeConfig(config)
  return NextResponse.json({ data: { id, ...fields }, error: null })
}

// DELETE — 가게 삭제 (커스텀은 완전 제거, 정적은 deleted 목록에 추가)
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { id, isCustom } = await req.json()
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const config = await readConfig()
  if (isCustom) {
    config.custom = config.custom.filter(s => s.id !== id)
  } else {
    if (!config.deleted.includes(id)) config.deleted.push(id)
  }
  await writeConfig(config)
  return NextResponse.json({ data: { id }, error: null })
}
