import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface ImageRecord {
  target_type: string   // 'store' | 'product'
  target_id: string | null
  image_url: string
}

function metaUrl(storeId: string) {
  return `${SUPA_URL}/storage/v1/object/authenticated/config/images-${storeId}.json`
}
function metaUploadUrl(storeId: string) {
  return `${SUPA_URL}/storage/v1/object/config/images-${storeId}.json`
}

async function readMeta(storeId: string): Promise<ImageRecord[]> {
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return []
  try {
    const res = await fetch(metaUrl(storeId), {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function writeMeta(storeId: string, records: ImageRecord[]) {
  await fetch(metaUploadUrl(storeId), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      apikey: SUPA_KEY,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: JSON.stringify(records),
  })
}

// GET /api/store/images?store_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ data: null, error: 'store_id 필수' }, { status: 400 })

  const records = await readMeta(storeId)
  return NextResponse.json({ data: records, error: null })
}

// POST /api/store/images — 이미지 업로드
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) {
    return NextResponse.json({ data: null, error: 'Supabase가 설정되지 않았습니다' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const storeId = formData.get('store_id') as string
  const targetType = formData.get('target_type') as string // 'store' | 'product'
  const targetId = (formData.get('target_id') as string | null) || null

  if (!file || !storeId || !targetType) {
    return NextResponse.json({ data: null, error: '필수 항목 누락 (file, store_id, target_type)' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${storeId}/${targetType}-${targetId || 'main'}-${Date.now()}.${ext}`

  // Upload to store-images bucket
  const uploadRes = await fetch(
    `${SUPA_URL}/storage/v1/object/store-images/${filename}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPA_KEY}`,
        apikey: SUPA_KEY,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: bytes,
    }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    return NextResponse.json({ data: null, error: `업로드 실패: ${err}` }, { status: 500 })
  }

  const imageUrl = `${SUPA_URL}/storage/v1/object/public/store-images/${filename}`

  // Update metadata JSON
  const records = await readMeta(storeId)
  const idx = records.findIndex(r => r.target_type === targetType && r.target_id === targetId)
  const newRecord: ImageRecord = { target_type: targetType, target_id: targetId, image_url: imageUrl }
  if (idx >= 0) {
    records[idx] = newRecord
  } else {
    records.push(newRecord)
  }
  await writeMeta(storeId, records)

  return NextResponse.json({
    data: { image_url: imageUrl, store_id: storeId, target_type: targetType, target_id: targetId },
    error: null,
  })
}

// DELETE /api/store/images?store_id=xxx&target_type=product&target_id=yyy
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('store_id')
  const targetType = searchParams.get('target_type')
  const targetId = searchParams.get('target_id') || null

  if (!storeId || !targetType) {
    return NextResponse.json({ data: null, error: 'store_id, target_type 필수' }, { status: 400 })
  }

  const records = await readMeta(storeId)
  const filtered = records.filter(r => !(r.target_type === targetType && r.target_id === targetId))
  await writeMeta(storeId, filtered)

  return NextResponse.json({ data: { deleted: true }, error: null })
}
