import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const deliveryId = formData.get('deliveryId') as string | null

    if (!file || !deliveryId) {
      return NextResponse.json({ error: '파일 또는 배달 ID 없음' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const ext = file.name.split('.').pop() ?? 'jpg'
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
