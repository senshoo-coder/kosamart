'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryStatusBadge } from '@/components/ui/badge'
import { formatPrice, formatDateTime, getLocalStorage } from '@/lib/utils'
import type { Delivery } from '@/lib/types'

export default function DriverHistoryPage() {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  const driverUuid = getLocalStorage('cosmart_device_uuid')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('cosmart_nickname')
    localStorage.removeItem('cosmart_user')
    router.push('/login?role=driver')
  }

  useEffect(() => {
    fetch(`/api/deliveries?driver_uuid=${driverUuid ?? ''}&status=delivered,failed&limit=100`)
      .then(r => r.json())
      .then(d => { setDeliveries(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [driverUuid])

  const delivered = deliveries.filter(d => d.status === 'delivered')
  const failed = deliveries.filter(d => d.status === 'failed')
  const totalRevenue = delivered.reduce((s, d) => s + (d.order?.total_amount ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <div>
          <h1 className="text-[17px] font-bold text-[#1a1c1c]">완료 내역</h1>
          <p className="text-[11px] text-[#a3a3a3]">완료 {delivered.length}건 · 실패 {failed.length}건</p>
        </div>
        <button
          onClick={handleLogout}
          className="h-[32px] px-3 rounded-[8px] bg-[#fee2e2] text-[#b91c1c] text-[12px] font-medium border border-[#fecaca]"
        >
          로그아웃
        </button>
      </header>

      <div className="px-4 pt-4 space-y-4 pb-4">
        {/* 요약 통계 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '완료', value: `${delivered.length}건`, accent: '#10b981', bg: '#d1fae5' },
            { label: '실패', value: `${failed.length}건`,   accent: '#b91c1c', bg: '#fee2e2' },
            { label: '처리 금액', value: formatPrice(totalRevenue), accent: '#1a1c1c', bg: '#f2f4f6' },
          ].map(({ label, value, accent, bg }) => (
            <div
              key={label}
              className="bg-white rounded-[8px] p-3 text-center"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <p className="text-[14px] font-bold" style={{ color: accent }}>{value}</p>
              <p className="text-[11px] text-[#a3a3a3] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* 내역 목록 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-5xl">📋</span>
            <p className="text-[15px] font-semibold text-[#1a1c1c]">완료 내역이 없습니다</p>
            <p className="text-[12px] text-[#a3a3a3]">배달을 완료하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map(delivery => {
              const isDone = delivery.status === 'delivered'
              return (
                <div
                  key={delivery.id}
                  className="bg-white rounded-[8px] overflow-hidden"
                  style={{
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    borderLeft: `3px solid ${isDone ? '#10b981' : '#ef4444'}`,
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[14px] font-bold text-[#1a1c1c]">{delivery.order?.kakao_nickname}</p>
                        <p className="text-[11px] text-[#a3a3a3] font-mono">{delivery.order?.order_number}</p>
                      </div>
                      <DeliveryStatusBadge status={delivery.status} />
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-start gap-2">
                        <span className="text-[12px] mt-0.5 flex-shrink-0">📍</span>
                        <p className="text-[12px] text-[#3c4a42]">{delivery.order?.delivery_address}</p>
                      </div>
                      {delivery.order && (
                        <p className="text-[13px] font-bold text-[#10b981] ml-5">
                          {formatPrice(delivery.order.total_amount)}
                        </p>
                      )}
                    </div>

                    {delivery.status === 'failed' && delivery.failed_reason && (
                      <div className="bg-[#fee2e2] border border-[#fecaca] rounded-[8px] px-3 py-2 mb-3">
                        <p className="text-[11px] text-[#b91c1c]">⚠️ {delivery.failed_reason}</p>
                      </div>
                    )}

                    {delivery.driver_memo && (
                      <div className="bg-[#f9f9f9] rounded-[8px] px-3 py-2 mb-3">
                        <p className="text-[11px] text-[#3c4a42]">📝 {delivery.driver_memo}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-[#f5f5f5]">
                      <span className="text-[11px] font-medium" style={{ color: isDone ? '#10b981' : '#b91c1c' }}>
                        {isDone ? '배달 완료' : '배달 실패'}
                      </span>
                      <span className="text-[11px] text-[#a3a3a3]">
                        {delivery.delivered_at
                          ? formatDateTime(delivery.delivered_at)
                          : delivery.updated_at
                          ? formatDateTime(delivery.updated_at)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
