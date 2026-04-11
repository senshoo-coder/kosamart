'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DeliveryStatusBadge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { Delivery } from '@/lib/types'

const STATUS_TABS = [
  { key: 'all',                    label: '전체' },
  { key: 'pending',                label: '대기' },
  { key: 'assigned',               label: '배정됨' },
  { key: 'picked_up,delivering',   label: '배달중' },
  { key: 'delivered',              label: '완료' },
  { key: 'failed',                 label: '실패' },
]

interface Driver {
  id: string
  nickname: string
  device_uuid: string
  phone?: string
}

export default function OwnerDeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [assignModal, setAssignModal] = useState<{ deliveryId: string; orderNumber: string } | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const loadDeliveries = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (activeTab !== 'all') params.set('status', activeTab)
    const res = await fetch(`/api/deliveries?${params}`)
    const json = await res.json()
    setDeliveries(json.data ?? [])
    setLoading(false)
  }, [activeTab])

  useEffect(() => { loadDeliveries() }, [loadDeliveries])

  async function openAssignModal(deliveryId: string, orderNumber: string) {
    setAssignModal({ deliveryId, orderNumber })
    setDriversLoading(true)
    const res = await fetch('/api/users?role=driver')
    const json = await res.json()
    setDrivers(json.data ?? [])
    setDriversLoading(false)
  }

  async function handleAssign(driverUuid: string) {
    if (!assignModal) return
    setAssigning(true)
    const res = await fetch(`/api/deliveries/${assignModal.deliveryId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_uuid: driverUuid }),
    })
    if (!res.ok) {
      const d = await res.json()
      alert(`오류: ${d.error || '배정 실패'}`)
    }
    setAssigning(false)
    setAssignModal(null)
    await loadDeliveries()
  }

  const stats = {
    pending: deliveries.filter(d => d.status === 'pending').length,
    assigned: deliveries.filter(d => d.status === 'assigned').length,
    inProgress: deliveries.filter(d => ['picked_up', 'delivering'].includes(d.status)).length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    failed: deliveries.filter(d => d.status === 'failed').length,
  }

  const STAT_CARDS = [
    { label: '배정 대기', value: stats.pending,     accent: '#a3a3a3', bg: '#f2f4f6' },
    { label: '배정됨',   value: stats.assigned,    accent: '#b45309', bg: '#fef3c7' },
    { label: '배달중',   value: stats.inProgress,  accent: '#1d4ed8', bg: '#dbeafe' },
    { label: '완료',     value: stats.delivered,   accent: '#10b981', bg: '#d1fae5' },
    { label: '실패',     value: stats.failed,      accent: '#b91c1c', bg: '#fee2e2' },
  ]

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">배달 관리</h1>
          <p className="text-[12px] text-[#a3a3a3]">배달 현황 모니터링 및 기사 배정</p>
        </div>
        <button
          onClick={loadDeliveries}
          className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]"
        >
          새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-5 gap-2">
        {STAT_CARDS.map(({ label, value, accent, bg }) => (
          <div key={label} className="bg-white rounded-[8px] p-3 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p className="text-[20px] font-bold" style={{ color: accent }}>{value}</p>
            <p className="text-[10px] text-[#a3a3a3] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-shrink-0 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors whitespace-nowrap"
            style={activeTab === tab.key
              ? { background: '#10b981', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 배달 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white rounded-[8px] p-12 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-4xl mb-3">📦</p>
          <p className="text-[#a3a3a3] text-[13px]">해당 상태의 배달이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f5f5f5]">
                {['주문번호', '고객명', '배달주소', '기사', '상태', '배정시간', '액션'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9f9f9]">
              {deliveries.map(delivery => (
                <tr key={delivery.id} className="hover:bg-[#f9f9f9] transition-colors">
                  <td className="px-4 py-3 text-[11px] text-[#a3a3a3] font-mono">
                    {delivery.order?.order_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#1a1c1c] font-semibold">
                    {delivery.order?.kakao_nickname ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#3c4a42] max-w-[180px] truncate">
                    {delivery.order?.delivery_address ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#3c4a42]">
                    {delivery.driver?.nickname ?? <span className="text-[#a3a3a3]">미배정</span>}
                  </td>
                  <td className="px-4 py-3">
                    <DeliveryStatusBadge status={delivery.status} />
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#a3a3a3]">
                    {delivery.assigned_at ? formatDateTime(delivery.assigned_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {delivery.status === 'pending' && (
                      <Button size="sm" onClick={() => openAssignModal(delivery.id, delivery.order?.order_number ?? delivery.id)}>
                        기사 배정
                      </Button>
                    )}
                    {delivery.status === 'failed' && (
                      <span className="text-[11px] text-[#b91c1c]">{delivery.failed_reason ?? '실패'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 기사 선택 모달 */}
      {assignModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setAssignModal(null) }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6">
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-1">기사 배정</h3>
            <p className="text-[11px] text-[#a3a3a3] mb-4 font-mono">{assignModal.orderNumber}</p>

            {driversLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[#3c4a42] text-[13px]">등록된 기사가 없습니다</p>
                <p className="text-[#a3a3a3] text-[11px] mt-1">role=driver 계정을 먼저 등록해주세요</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {drivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => handleAssign(driver.device_uuid)}
                    disabled={assigning}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-[#f9f9f9] hover:bg-[#f0fdf4] transition-colors disabled:opacity-50 border border-[#eee]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-[#d1fae5] flex items-center justify-center text-sm">🚴</div>
                      <div className="text-left">
                        <p className="text-[13px] text-[#1a1c1c] font-semibold">{driver.nickname}</p>
                        {driver.phone && <p className="text-[11px] text-[#a3a3a3]">{driver.phone}</p>}
                      </div>
                    </div>
                    <span className="text-[#10b981] text-[12px] font-semibold">배정 →</span>
                  </button>
                ))}
              </div>
            )}

            <Button variant="secondary" className="w-full" onClick={() => setAssignModal(null)}>취소</Button>
          </div>
        </div>
      )}
    </div>
  )
}
