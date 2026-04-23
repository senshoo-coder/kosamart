import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyDriver, notifyStore, getStoreChatId } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { driver_uuid } = body

  const supabase = await createAdminClient()

  // 기사 조회: 쿠키 우선, 없으면 device_uuid fallback
  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get('cosmart_user_id')?.value
  const cookieRole = cookieStore.get('cosmart_role')?.value

  let driver: { id: string; nickname: string } | null = null
  if (cookieUserId) {
    const { data } = await supabase.from('users').select('id, nickname').eq('id', cookieUserId).single()
    driver = data
  }
  if (!driver && driver_uuid) {
    const { data } = await supabase.from('users').select('id, nickname').eq('device_uuid', driver_uuid).single()
    driver = data
  }
  if (!driver) return NextResponse.json({ data: null, error: '기사 인증 실패' }, { status: 401 })

  const { data, error } = await supabase
    .from('deliveries')
    .update({ driver_id: driver.id, status: 'assigned', assigned_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')   // 이미 다른 기사가 수락한 경우 업데이트 안 됨
    .select(`*, order:orders(store_id, order_number, kakao_nickname, delivery_address)`)
    .single()

  if (error || !data) {
    return NextResponse.json({ data: null, error: '이미 다른 기사가 수락한 배달입니다' }, { status: 409 })
  }

  const msg = `📋 <b>[배달 배정]</b>\n기사: ${driver.nickname}\n주문자: ${data.order?.kakao_nickname}\n주소: ${data.order?.delivery_address}`
  const storeChatId = data.order?.store_id ? await getStoreChatId(data.order.store_id) : null
  await Promise.all([
    notifyAdmin(msg),
    notifyDriver(msg),
    notifyStore(storeChatId, msg),
  ])

  return NextResponse.json({ data, error: null })
}
