import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  const userId = cookieStore.get('cosmart_user_id')?.value
  if (role !== 'driver' && role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const deliveryId = formData.get('deliveryId') as string | null

    if (!file || !deliveryId) {
      return NextResponse.json({ error: '파일 또는 배달 ID 없음' }, { status: 400 })
    }
    // 경로 traversal 방지: UUID 형식만 허용
    if (!ID_PATTERN.test(deliveryId)) {
      return NextResponse.json({ error: '잘못된 배달 ID' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 413 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다 (JPEG, PNG, WebP, GIF)' }, { status: 415 })
    }

    const supabase = await createAdminClient()

    // 소유권 검증: 배달맨은 본인에게 배정된 배달건만 사진 업로드 가능
    if (role === 'driver') {
      if (!userId) {
        return NextResponse.json({ error: '인증 정보 없음' }, { status: 401 })
      }
      const { data: delivery } = await supabase
        .from('deliveries')
        .select('id, driver_id, status')
        .eq('id', deliveryId)
        .single()
      if (!delivery) {
        return NextResponse.json({ error: '배달건을 찾을 수 없습니다' }, { status: 404 })
      }
      if (delivery.driver_id !== userId) {
        return NextResponse.json({ error: '본인 배달건만 사진 업로드 가능' }, { status: 403 })
      }
    }

    // 확장자는 MIME에서 결정 (파일명 신뢰 안 함, path traversal·확장자 위조 방지)
    const ext = MIME_TO_EXT[file.type] || 'jpg'
    const path = `${deliveryId}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error } = await supabase.storage
      .from('delivery-photos')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Public URL 대신 storage path만 반환 — 버킷은 Private으로 설정
    return NextResponse.json({ path })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
