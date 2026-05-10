'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryStatusBadge } from '@/components/ui/badge'
import { formatPrice, getLocalStorage, setLocalStorage, generateDeviceUUID } from '@/lib/utils'
import type { Delivery } from '@/lib/types'

// 수락 전: 동 이름까지만 표시, 상세 주소 숨김
function maskDeliveryAddress(address?: string | null): string {
  if (!address || address === '매장 픽업') return address ?? ''
  // "신영동 302동 101호" → "신영동 302동 ***"
  // "종로구 신영동 302동 101호" → "종로구 신영동 302동 ***"
  const masked = address.replace(/(\d+동)\s*\d+호.*$/, '$1 ***')
  // 동 번호 없이 상세주소만 있는 경우 (예: "신영동 빌라 101호")
  return masked === address ? address.replace(/\d+호.*$/, '***') : masked
}

export default function DriverDeliveriesPage() {
  const router = useRouter()
  const [available, setAvailable] = useState<Delivery[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [completeModal, setCompleteModal] = useState<Delivery | null>(null)
  const [issueModal, setIssueModal] = useState<Delivery | null>(null)
  const [driverMemo, setDriverMemo] = useState('')
  const [issueReason, setIssueReason] = useState('')
  const [issueDetail, setIssueDetail] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [heldIds, setHeldIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [showHeld, setShowHeld] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const driverUuid = (() => {
    let uuid = getLocalStorage('cosmart_device_uuid')
    if (!uuid) {
      uuid = generateDeviceUUID()
      setLocalStorage('cosmart_device_uuid', uuid)
    }
    return uuid
  })()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('cosmart_nickname')
    localStorage.removeItem('cosmart_user')
    router.push('/login?role=driver')
  }

  useEffect(() => { loadAll() }, [])

  function loadAll() {
    setLoading(true)
    Promise.all([
      fetch('/api/deliveries?status=pending', { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/deliveries?driver_uuid=${driverUuid ?? ''}&status=assigned,picked_up,delivering`, { cache: 'no-store' }).then(r => r.json()),
    ]).then(([avail, mine]) => {
      const isPickup = (d: Delivery) => d.order?.delivery_address === '매장 픽업'
      setAvailable((avail.data || []).filter((d: Delivery) => !isPickup(d)))
      setDeliveries((mine.data || []).filter((d: Delivery) => !isPickup(d)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  async function handleClaim(deliveryId: string) {
    setActionLoading(deliveryId)
    const res = await fetch(`/api/deliveries/${deliveryId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_uuid: driverUuid }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error || '배달 수락 실패') }
    loadAll()
    setActionLoading(null)
  }

  function handleHold(deliveryId: string) {
    setHeldIds(prev => new Set([...prev, deliveryId]))
  }

  function handleUnhold(deliveryId: string) {
    setHeldIds(prev => { const next = new Set(prev); next.delete(deliveryId); return next })
  }

  function handleDelete(deliveryId: string) {
    setHeldIds(prev => { const next = new Set(prev); next.delete(deliveryId); return next })
    setDeletedIds(prev => new Set([...prev, deliveryId]))
  }

  async function handlePickup(deliveryId: string) {
    setActionLoading(deliveryId)
    await fetch(`/api/deliveries/${deliveryId}/pickup`, { method: 'POST' })
    loadAll()
    setActionLoading(null)
  }

  function closeCompleteModal() {
    setCompleteModal(null)
    setDriverMemo('')
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleComplete() {
    if (!completeModal) return
    setUploading(true)
    setActionLoading(completeModal.id)
    let photoUrl: string | null = null
    if (photoFile) {
      const formData = new FormData()
      formData.append('file', photoFile)
      formData.append('deliveryId', completeModal.id)
      const uploadRes = await fetch('/api/deliveries/upload-photo', { method: 'POST', body: formData })
      if (uploadRes.ok) {
        const { path } = await uploadRes.json()
        photoUrl = path
      } else {
        const err = await uploadRes.json().catch(() => ({}))
        alert(`사진 업로드 실패: ${err.error || '스토리지 오류'}`)
        setUploading(false)
        setActionLoading(null)
        return
      }
    }
    const res = await fetch(`/api/deliveries/${completeModal.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_memo: driverMemo, driver_photo_url: photoUrl }),
    })
    setUploading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(`완료 처리 실패: ${d.error || '서버 오류'}`)
      setActionLoading(null)
      return
    }
    closeCompleteModal()
    loadAll()
    setActionLoading(null)
  }

  async function handleIssue() {
    if (!issueModal || !issueReason) return
    if (issueReason === '기타' && !issueDetail.trim()) {
      alert('기타 사유의 세부 내용을 입력해주세요')
      return
    }
    const finalReason = issueReason === '기타'
      ? `기타: ${issueDetail.trim()}`
      : (issueDetail.trim() ? `${issueReason} — ${issueDetail.trim()}` : issueReason)
    setActionLoading(issueModal.id)
    await fetch(`/api/deliveries/${issueModal.id}/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ failed_reason: finalReason }),
    })
    setIssueModal(null)
    setIssueReason('')
    setIssueDetail('')
    loadAll()
    setActionLoading(null)
  }

  const inProgressCount = deliveries.filter(d => ['picked_up', 'delivering'].includes(d.status)).length
  const activeAvailable = available.filter(d => !heldIds.has(d.id) && !deletedIds.has(d.id))
  const heldDeliveries = available.filter(d => heldIds.has(d.id) && !deletedIds.has(d.id))

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <div>
          <h1 className="text-[17px] font-bold text-[#1a1c1c]">배달 목록</h1>
          <p className="text-[11px] text-[#a3a3a3]">
            수락가능 {activeAvailable.length}건 · 배달중 {inProgressCount}건{heldDeliveries.length > 0 ? ` · 보류 ${heldDeliveries.length}건` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="h-[32px] px-3 rounded-[8px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]"
          >
            새로고침
          </button>
          <button
            onClick={handleLogout}
            className="h-[32px] px-3 rounded-[8px] bg-[#fee2e2] text-[#b91c1c] text-[12px] font-medium border border-[#fecaca]"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5 pb-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 수락 가능한 배달 */}
            {activeAvailable.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
                  <h2 className="text-[13px] font-bold text-[#1a1c1c]">수락 가능한 배달</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46]">
                    {activeAvailable.length}건
                  </span>
                </div>
                <div className="space-y-3">
                  {activeAvailable.map(delivery => (
                    <AvailableCard
                      key={delivery.id}
                      delivery={delivery}
                      onClaim={() => handleClaim(delivery.id)}
                      onHold={() => handleHold(delivery.id)}
                      onDelete={() => handleDelete(delivery.id)}
                      loading={actionLoading === delivery.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 보류한 배달 */}
            {heldDeliveries.length > 0 && (
              <section>
                <button
                  onClick={() => setShowHeld(v => !v)}
                  className="flex items-center gap-2 mb-3 w-full text-left"
                >
                  <span className="w-2 h-2 bg-[#94a3b8] rounded-full" />
                  <h2 className="text-[13px] font-bold text-[#64748b]">보류한 배달</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b]">
                    {heldDeliveries.length}건
                  </span>
                  <span className="ml-auto text-[11px] text-[#94a3b8]">{showHeld ? '접기 ▲' : '펼치기 ▼'}</span>
                </button>
                {showHeld && (
                  <div className="space-y-3">
                    {heldDeliveries.map(delivery => (
                      <AvailableCard
                        key={delivery.id}
                        delivery={delivery}
                        onClaim={() => handleClaim(delivery.id)}
                        onHold={() => handleUnhold(delivery.id)}
                        onDelete={() => handleDelete(delivery.id)}
                        loading={actionLoading === delivery.id}
                        held
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 내 배달 */}
            <section>
              {deliveries.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse" />
                  <h2 className="text-[13px] font-bold text-[#1a1c1c]">내 배달</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309]">
                    {deliveries.length}건
                  </span>
                </div>
              )}
              {deliveries.length === 0 && available.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <span className="text-5xl">✅</span>
                  <p className="text-[15px] font-semibold text-[#1a1c1c]">오늘 배달 없음</p>
                  <p className="text-[12px] text-[#a3a3a3]">새로 들어오는 주문을 기다려주세요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveries.map(delivery => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onPickup={() => handlePickup(delivery.id)}
                      onComplete={() => setCompleteModal(delivery)}
                      onIssue={() => setIssueModal(delivery)}
                      loading={actionLoading === delivery.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* 배달 완료 모달 (바텀시트) */}
      {completeModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCompleteModal} />
          <div className="relative w-full bg-white rounded-t-[20px] p-5">
            <div className="w-10 h-1 bg-[#e8e8e8] rounded-full mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-1">배달 완료 처리</h3>
            <p className="text-[12px] text-[#a3a3a3] mb-4">📍 {completeModal.order?.delivery_address}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />

            {photoPreview ? (
              <div className="relative mb-3">
                <img src={photoPreview} alt="배달 완료 사진" className="w-full h-40 object-cover rounded-[12px]" />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-black/50 rounded-full w-7 h-7 flex items-center justify-center text-white text-xs"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-3 rounded-[12px] p-3 flex items-center gap-3 text-left border border-dashed border-[#d1d5db] bg-[#f9f9f9]"
              >
                <span className="text-2xl">📸</span>
                <div>
                  <p className="text-[13px] text-[#1a1c1c] font-medium">배달 완료 사진 찍기</p>
                  <p className="text-[11px] text-[#a3a3a3]">선택사항 · 탭하여 카메라 열기</p>
                </div>
              </button>
            )}

            <textarea
              value={driverMemo}
              onChange={e => setDriverMemo(e.target.value)}
              placeholder="특이사항 메모 (선택)"
              className="w-full bg-[#f2f4f6] border border-transparent rounded-[12px] px-4 py-3 text-[#1a1c1c] text-[13px] placeholder-[#a3a3a3] outline-none focus:border-[#10b981] focus:bg-white resize-none h-20 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={closeCompleteModal}
                className="flex-1 h-[48px] rounded-[12px] bg-[#f2f4f6] text-[#1a1c1c] text-[14px] font-medium border border-[#e8e8e8]"
              >
                취소
              </button>
              <button
                onClick={handleComplete}
                disabled={uploading || !!actionLoading}
                className="flex-1 h-[48px] rounded-[12px] bg-[#10b981] text-white text-[14px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    업로드 중...
                  </>
                ) : '완료 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이슈 보고 모달 */}
      {issueModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIssueModal(null); setIssueReason(''); setIssueDetail('') }} />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6">
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-1">배달 이슈 보고</h3>
            <p className="text-[11px] text-[#a3a3a3] mb-4">사장님께 전달되어 재시도 또는 종료를 결정합니다</p>
            <div className="space-y-2 mb-4">
              {['수취인 부재', '공동현관 비밀번호 오류', '주소 오류 / 오배송', '기타'].map(reason => (
                <label
                  key={reason}
                  className="flex items-center gap-3 rounded-[12px] p-3 cursor-pointer border transition-colors"
                  style={{
                    background: issueReason === reason ? '#fef3c7' : '#f9f9f9',
                    borderColor: issueReason === reason ? '#fde68a' : '#eee',
                  }}
                >
                  <input
                    type="radio"
                    name="issue"
                    value={reason}
                    checked={issueReason === reason}
                    onChange={() => setIssueReason(reason)}
                    className="accent-[#f59e0b]"
                  />
                  <span className="text-[13px] text-[#1a1c1c]">{reason}</span>
                </label>
              ))}
            </div>
            {issueReason && (
              <div className="mb-4">
                <label className="block text-[12px] text-[#3c4a42] font-semibold mb-1.5">
                  {issueReason === '기타' ? '세부 내용 (필수)' : '추가 메모 (선택)'}
                </label>
                <textarea
                  value={issueDetail}
                  onChange={e => setIssueDetail(e.target.value)}
                  placeholder={issueReason === '기타'
                    ? '예) 엘리베이터 고장, 반려동물 짖음 등'
                    : '사장님께 전달할 추가 정보가 있으면 입력'}
                  rows={3}
                  className="w-full bg-[#f9f9f9] border border-[#eee] rounded-[10px] px-3 py-2 text-[13px] text-[#1a1c1c] placeholder-[#a3a3a3] outline-none focus:border-[#f59e0b] focus:bg-white resize-none"
                  maxLength={300}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setIssueModal(null); setIssueReason(''); setIssueDetail('') }}
                className="flex-1 h-[48px] rounded-[12px] bg-[#f2f4f6] text-[#1a1c1c] text-[14px] font-medium border border-[#e8e8e8]"
              >
                취소
              </button>
              <button
                onClick={handleIssue}
                disabled={!!actionLoading || !issueReason}
                className="flex-1 h-[48px] rounded-[12px] bg-[#ef4444] text-white text-[14px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '사장님께 보고'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AvailableCard({ delivery, onClaim, onHold, onDelete, loading, held = false }: {
  delivery: Delivery
  onClaim: () => void
  onHold: () => void
  onDelete: () => void
  loading: boolean
  held?: boolean
}) {
  const order = delivery.order
  const borderColor = held ? '#94a3b8' : '#10b981'
  return (
    <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${borderColor}` }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[14px] font-bold text-[#1a1c1c]">{order?.kakao_nickname}</p>
            <p className="text-[11px] text-[#a3a3a3] font-mono">{order?.order_number}</p>
          </div>
          {held ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] font-medium">보류중</span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46] font-medium">수락가능</span>
          )}
        </div>
        <div className="space-y-1.5 mb-3">
          {order?.store_name && (
            <p className="text-[12px] font-semibold text-[#1d4ed8] ml-0">🏪 {order.store_name}</p>
          )}
          <div className="flex items-start gap-2">
            <span className="text-[13px] mt-0.5 flex-shrink-0">📍</span>
            <div>
              <p className="text-[13px] text-[#1a1c1c] font-medium">{maskDeliveryAddress(order?.delivery_address)}</p>
              <p className="text-[10px] text-[#94a3b8] mt-0.5">수락 후 전체 주소 및 연락처 공개</p>
            </div>
          </div>
          {order?.delivery_memo && (
            <p className="text-[11px] text-[#b45309] ml-5">⚠️ {order.delivery_memo}</p>
          )}
          {delivery.failed_reason && (
            <div className="ml-5 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-2.5 py-1.5">
              <p className="text-[10px] text-[#b91c1c] font-semibold mb-0.5">⚠ 이전 실패 사유</p>
              <p className="text-[11px] text-[#7f1d1d] whitespace-pre-wrap">{delivery.failed_reason}</p>
            </div>
          )}
          {order?.owner_memo && (
            <div className="ml-5 rounded-[8px] bg-[#ecfeff] border border-[#a5f3fc] px-2.5 py-1.5">
              <p className="text-[10px] text-[#0e7490] font-semibold mb-0.5">📝 사장님 메모</p>
              <p className="text-[11px] text-[#155e75] whitespace-pre-wrap">{order.owner_memo}</p>
            </div>
          )}
          <p className="text-[11px] text-[#a3a3a3] ml-5">
            📦 {order?.items?.map(i => i.product_name).join(', ')}
          </p>
          {order && (
            <p className="text-[14px] font-bold text-[#10b981] ml-5">{formatPrice(order.total_amount)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClaim}
            disabled={loading}
            className="flex-1 h-[42px] rounded-[10px] bg-[#10b981] text-white text-[13px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : '🙋 배달 수락하기'}
          </button>
          <button
            onClick={onHold}
            disabled={loading}
            className="h-[42px] px-3 rounded-[10px] text-[13px] font-semibold disabled:opacity-60"
            style={held
              ? { background: '#e0f2fe', color: '#0369a1' }
              : { background: '#f1f5f9', color: '#64748b' }
            }
          >
            {held ? '보류 해제' : '⏸ 보류'}
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="h-[42px] px-3 rounded-[10px] text-[13px] font-semibold disabled:opacity-60 bg-[#fee2e2] text-[#b91c1c]"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

function DeliveryCard({ delivery, onPickup, onComplete, onIssue, loading }: {
  delivery: Delivery
  onPickup: () => void
  onComplete: () => void
  onIssue: () => void
  loading: boolean
}) {
  const isUrgent = delivery.order?.delivery_memo?.includes('긴급') || false
  const order = delivery.order
  const accentColor = isUrgent ? '#ef4444' : '#f59e0b'

  return (
    <div
      className="bg-white rounded-[8px] overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold text-[#1a1c1c]">{order?.kakao_nickname}</p>
              {isUrgent && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] font-medium">⚡ 긴급</span>
              )}
            </div>
            <p className="text-[11px] text-[#a3a3a3] font-mono">{order?.order_number}</p>
          </div>
          <DeliveryStatusBadge status={delivery.status} />
        </div>

        <div className="space-y-1.5 mb-3">
          {order?.store_name && (
            <p className="text-[12px] font-semibold text-[#1d4ed8]">🏪 {order.store_name}</p>
          )}
          <div className="flex items-start gap-2">
            <span className="text-[13px] mt-0.5 flex-shrink-0">📍</span>
            <p className="text-[13px] text-[#1a1c1c] font-medium">{order?.delivery_address}</p>
          </div>
          {order?.delivery_memo && (
            <p className="text-[11px] text-[#b45309] ml-5">⚠️ {order.delivery_memo}</p>
          )}
          {delivery.failed_reason && (
            <div className="ml-5 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-2.5 py-1.5">
              <p className="text-[10px] text-[#b91c1c] font-semibold mb-0.5">⚠ 이전 실패 사유</p>
              <p className="text-[11px] text-[#7f1d1d] whitespace-pre-wrap">{delivery.failed_reason}</p>
            </div>
          )}
          {order?.owner_memo ? (
            <div className="ml-5 rounded-[8px] bg-[#ecfeff] border border-[#a5f3fc] px-2.5 py-1.5">
              <p className="text-[10px] text-[#0e7490] font-semibold mb-0.5">📝 사장님 메모</p>
              <p className="text-[11px] text-[#155e75] whitespace-pre-wrap">{order.owner_memo}</p>
            </div>
          ) : (
            <p className="text-[10px] text-[#94a3b8] ml-5">[debug] owner_memo: {JSON.stringify(order?.owner_memo)}</p>
          )}
          <p className="text-[11px] text-[#a3a3a3] ml-5">
            📦 {order?.items?.map(i => i.product_name).join(', ')}
          </p>
          {order && (
            <p className="text-[14px] font-bold text-[#10b981] ml-5">{formatPrice(order.total_amount)}</p>
          )}
        </div>

        <div className="flex gap-2">
          {delivery.status === 'assigned' && (
            <button
              onClick={onPickup}
              disabled={loading}
              className="flex-1 h-[40px] rounded-[10px] bg-[#10b981] text-white text-[12px] font-semibold disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📦 픽업 완료'}
            </button>
          )}
          {['picked_up', 'delivering'].includes(delivery.status) && (
            <button
              onClick={onComplete}
              disabled={loading}
              className="flex-1 h-[40px] rounded-[10px] bg-[#10b981] text-white text-[12px] font-semibold disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✅ 배달 완료'}
            </button>
          )}
          {order?.customer?.phone && (
            <a
              href={`tel:${order.customer.phone}`}
              className="w-[40px] h-[40px] rounded-[10px] bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center text-base"
            >
              📞
            </a>
          )}
          <button
            onClick={onIssue}
            className="w-[40px] h-[40px] rounded-[10px] bg-[#fef3c7] text-[#b45309] flex items-center justify-center text-base"
          >
            ⚠️
          </button>
        </div>
      </div>
    </div>
  )
}
