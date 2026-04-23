import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 413 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다 (JPEG, PNG, WebP, GIF)' }, { status: 415 })
    }

    const supabase = await createAdminClient()

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
