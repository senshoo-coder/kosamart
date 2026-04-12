'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { OrderStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDateTime, timeAgo } from '@/lib/utils'
import { ORDER_STATUS_CONFIG } from '@/lib/types'
import type { Order } from '@/lib/types'

export default function OrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [ownerMemo, setOwnerMemo] = useState('')

  useEffect(() => {
    fetch(`/api/orders?limit=200`)
      .then(r => r.json())
      .then(d => {
        const found = (d.data || []).find((o: Order) => o.id === id)
        setOrder(found ?? null)
        if (found?.owner_memo) setOwnerMemo(found.owner_memo)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function handleConfirmPayment() {
    if (!order) return
    setActionLoading(true)
    const res = await fetch(`/api/orders/${order.id}/confirm-payment`, { method: 'POST' })
    const d = await res.json()
    if (res.ok) setOrder(d.data)
    else alert(`오류: ${d.error || '입금확인 실패'}`)
    setActionLoading(false)
  }

  async function handleApprove() {
    if (!order) return
    setActionLoading(true)
    const res = await fetch(`/api/orders/${order.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_memo: ownerMemo }),
    })
    if (res.ok) { const d = await res.json(); setOrder(d.data) }
    setActionLoading(false)
  }

  async function handlePickupComplete() {
    if (!order) return
    setActionLoading(true)
    const res = await fetch(`/api/orders/${order.id}/pickup-complete`, { method: 'POST' })
    if (res.ok) { const d = await res.json(); setOrder(d.data) }
    else { const d = await res.json(); alert(`오류: ${d.error || '픽업완료 처리 실패'}`) }
    setActionLoading(false)
  }

  async function handleReject() {
    if (!order || !rejectReason.trim()) return
    setActionLoading(true)
    const res = await fetch(`/api/orders/${order.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejected_reason: rejectReason }),
    })
    if (res.ok) { const d = await res.json(); setOrder(d.data); setRejectModal(false) }
    setActionLoading(false)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="p-6 text-center">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-[#a3a3a3] text-[14px] mb-4">주문을 찾을 수 없습니다</p>
      <Button variant="secondary" onClick={() => router.back()}>← 돌아가기</Button>
    </div>
  )

  const isPickup = order.delivery_address === '매장 픽업'

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-[10px] bg-white border border-[#eee] flex items-center justify-center text-[#3c4a42] hover:bg-[#f9f9f9]"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-[#1a1c1c] text-[17px]">{order.kakao_nickname}</h1>
            <OrderStatusBadge status={order.status} />
            {isPickup && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ede9fe] text-[#6d28d9] font-medium">🏪 매장픽업</span>
            )}
          </div>
          <p className="text-[11px] text-[#a3a3a3] font-mono mt-0.5">{order.order_number}</p>
        </div>
      </div>

      {/* 주문 상품 */}
      <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3.5 border-b border-[#f5f5f5]">
          <h2 className="text-[13px] font-semibold text-[#1a1c1c]">주문 상품</h2>
        </div>
        <div className="divide-y divide-[#f9f9f9]">
          {order.items?.map(item => (
            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-[#1a1c1c]">{item.product_name}</p>
                <p className="text-[11px] text-[#a3a3a3] mt-0.5">{formatPrice(item.unit_price)} × {item.quantity}</p>
              </div>
              <p className="text-[13px] text-[#10b981] font-bold">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t border-[#f5f5f5] flex justify-between items-center bg-[#f9f9f9]">
          <span className="text-[13px] text-[#3c4a42]">합계</span>
          <span className="text-[18px] font-bold text-[#10b981]">{formatPrice(order.total_amount)}</span>
        </div>
      </div>

      {/* 배송/픽업 정보 */}
      <div className="bg-white rounded-[8px] p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 className="text-[13px] font-semibold text-[#1a1c1c] mb-3">{isPickup ? '픽업 정보' : '배송 정보'}</h2>
        <div className="space-y-2.5 text-[13px]">
          <div className="flex gap-3">
            <span className="text-[#a3a3a3] w-14 flex-shrink-0">유형</span>
            <span className="text-[#1a1c1c]">{isPickup ? '🏪 매장 픽업' : '🚚 배달'}</span>
          </div>
          {!isPickup && (
            <div className="flex gap-3">
              <span className="text-[#a3a3a3] w-14 flex-shrink-0">주소</span>
              <span className="text-[#1a1c1c]">{order.delivery_address}</span>
            </div>
          )}
          {(order as any).scheduled_at && (
            <div className="flex gap-3">
              <span className="text-[#a3a3a3] w-14 flex-shrink-0">수령시간</span>
              <span className="text-[#1a1c1c] font-medium">{formatDateTime((order as any).scheduled_at)}</span>
            </div>
          )}
          {order.delivery_memo && (
            <div className="flex gap-3">
              <span className="text-[#a3a3a3] w-14 flex-shrink-0">메모</span>
              <span className="text-[#3c4a42]">{order.delivery_memo}</span>
            </div>
          )}
          <div className="flex gap-3">
            <span className="text-[#a3a3a3] w-14 flex-shrink-0">접수</span>
            <span className="text-[#3c4a42]">{formatDateTime(order.created_at)}</span>
          </div>
          {order.approved_at && (
            <div className="flex gap-3">
              <span className="text-[#a3a3a3] w-14 flex-shrink-0">승인</span>
              <span className="text-[#3c4a42]">{formatDateTime(order.approved_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 거절 사유 */}
      {order.rejected_reason && (
        <div className="bg-[#fee2e2] rounded-[8px] p-5 border border-[#fecaca]">
          <h2 className="text-[13px] font-semibold text-[#b91c1c] mb-2">거절 사유</h2>
          <p className="text-[13px] text-[#b91c1c]">{order.rejected_reason}</p>
        </div>
      )}

      {/* 상태 이력 */}
      {order.status_logs && order.status_logs.length > 0 && (
        <div className="bg-white rounded-[8px] p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 className="text-[13px] font-semibold text-[#1a1c1c] mb-3">상태 변경 이력</h2>
          <div className="space-y-2">
            {order.status_logs.map(log => (
              <div key={log.id} className="flex items-center gap-2 text-[12px]">
                <span className="text-[#a3a3a3]">{timeAgo(log.created_at)}</span>
                {log.from_status && (
                  <>
                    <span className="text-[#a3a3a3]">{ORDER_STATUS_CONFIG[log.from_status]?.label}</span>
                    <span className="text-[#a3a3a3]">→</span>
                  </>
                )}
                <span className="text-[#1a1c1c] font-medium">{ORDER_STATUS_CONFIG[log.to_status]?.label}</span>
                {log.note && <span className="text-[#a3a3a3]">({log.note})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사장님 메모 */}
      {(order.status === 'pending' || order.status === 'paid') && (
        <div className="bg-white rounded-[8px] p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <label className="text-[13px] font-semibold text-[#1a1c1c] mb-2 block">사장님 메모 (선택)</label>
          <textarea
            value={ownerMemo}
            onChange={e => setOwnerMemo(e.target.value)}
            placeholder="내부 메모를 입력하세요"
            rows={2}
            className="w-full bg-[#f2f4f6] border border-transparent rounded-[12px] px-4 py-3 text-[#1a1c1c] text-[13px] placeholder-[#a3a3a3] outline-none focus:border-[#10b981] focus:bg-white resize-none"
          />
        </div>
      )}
      {order.owner_memo && order.status !== 'pending' && order.status !== 'paid' && (
        <div className="bg-[#fef3c7] rounded-[8px] p-4 border border-[#fde68a]">
          <p className="text-[11px] text-[#b45309] font-semibold mb-1">사장님 메모</p>
          <p className="text-[13px] text-[#b45309]">{order.owner_memo}</p>
        </div>
      )}

      {/* 액션 버튼 */}
      {order.status === 'pending' && (
        <div className="flex gap-3">
          <Button className="flex-1 py-3" onClick={handleConfirmPayment} loading={actionLoading}>💰 입금확인</Button>
          <Button className="flex-1 py-3" variant="danger" onClick={() => setRejectModal(true)} disabled={actionLoading}>❌ 거절</Button>
        </div>
      )}
      {order.status === 'paid' && (
        <div className="flex gap-3">
          <Button className="flex-1 py-3" onClick={handleApprove} loading={actionLoading}>
            {isPickup ? '✅ 고객 픽업 승인' : '✅ 배달 승인'}
          </Button>
          <Button className="flex-1 py-3" variant="danger" onClick={() => setRejectModal(true)} disabled={actionLoading}>❌ 거절</Button>
        </div>
      )}
      {order.status === 'approved' && isPickup && (
        <div className="space-y-2">
          <div className="bg-[#d1fae5] rounded-[8px] p-3 text-center">
            <p className="text-[13px] text-[#10b981] font-semibold">✅ 준비완료 · 고객 픽업 대기중</p>
          </div>
          <Button className="w-full py-3" onClick={handlePickupComplete} loading={actionLoading}>🏪 고객 픽업 완료</Button>
        </div>
      )}

      {/* 거절 모달 */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(false) }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6">
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-1">주문 거절</h3>
            <p className="text-[11px] text-[#a3a3a3] mb-4 font-mono">{order.order_number}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="거절 사유 입력 (필수)"
              className="w-full bg-[#f2f4f6] border border-transparent rounded-[12px] px-4 py-3 text-[#1a1c1c] text-[14px] placeholder-[#a3a3a3] outline-none focus:border-[#ef4444] focus:bg-white resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setRejectModal(false)}>취소</Button>
              <Button variant="danger" className="flex-1" onClick={handleReject} loading={actionLoading}>거절 확정</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
