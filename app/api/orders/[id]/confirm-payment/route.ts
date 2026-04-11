import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (isDemoMode) {
    return NextResponse.json({ data: { id, status: 'paid' }, error: null })
  }

  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', id)
    .select(`*, items:order_items(*), customer:users!orders_customer_id_fkey(telegram_chat_id)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  await notifyAdmin(`💰 [입금확인] ${order.kakao_nickname} | ₩${order.total_amount.toLocaleString()} | ${order.order_number}`)

  return NextResponse.json({ data: order, error: null })
}
