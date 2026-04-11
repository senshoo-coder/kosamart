import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createAdminClient()

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', id)

  if (updateError) return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single()

  await notifyAdmin(`💰 [입금확인] 주문ID: ${id} | ₩${order?.total_amount?.toLocaleString() ?? ''}`).catch(() => {})

  return NextResponse.json({ data: order ?? { id, status: 'paid' }, error: null })
}
