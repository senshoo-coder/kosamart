'use client'
import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/lib/types'

interface DailyStat {
  date: string
  revenue: number
  count: number
}

export default function OwnerAnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 14 | 30>(7)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/orders?limit=200`)
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cutoff = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
  const filtered = orders.filter(o => new Date(o.created_at) >= cutoff)

  const dailyMap: Record<string, DailyStat> = {}
  filtered.forEach(o => {
    const d = o.created_at.split('T')[0]
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, count: 0 }
    dailyMap[d].count++
    if (o.status === 'delivered') dailyMap[d].revenue += o.total_amount
  })
  const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

  const statusCounts = filtered.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const totalRevenue = filtered.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total_amount, 0)
  const totalOrders = filtered.length
  const deliveryRate = totalOrders > 0 ? Math.round((statusCounts['delivered'] ?? 0) / totalOrders * 100) : 0
  const cancelRate = totalOrders > 0 ? Math.round(((statusCounts['cancelled'] ?? 0) + (statusCounts['rejected'] ?? 0)) / totalOrders * 100) : 0
  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1)

  const STAT_CARDS = [
    { label: '총 매출', value: formatPrice(totalRevenue), sub: `최근 ${period}일`, accent: '#10b981', bg: '#f0fdf4' },
    { label: '총 주문', value: `${totalOrders}건`, sub: `완료 ${statusCounts['delivered'] ?? 0}건`, accent: '#1d4ed8', bg: '#dbeafe' },
    { label: '배달 완료율', value: `${deliveryRate}%`, sub: '완료/전체', accent: '#6d28d9', bg: '#ede9fe' },
    { label: '취소율', value: `${cancelRate}%`, sub: '취소+거절/전체', accent: '#b91c1c', bg: '#fee2e2' },
  ]

  const STATUS_BARS = [
    { key: 'pending', label: '승인 대기', color: '#b45309', bg: '#fef3c7' },
    { key: 'approved', label: '승인됨', color: '#1d4ed8', bg: '#dbeafe' },
    { key: 'delivering', label: '배달중', color: '#6d28d9', bg: '#ede9fe' },
    { key: 'delivered', label: '배달 완료', color: '#10b981', bg: '#d1fae5' },
    { key: 'cancelled', label: '취소/거절', color: '#b91c1c', bg: '#fee2e2' },
  ]

  return (
    <div className="p-5 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">매출 분석</h1>
          <p className="text-[12px] text-[#a3a3a3]">주문 및 매출 통계 현황</p>
        </div>
        <div className="flex gap-1.5">
          {([7, 14, 30] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3.5 py-2 rounded-[10px] text-[12px] font-medium transition-colors"
              style={period === p
                ? { background: '#10b981', color: '#fff' }
                : { background: '#e8e8e8', color: '#1a1c1c' }
              }
            >
              {p}일
            </button>
          ))}
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, sub, accent, bg }) => (
          <div key={label} className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center mb-3" style={{ background: bg }}>
              <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
            </div>
            <p className="text-[11px] text-[#a3a3a3] mb-1">{label}</p>
            <p className="text-[20px] font-bold" style={{ color: accent }}>{value}</p>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* 일별 매출 바 차트 */}
      <div className="bg-white rounded-[8px] p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 className="text-[13px] font-bold text-[#1a1c1c] mb-5">일별 매출</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : dailyStats.length === 0 ? (
          <p className="text-center text-[#a3a3a3] text-[13px] py-8">데이터 없음</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {dailyStats.map(stat => {
              const height = Math.max((stat.revenue / maxRevenue) * 100, stat.count > 0 ? 4 : 0)
              return (
                <div key={stat.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t-[4px] transition-all duration-500"
                      style={{
                        height: `${height * 1.4}px`,
                        minHeight: stat.count > 0 ? '4px' : '0',
                        background: 'linear-gradient(to top, #059669, #10b981)',
                      }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-[#1a1c1c] rounded-[8px] px-3 py-2 text-xs whitespace-nowrap">
                        <p className="text-white font-semibold">{formatPrice(stat.revenue)}</p>
                        <p className="text-[#a3a3a3]">{stat.count}건</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#a3a3a3] truncate w-full text-center">{stat.date.slice(5)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 상태별 분포 */}
      <div className="bg-white rounded-[8px] p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 className="text-[13px] font-bold text-[#1a1c1c] mb-4">주문 상태 분포</h3>
        <div className="space-y-3">
          {STATUS_BARS.map(({ key, label, color, bg }) => {
            const count = key === 'cancelled'
              ? (statusCounts['cancelled'] ?? 0) + (statusCounts['rejected'] ?? 0)
              : (statusCounts[key] ?? 0)
            const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0
            return (
              <div key={key}>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-[#3c4a42]">{label}</span>
                  <span className="font-semibold" style={{ color }}>{count}건 ({Math.round(pct)}%)</span>
                </div>
                <div className="h-2 bg-[#f2f4f6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
