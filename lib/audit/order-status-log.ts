import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// 자동 트리거가 order_status_logs에 (order_id, from_status, to_status) 한 줄을 넣어줍니다.
// 이 헬퍼는 그 직후 가장 최근 로그를 찾아 actor_id, actor_role, note를 채웁니다.
//
// 사용법:
//   await enrichLatestStatusLog(orderId, 'delivery_failed', { note: failedReason })
//
// race-safety: 트리거는 UPDATE와 같은 트랜잭션 내 동기 실행되므로
// 여기서 UPDATE 호출 시점에는 항상 한 줄이 있습니다.
// 동일 to_status 로그가 여러 개여도 가장 최근(created_at desc, limit 1)만 enrich.

export async function enrichLatestStatusLog(
  orderId: string,
  toStatus: string,
  opts: { note?: string } = {},
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('cosmart_user_id')?.value || null
    const role = cookieStore.get('cosmart_role')?.value || null

    const supabase = await createAdminClient()
    const { data: latest } = await supabase
      .from('order_status_logs')
      .select('id')
      .eq('order_id', orderId)
      .eq('to_status', toStatus)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!latest?.id) return

    await supabase
      .from('order_status_logs')
      .update({
        changed_by: userId,
        actor_role: role,
        note: opts.note?.trim() || null,
      })
      .eq('id', latest.id)
  } catch {
    // 감사 로그 실패는 본 흐름을 막지 않음
  }
}
