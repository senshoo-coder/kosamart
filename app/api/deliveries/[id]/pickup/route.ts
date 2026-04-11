import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('deliveries')
    .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
    .eq('id', id)
    .select(`*, order:orders(kakao_nickname, delivery_address)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 주문 상태도 delivering으로 업데이트
  if (data.order_id) {
    await supabase.from('orders').update({ status: 'delivering' }).eq('id', data.order_id)
  }

  await notifyAdmin(`🚚 [픽업 완료] ${data.order?.kakao_nickname} → 배달 출발`)

  return NextResponse.json({ data, error: null })
}
