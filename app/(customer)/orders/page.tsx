'use client'
import { useState, useEffect } from 'react'
import { formatPrice, formatDateTime, getLocalStorage } from '@/lib/utils'
import { ORDER_STATUS_CONFIG } from '@/lib/types'
import type { Order } from '@/lib/types'

const STATUS_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기중' },
  { key: 'approved', label: '승인됨' },
  { key: 'delivering', label: '배달중' },
  { key: 'delivered', label: '완료' },
]

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: '#fef3c7', text: '#b45309', label: '승인 대기' },
  approved:   { bg: '#dbeafe', text: '#1d4ed8', label: '승인됨' },
  delivering: { bg: '#d1fae5', text: '#065f46', label: '배달중' },
  delivered:  { bg: '#f1f5f9', text: '#475569', label: '완료' },
  cancelled:  { bg: '#fee2e2', text: '#b91c1c', label: '취소됨' },
  rejected:   { bg: '#fee2e2', text: '#b91c1c', label: '거절됨' },
}

const STEPS = ['pending', 'approved', 'delivering', 'delivered'] as const
const STEP_LABELS: Record<string, string> = {
  pending: '주문 접수',
  approved: '사장님 승인',
  delivering: '배달 중',
  delivered: '배달 완료',
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const deviceUuid = getLocalStorage('cosmart_device_uuid')

  useEffect(() => {
    if (!deviceUuid) { setLoading(false); return }
    fetch(`/api/orders?device_uuid=${deviceUuid}`)
      .then(r => r.json())
      .then(d => { setOrders(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [deviceUuid])

  const activeOrders = orders.filter(o => ['pending', 'approved', 'delivering'].includes(o.status))
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <h1 className="text-[18px] font-bold text-[#1a1c1c]">주문내역</h1>
        <p className="text-[12px] text-[#a3a3a3]">총 {orders.length}건</p>
      </header>


      {/* 필터 칩 */}
      <div
        className="px-5 pt-4 pb-3 overflow-x-auto flex gap-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-none px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors"
            style={filter === f.key
              ? { background: '#10b981', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-8 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          (() => {
            // bundle_id로 그룹핑
            const bundleMap = new Map<string, Order[]>()
            const standalone: Order[] = []
            filtered.forEach(order => {
              const bid = (order as any).bundle_id
              if (bid) {
                if (!bundleMap.has(bid)) bundleMap.set(bid, [])
                bundleMap.get(bid)!.push(order)
              } else {
                standalone.push(order)
              }
            })
            const rendered: React.ReactNode[] = []
            // 번들 주문을 먼저
            bundleMap.forEach((bundleOrders, bid) => {
              rendered.push(
                <BundleCard
                  key={bid}
                  bundleId={bid}
                  orders={bundleOrders}
                  expanded={expanded === bid}
                  onToggle={() => setExpanded(expanded === bid ? null : bid)}
                />
              )
            })
            // 단일 주문
            standalone.forEach(order => {
              rendered.push(
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expanded === order.id}
                  onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                />
              )
            })
            return rendered
          })()
        )}
      </div>
    </div>
  )
}

function DeliveryTracker({ order }: { order: Order }) {
  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])

  return (
    <div className="bg-white rounded-[8px] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-bold text-[#1a1c1c]">{order.store_name ?? order.group_buy?.title ?? '공구'}</p>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={STATUS_STYLE[order.status]
            ? { background: STATUS_STYLE[order.status].bg, color: STATUS_STYLE[order.status].text }
            : { background: '#f0f0f0', color: '#666' }
          }
        >
          {STATUS_STYLE[order.status]?.label}
        </span>
      </div>

      {/* 스텝 트래커 */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i <= currentStep
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: done ? '#10b981' : '#e8e8e8', color: done ? '#fff' : '#a3a3a3' }}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-[9px] text-center leading-tight whitespace-nowrap" style={{ color: done ? '#10b981' : '#a3a3a3' }}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1 mb-4"
                  style={{ background: i < currentStep ? '#10b981' : '#e8e8e8' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {order.delivery_address && (
        <p className="text-[11px] text-[#3c4a42] mt-2">📍 {order.delivery_address}</p>
      )}
    </div>
  )
}

function OrderCard({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  const style = STATUS_STYLE[order.status] ?? STATUS_STYLE['pending']
  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])
  const isFailed = order.status === 'cancelled' || order.status === 'rejected'

  return (
    <div className="bg-white rounded-[8px] overflow-hidden">
      <div className="p-4">
        {/* 날짜 + 상태 */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] text-[#a3a3a3]">{formatDateTime(order.created_at)}</p>
            <p className="text-[13px] font-bold text-[#1a1c1c] mt-0.5">{order.store_name ?? order.group_buy?.title ?? '공구'}</p>
          </div>
          <span
            className="text-[12px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: style.bg, color: style.text }}
          >
            {style.label}
          </span>
        </div>

        {/* 상품 요약 */}
        <p className="text-[13px] text-[#3c4a42] mb-3 truncate">
          {order.items?.map(i => `${i.product_name} ×${i.quantity}`).join(', ') || '상품 정보 없음'}
        </p>

        {/* 금액 + 진행 도트 */}
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold text-[#10b981]">{formatPrice(order.total_amount)}</span>
          {!isFailed && (
            <div className="flex items-center gap-1">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: i <= currentStep ? '#10b981' : '#e2e8f0' }}
                  />
                  {i < STEPS.length - 1 && (
                    <div className="w-4 h-0.5 rounded-full" style={{ background: i < currentStep ? '#10b981' : '#e2e8f0' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 토글 */}
        <button
          onClick={onToggle}
          className="w-full mt-3 pt-3 border-t border-[#eee] text-[12px] text-[#a3a3a3] flex items-center justify-center gap-1"
        >
          {expanded ? '접기 ↑' : '상세 보기 ↓'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between">
                <span className="text-[12px] text-[#3c4a42]">{item.product_name} ×{item.quantity}</span>
                <span className="text-[12px] font-semibold text-[#10b981]">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-[#eee] pt-2 mt-2 space-y-1">
              <p className="text-[12px] text-[#3c4a42]">📍 {order.delivery_address}</p>
              {order.delivery_memo && <p className="text-[12px] text-[#3c4a42]">📝 {order.delivery_memo}</p>}
              {order.owner_memo && <p className="text-[12px] text-amber-600">💬 {order.owner_memo}</p>}
              {order.rejected_reason && <p className="text-[12px] text-red-500">❌ 거절 사유: {order.rejected_reason}</p>}
            </div>
            {order.status_logs && order.status_logs.length > 0 && (
              <div className="border-t border-[#eee] pt-2 mt-2 space-y-1.5">
                <p className="text-[11px] text-[#1a1c1c] font-semibold mb-1">진행 이력</p>
                {order.status_logs.map(log => (
                  <div key={log.id} className="flex items-center gap-2">
                    <span className="text-[11px]">{ORDER_STATUS_CONFIG[log.to_status]?.icon}</span>
                    <span className="text-[11px] text-[#3c4a42]">{ORDER_STATUS_CONFIG[log.to_status]?.label}</span>
                    <span className="text-[11px] text-[#a3a3a3] ml-auto">{formatDateTime(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BundleCard({ bundleId, orders, expanded, onToggle }: { bundleId: string; orders: Order[]; expanded: boolean; onToggle: () => void }) {
  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0)
  // 번들 상태: 가장 "진행이 덜 된" 상태 사용
  const statusPriority = ['pending', 'paid', 'approved', 'delivering', 'delivered', 'cancelled', 'rejected']
  const bundleStatus = orders.reduce((worst, o) => {
    const wi = statusPriority.indexOf(worst)
    const oi = statusPriority.indexOf(o.status)
    return oi < wi ? o.status : worst
  }, orders[0].status)
  const style = STATUS_STYLE[bundleStatus] ?? STATUS_STYLE['pending']
  const currentStep = STEPS.indexOf(bundleStatus as typeof STEPS[number])
  const isFailed = bundleStatus === 'cancelled' || bundleStatus === 'rejected'

  return (
    <div className="bg-white rounded-[8px] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[11px] text-[#a3a3a3]">{formatDateTime(orders[0].created_at)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[13px] font-bold text-[#1a1c1c]">묶음주문</p>
              <span className="text-[10px] bg-[#10b981] text-white px-1.5 py-0.5 rounded-full font-medium">{orders.length}개 가게</span>
            </div>
          </div>
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: style.bg, color: style.text }}>
            {style.label}
          </span>
        </div>

        {/* 가게 요약 */}
        <p className="text-[13px] text-[#3c4a42] mb-3 truncate">
          {orders.map(o => o.store_name || '가게').join(' + ')}
        </p>

        {/* 금액 + 진행 도트 */}
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold text-[#10b981]">{formatPrice(totalAmount)}</span>
          {!isFailed && (
            <div className="flex items-center gap-1">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: i <= currentStep ? '#10b981' : '#e2e8f0' }} />
                  {i < STEPS.length - 1 && <div className="w-4 h-0.5 rounded-full" style={{ background: i < currentStep ? '#10b981' : '#e2e8f0' }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onToggle} className="w-full mt-3 pt-3 border-t border-[#eee] text-[12px] text-[#a3a3a3] flex items-center justify-center gap-1">
          {expanded ? '접기 ↑' : '상세 보기 ↓'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-[#f9f9f9] rounded-[8px] p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-bold text-[#1a1c1c]">{order.store_name || '가게'}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: (STATUS_STYLE[order.status] || STATUS_STYLE['pending']).bg, color: (STATUS_STYLE[order.status] || STATUS_STYLE['pending']).text }}>
                    {(STATUS_STYLE[order.status] || STATUS_STYLE['pending']).label}
                  </span>
                </div>
                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between py-0.5">
                    <span className="text-[11px] text-[#3c4a42]">{item.product_name} ×{item.quantity}</span>
                    <span className="text-[11px] font-semibold text-[#10b981]">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 mt-1 border-t border-[#eee]">
                  <span className="text-[11px] text-[#a3a3a3]">소계</span>
                  <span className="text-[12px] font-bold text-[#10b981]">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-[#eee] pt-2 space-y-1">
              <p className="text-[12px] text-[#3c4a42]">📍 {orders[0].delivery_address}</p>
              {orders[0].delivery_memo && <p className="text-[12px] text-[#3c4a42]">📝 {orders[0].delivery_memo}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-5xl">📋</span>
      <p className="text-[15px] font-semibold text-[#1a1c1c]">주문 내역이 없어요</p>
      <p className="text-[13px] text-[#3c4a42]">상점가에서 상품을 주문해보세요</p>
    </div>
  )
}
