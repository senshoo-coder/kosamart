'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/ui/badge'
import { formatPrice, formatDateTime, timeAgo } from '@/lib/utils'
import type { Order } from '@/lib/types'

interface Stats {
  todayOrders: number
  todayRevenue: number
  pendingCount: number
  deliveringCount: number
}

const STAT_CARDS = (stats: Stats, loading: boolean) => [
  { label: '오늘 신규 주문', value: stats.todayOrders + '건', icon: '📦', accent: '#10b981', bg: '#f0fdf4', href: '/owner/orders?status=pending' },
  { label: '입금 확인 대기', value: stats.pendingCount + '건', icon: '⏳', accent: '#b45309', bg: '#fef3c7', href: '/owner/orders?status=pending' },
  { label: '배달 진행중',    value: stats.deliveringCount + '건', icon: '🚚', accent: '#1d4ed8', bg: '#dbeafe', href: '/owner/orders?status=delivering' },
  { label: '오늘 매출',     value: formatPrice(stats.todayRevenue), icon: '💰', accent: '#6d28d9', bg: '#ede9fe', href: '/owner/analytics' },
]

export default function OwnerDashboard() {
  const [stats, setStats] = useState<Stats>({ todayOrders: 0, todayRevenue: 0, pendingCount: 0, deliveringCount: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))
    Promise.all([
      fetch('/api/orders?limit=5&sort=created_at').then(r => r.json()),
      fetch('/api/orders/stats').then(r => r.json()),
    ]).then(([orders, statsData]) => {
      setRecentOrders(orders.data || [])
      setStats(statsData.data || stats)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-[#1a1c1c]">대시보드</h1>
        <p className="text-[12px] text-[#a3a3a3] mt-0.5">
          {today}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS(stats, loading).map((card) => (
          <Link key={card.label} href={card.href}>
            <div className="bg-white rounded-[8px] p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-[8px] flex items-center justify-center text-lg" style={{ background: card.bg }}>
                  {card.icon}
                </div>
                {loading && <div className="w-4 h-4 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />}
              </div>
              <p className="text-[11px] text-[#a3a3a3] mb-1">{card.label}</p>
              <p className="text-[22px] font-bold" style={{ color: card.accent }}>{loading ? '—' : card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/owner/orders?status=pending">
          <div className="bg-white rounded-[8px] p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-[10px] bg-[#fef3c7] flex items-center justify-center text-xl">⚡</div>
            <div>
              <p className="text-[13px] font-semibold text-[#1a1c1c]">빠른 승인</p>
              <p className="text-[11px] text-[#a3a3a3]">대기 {stats.pendingCount}건</p>
            </div>
          </div>
        </Link>
        <Link href="/owner/store">
          <div className="bg-white rounded-[8px] p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-[10px] bg-[#f0fdf4] flex items-center justify-center text-xl">🏪</div>
            <div>
              <p className="text-[13px] font-semibold text-[#1a1c1c]">내 가게</p>
              <p className="text-[11px] text-[#a3a3a3]">가게 정보 관리</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 최근 주문 */}
      <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#f5f5f5]">
          <h2 className="text-[14px] font-bold text-[#1a1c1c]">최근 주문</h2>
          <Link href="/owner/orders">
            <span className="text-[12px] text-[#10b981]">전체 보기 →</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="py-10 text-center text-[#a3a3a3] text-[13px]">주문이 없습니다</div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {recentOrders.map(order => (
              <Link key={order.id} href={`/owner/orders/${order.id}`}>
                <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#f9f9f9] transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1a1c1c] text-[13px] truncate">{order.kakao_nickname}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-[11px] text-[#a3a3a3] mt-0.5 truncate font-mono">{order.order_number}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] text-[#10b981] font-bold">{formatPrice(order.total_amount)}</p>
                    <p className="text-[11px] text-[#a3a3a3]">{timeAgo(order.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
