'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { OrderStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, timeAgo } from '@/lib/utils'
import type { Order, OrderStatus } from '@/lib/types'

const FILTER_TABS: Array<{ key: 'all' | OrderStatus; label: string }> = [
  { key: 'all',        label: '전체' },
  { key: 'pending',    label: '입금대기' },
  { key: 'paid',       label: '입금완료' },
  { key: 'approved',   label: '배송준비' },
  { key: 'delivering', label: '배달중' },
  { key: 'delivered',  label: '완료' },
  { key: 'cancelled',  label: '취소/거절' },
]

function OwnerOrdersContent() {
  const params = useSearchParams()
  const [filter, setFilter] = useState<'all' | OrderStatus>((params.get('status') as OrderStatus) || 'all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadOrders = useCallback(() => {
    setLoading(true)
    const qs = filter !== 'all' ? `?status=${filter}` : ''
    fetch(`/api/orders${qs}`)
      .then(r => r.json())
      .then(d => { setOrders(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  useEffect(() => { loadOrders() }, [loadOrders])

  async function handleConfirmPayment(orderId: string) {
    setActionLoading(orderId)
    const res = await fetch(`/api/orders/${orderId}/confirm-payment`, { method: 'POST' })
    if (!res.ok) {
      const d = await res.json()
      alert(`오류: ${d.error || '입금확인 실패'}`)
    }
    loadOrders()
    setActionLoading(null)
  }

  async function handleApprove(orderId: string) {
    setActionLoading(orderId)
    await fetch(`/api/orders/${orderId}/approve`, { method: 'POST' })
    loadOrders()
    setActionLoading(null)
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return
    setActionLoading(rejectModal.orderId)
    try {
      const res = await fetch(`/api/orders/${rejectModal.orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejected_reason: rejectReason }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        alert(`거절 처리 실패: ${json.error || '알 수 없는 오류'}`)
        setActionLoading(null)
        return
      }
    } catch {
      alert('네트워크 오류가 발생했습니다')
      setActionLoading(null)
      return
    }
    setRejectModal(null)
    setRejectReason('')
    loadOrders()
    setActionLoading(null)
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const paidCount = orders.filter(o => o.status === 'paid').length

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">주문 관리</h1>
          {pendingCount > 0 && (
            <p className="text-[12px] text-[#b45309] mt-0.5">⏳ 입금대기 {pendingCount}건{paidCount > 0 ? ` · 입금완료 ${paidCount}건` : ''}</p>
          )}
          {pendingCount === 0 && paidCount > 0 && (
            <p className="text-[12px] text-[#10b981] mt-0.5">💰 입금완료 승인 대기 {paidCount}건</p>
          )}
        </div>
        <button
          onClick={loadOrders}
          className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]"
        >
          새로고침
        </button>
      </div>

      {/* 필터 칩 */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="flex-shrink-0 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors"
            style={filter === tab.key
              ? { background: '#10b981', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1 font-bold">({pendingCount})</span>
            )}
            {tab.key === 'paid' && paidCount > 0 && (
              <span className="ml-1 font-bold">({paidCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* 데스크탑 테이블 */}
      <div className="bg-white rounded-[8px] overflow-hidden hidden md:block" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f5f5f5]">
              {['주문번호', '닉네임', '주문 내역', '금액', '상태', '접수', '처리'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] text-[#a3a3a3] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-[#a3a3a3] text-[13px]">로딩중...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-[#a3a3a3] text-[13px]">주문이 없습니다</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="border-b border-[#f9f9f9] hover:bg-[#f9f9f9] transition-colors">
                  <td className="px-4 py-3 text-[11px] text-[#a3a3a3] font-mono">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-[#1a1c1c] font-semibold">{order.kakao_nickname}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#3c4a42] max-w-xs truncate">
                    {order.items?.map(i => `${i.product_name}×${i.quantity}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#10b981] font-bold">{formatPrice(order.total_amount)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-[#a3a3a3]">{timeAgo(order.created_at)}</td>
                  <td className="px-4 py-3">
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleConfirmPayment(order.id)} loading={actionLoading === order.id}>
                          💰 입금확인
                        </Button>
                        <Button size="sm" variant="danger"
                          onClick={() => setRejectModal({ orderId: order.id, orderNumber: order.order_number })}>
                          거절
                        </Button>
                      </div>
                    )}
                    {order.status === 'paid' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(order.id)} loading={actionLoading === order.id}>
                          ✅ 승인
                        </Button>
                        <Button size="sm" variant="danger"
                          onClick={() => setRejectModal({ orderId: order.id, orderNumber: order.order_number })}>
                          거절
                        </Button>
                      </div>
                    )}
                    {order.status === 'approved' && (
                      <span className="text-[11px] text-[#1d4ed8]">배달팀 대기</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-[14px] font-semibold text-[#1a1c1c]">주문이 없습니다</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-[#1a1c1c] text-[14px]">{order.kakao_nickname}</p>
                <p className="text-[11px] text-[#a3a3a3] font-mono">{order.order_number}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-[12px] text-[#3c4a42] mb-3 truncate">
              {order.items?.map(i => `${i.product_name}×${i.quantity}`).join(', ')}
            </p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-bold text-[#10b981]">{formatPrice(order.total_amount)}</span>
              <span className="text-[11px] text-[#a3a3a3]">{timeAgo(order.created_at)}</span>
            </div>
            {order.status === 'pending' && (
              <div className="flex gap-2">
                <Button className="flex-1" size="sm" onClick={() => handleConfirmPayment(order.id)} loading={actionLoading === order.id}>
                  💰 입금확인
                </Button>
                <Button className="flex-1" size="sm" variant="danger"
                  onClick={() => setRejectModal({ orderId: order.id, orderNumber: order.order_number })}>
                  ❌ 거절
                </Button>
              </div>
            )}
            {order.status === 'paid' && (
              <div className="flex gap-2">
                <Button className="flex-1" size="sm" onClick={() => handleApprove(order.id)} loading={actionLoading === order.id}>
                  ✅ 배달 승인
                </Button>
                <Button className="flex-1" size="sm" variant="danger"
                  onClick={() => setRejectModal({ orderId: order.id, orderNumber: order.order_number })}>
                  ❌ 거절
                </Button>
              </div>
            )}
            {order.status === 'approved' && (
              <p className="text-[12px] text-center text-[#1d4ed8]">배달팀 배정 대기중</p>
            )}
          </div>
        ))}
      </div>

      {/* 거절 사유 모달 */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(null) }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6">
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-1">주문 취소 처리</h3>
            <p className="text-[11px] text-[#a3a3a3] mb-4 font-mono">{rejectModal.orderNumber}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="취소 사유 입력 (필수) — 예: 재료 소진, 영업 종료 등"
              className="w-full bg-[#f2f4f6] border border-transparent rounded-[12px] px-4 py-3 text-[#1a1c1c] text-[14px] placeholder-[#a3a3a3] outline-none focus:border-[#10b981] focus:bg-white resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setRejectModal(null)}>닫기</Button>
              <Button variant="danger" className="flex-1" onClick={handleReject} loading={!!actionLoading}>취소 확정</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OwnerOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    }>
      <OwnerOrdersContent />
    </Suspense>
  )
}
