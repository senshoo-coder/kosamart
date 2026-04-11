'use client'
import { useState, useEffect } from 'react'
import { formatPrice, formatDateTime, getLocalStorage } from '@/lib/utils'
import type { Order } from '@/lib/types'

const DELIVERY_STEPS = [
  { key: 'pending',    icon: '🧾', label: '주문 접수' },
  { key: 'approved',   icon: '✅', label: '사장님 승인' },
  { key: 'delivering', icon: '🏍️', label: '배달 중' },
  { key: 'delivered',  icon: '📦', label: '배달 완료' },
]

export default function DeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const deviceUuid = getLocalStorage('cosmart_device_uuid')

  useEffect(() => {
    if (!deviceUuid) { setLoading(false); return }
    fetch(`/api/orders?device_uuid=${deviceUuid}`)
      .then(r => r.json())
      .then(d => {
        const active = (d.data || []).filter((o: Order) =>
          !['delivered', 'cancelled', 'rejected'].includes(o.status)
        )
        setOrders(active)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [deviceUuid])

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <h1 className="text-[18px] font-bold text-[#1a1c1c]">배송현황</h1>
        <p className="text-[12px] text-[#a3a3a3]">진행중 {orders.length}건</p>
      </header>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          orders.map(order => <DeliveryCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  )
}

function DeliveryCard({ order }: { order: Order }) {
  const currentStepIdx = DELIVERY_STEPS.findIndex(s => s.key === order.status)
  const isDelivering = order.status === 'delivering'

  return (
    <div className="bg-white rounded-[8px] overflow-hidden">

      <div className="p-5">
        {/* 주문번호 + 시간 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-bold text-[#1a1c1c] font-mono">{order.order_number}</p>
            <p className="text-[11px] text-[#3c4a42] mt-0.5">{formatDateTime(order.created_at)}</p>
          </div>
          {isDelivering && (
            <span className="flex items-center gap-1 bg-[#d1fae5] text-[#065f46] text-[12px] font-semibold px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse inline-block" />
              배달 중
            </span>
          )}
        </div>

        {/* 진행 스텝 */}
        <div className="flex items-start justify-between mb-5">
          {DELIVERY_STEPS.map((step, i) => {
            const done = i <= currentStepIdx
            const active = i === currentStepIdx
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center gap-1 relative">
                {/* 연결선 */}
                {i < DELIVERY_STEPS.length - 1 && (
                  <div
                    className="absolute top-4 left-1/2 w-full h-0.5"
                    style={{ background: i < currentStepIdx ? '#10b981' : '#e2e8f0' }}
                  />
                )}
                {/* 아이콘 원 */}
                <div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center text-[16px] z-10"
                  style={{ background: done ? '#10b981' : '#f1f5f9', border: active ? '2px solid #10b981' : 'none' }}
                >
                  {step.icon}
                </div>
                <p className="text-[10px] text-center" style={{ color: done ? '#10b981' : '#94a3b8', fontWeight: done ? '600' : '400' }}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* 상품 요약 */}
        <div className="bg-[#f8fafc] rounded-[8px] p-3 mb-3">
          <p className="text-[12px] text-[#3c4a42] truncate">
            {order.items?.map(i => `${i.product_name} ×${i.quantity}`).join(', ') || '상품 정보 없음'}
          </p>
          <p className="text-[14px] font-bold text-[#10b981] mt-1">{formatPrice(order.total_amount)}</p>
        </div>

        {/* 배송지 */}
        <div className="flex items-start gap-2">
          <span className="text-[14px]">📍</span>
          <p className="text-[12px] text-[#3c4a42] leading-snug">{order.delivery_address}</p>
        </div>

        {/* 배달 기사 메모 (있을 경우) */}
        {order.owner_memo && (
          <div className="mt-3 bg-[#fef3c7] rounded-[8px] p-3">
            <p className="text-[12px] text-amber-700">💬 {order.owner_memo}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-5xl">🏍️</span>
      <p className="text-[15px] font-semibold text-[#1a1c1c]">진행 중인 배달이 없어요</p>
      <p className="text-[13px] text-[#3c4a42]">주문 후 여기서 배달 현황을 확인할 수 있어요</p>
    </div>
  )
}
