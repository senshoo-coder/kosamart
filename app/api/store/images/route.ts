import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseBrowserClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const hasSupabase = SUPABASE_URL?.startsWith('https') && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)

function getSupabase() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !key) return null
  return createSupabaseBrowserClient(SUPABASE_URL, key)
}

// GET /api/store/images?store_id=xxx — 가게 이미지 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ data: null, error: 'store_id 필수' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: [], error: null })
  }

  try {
    const { data, error } = await supabase
      .from('store_images')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) {
      // 테이블이 없을 수 있음 — 빈 배열 반환
      console.error('store_images query error:', error.message)
      return NextResponse.json({ data: [], error: null })
    }
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}

// POST /api/store/images — 이미지 업로드
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: null, error: 'Supabase가 설정되지 않았습니다. 환경변수를 확인하세요.' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const storeId = formData.get('store_id') as string
  const targetType = formData.get('target_type') as string
  const targetId = formData.get('target_id') as string | null

  if (!file || !storeId || !targetType) {
    return NextResponse.json({ data: null, error: '필수 항목 누락' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${storeId}/${targetType}-${targetId || 'main'}-${Date.now()}.${ext}`

  // Supabase Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from('store-images')
    .upload(filename, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('Storage upload error:', uploadError.message)
    // 버킷이 없으면 자동 생성 시도
    if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
      return NextResponse.json({
        data: null,
        error: 'Storage 버킷이 없습니다. Supabase 대시보드 > Storage에서 "store-images" 버킷을 public으로 생성하세요.',
      }, { status: 500 })
    }
    return NextResponse.json({ data: null, error: `업로드 실패: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('store-images').getPublicUrl(filename)
  const imageUrl = urlData.publicUrl

  // DB에 메타데이터 저장 (upsert 대체: 기존 레코드 찾아서 update or insert)
  try {
    let query = supabase
      .from('store_images')
      .select('id')
      .eq('store_id', storeId)
      .eq('target_type', targetType)

    if (targetId) {
      query = query.eq('target_id', targetId)
    } else {
      query = query.is('target_id', null)
    }

    const { data: existing } = await query.maybeSingle()

    if (existing) {
      await supabase
        .from('store_images')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('store_images')
        .insert({
          store_id: storeId,
          target_type: targetType,
          target_id: targetId || null,
          image_url: imageUrl,
        })
    }
  } catch (e) {
    console.error('store_images save error:', e)
  }

  return NextResponse.json({
    data: { image_url: imageUrl, store_id: storeId, target_type: targetType, target_id: targetId },
    error: null,
  })
}
