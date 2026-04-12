import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/admin/delivery-photo?path=<storage-path>
// 관리자 전용 — 배달 완료 사진 Signed URL 생성 (60초 유효)
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 })
  }

  const path = req.nextUrl.searchParams.get('path')
  if (!path) {
    return NextResponse.json({ error: 'path 파라미터가 필요합니다' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase.storage
    .from('delivery-photos')
    .createSignedUrl(path, 60) // 60초 유효

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || '서명 URL 생성 실패' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
