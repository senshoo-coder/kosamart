import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const rejected_reason = body.rejected_reason || ''

  if (!rejected_reason.trim()) {
    return NextResponse.json({ data: null, error: '취소 사유를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 1단계: status 업데이트 (단순하게 select 없이)
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
  }

  // 2단계: 업데이트된 order 조회 (단순 select, 조인 없음)
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  // 배달 레코드 취소
  await supabase.from('deliveries').update({ status: 'cancelled' }).eq('order_id', id).catch(() => {})

  // 관리자 알림 (실패해도 무시)
  await notifyAdmin(`❌ [주문 취소] 주문ID: ${id} | 사유: ${rejected_reason}`).catch(() => {})

  return NextResponse.json({ data: order ?? { id, status: 'cancelled' }, error: null })
}
