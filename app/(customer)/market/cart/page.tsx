'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketCart } from '@/lib/cart/MarketCartContext'
import { getStore } from '@/lib/market-data'
import { getLocalStorage, setLocalStorage, generateDeviceUUID } from '@/lib/utils'

const MAX_QUANTITY = 10
const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/
const DEFAULT_MIN_ORDER = 5000

const DAY_LABEL: Record<string, string> = { sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토' }
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat']

function isClosedToday(storeInfo: any): boolean {
  const today = new Date()
  const todayKey = DAY_KEYS[today.getDay()]
  const todayStr = today.toISOString().slice(0, 10)
  const weekly: string[] = storeInfo?.weekly_closed || []
  const dates: string[] = storeInfo?.closed_dates || []
  return weekly.includes(todayKey) || dates.includes(todayStr)
}

function closedReason(storeInfo: any): string {
  const today = new Date()
  const todayKey = DAY_KEYS[today.getDay()]
  const todayStr = today.toISOString().slice(0, 10)
  const weekly: string[] = storeInfo?.weekly_closed || []
  const dates: string[] = storeInfo?.closed_dates || []
  if (weekly.includes(todayKey)) return `매주 ${DAY_LABEL[todayKey]}요일 휴무`
  if (dates.includes(todayStr)) return `${todayStr} 임시 휴무`
  return '오늘 휴무'
}

// 가게 운영시간 '11:00~23:00' 파싱
function parseHours(hours: string): [number, number] | null {
  const m = hours.match(/^(\d{1,2}):(\d{2})~(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return [parseInt(m[1]), parseInt(m[3])]
}

// 가게 한 곳의 운영시간 기반 슬롯 생성
function buildSlotsForStore(hours: string | undefined): { value: string; label: string }[] {
  const parsed = hours ? parseHours(hours) : null
  const start = parsed ? parsed[0] : 9
  const end   = parsed ? parsed[1] : 21
  const currentH = new Date().getHours()
  const slots: { value: string; label: string }[] = []
  for (let h = start; h < end; h++) {
    if (h < currentH) continue
    const s = String(h).padStart(2, '0')
    const e = String(h + 1).padStart(2, '0')
    slots.push({ value: `${h}-${h + 1}`, label: `${s}:00 ~ ${e}:00` })
  }
  return slots
}

const ALLOWED_DONGS = ['신영동', '홍지동', '부암동', '평창동', '구기동']

export default function CartPage() {
  const router = useRouter()
  const cart = useMarketCart()
  const [dong, setDong] = useState(() => {
    if (typeof window === 'undefined') return ''
    return getLocalStorage('cosmart_dong') || ''
  })
  const [address, setAddress] = useState(() => {
    if (typeof window === 'undefined') return ''
    return getLocalStorage('cosmart_address') || ''
  })
  const [phone, setPhone] = useState(() => {
    if (typeof window === 'undefined') return ''
    return getLocalStorage('cosmart_phone') || ''
  })
  const [pickupType, setPickupType] = useState<'delivery' | 'pickup'>('delivery')
  // 가게별 희망 수령 시간 { storeId: slotValue }
  const [timeSlots, setTimeSlots] = useState<Record<string, string>>({})
  const [memo, setMemo] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showBankConfirm, setShowBankConfirm] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 동적 가게 정보 (bank_account 등) — /api/market/stores에서 로드
  const [dynamicStores, setDynamicStores] = useState<Record<string, any>>({})

  const nickname = typeof window !== 'undefined' ? getLocalStorage('cosmart_nickname') : null
  const storeIds = Object.keys(cart.storeGroups)

  // 동적 가게 정보 로드
  useEffect(() => {
    fetch('/api/market/stores')
      .then(r => r.json())
      .then(({ data }) => {
        if (!Array.isArray(data)) return
        const map: Record<string, any> = {}
        data.forEach((s: any) => { map[s.id] = s })
        setDynamicStores(map)
        // 가게별 첫 번째 유효 슬롯으로 초기화
        const initial: Record<string, string> = {}
        storeIds.forEach(sid => {
          const hours = map[sid]?.hours || getStore(sid)?.hours
          const slots = buildSlotsForStore(hours)
          initial[sid] = slots[0]?.value ?? ''
        })
        setTimeSlots(initial)
      })
      .catch(() => {})
  }, [storeIds.join(',')])

  // 가게별 최소 주문금액 (동적 > 정적 > 기본값)
  function getMinOrder(sid: string): number {
    return dynamicStores[sid]?.minOrder ?? getStore(sid)?.minOrder ?? DEFAULT_MIN_ORDER
  }
  const belowMinStores = storeIds.filter(sid => cart.getStoreTotal(sid) < getMinOrder(sid))
  const hasWarnings = belowMinStores.length > 0

  // 오늘 휴무인 가게 목록 (동적 정보 기준)
  const closedStores = storeIds.filter(sid => isClosedToday(dynamicStores[sid]))

  const totalDeliveryFee = storeIds.reduce((sum, sid) => {
    const fee = dynamicStores[sid]?.deliveryFee ?? getStore(sid)?.deliveryFee ?? 0
    return sum + fee
  }, 0)

  // 가게별 슬롯 계산
  const storeSlotsMap = useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {}
    storeIds.forEach(sid => {
      const hours = dynamicStores[sid]?.hours || getStore(sid)?.hours
      map[sid] = buildSlotsForStore(hours)
    })
    return map
  }, [storeIds.join(','), dynamicStores])

  const someStoreNoSlots = storeIds.some(sid => storeSlotsMap[sid]?.length === 0)

  function validateAndConfirm() {
    if (closedStores.length > 0) {
      const names = closedStores.map(sid => `${dynamicStores[sid]?.name || getStore(sid)?.name || sid}(${closedReason(dynamicStores[sid])})`).join(', ')
      alert('휴무 중인 가게가 있어 주문할 수 없습니다:\n' + names)
      return
    }
    if (someStoreNoSlots) { alert('일부 가게의 운영시간이 종료되었습니다. 내일 다시 주문해주세요.'); return }
    if (!phone.trim()) { alert('전화번호를 입력해주세요'); return }
    if (!PHONE_REGEX.test(phone.replace(/\s/g, ''))) { alert('올바른 전화번호 형식을 입력해주세요\n예: 010-1234-5678'); return }
    if (pickupType === 'delivery' && !dong) { alert('배송 동을 선택해주세요'); return }
    if (pickupType === 'delivery' && !address.trim()) { alert('상세 주소를 입력해주세요'); return }
    if (!consent) { alert('개인정보 동의가 필요합니다'); return }
    if (!nickname) { alert('로그인이 필요합니다'); return }
    if (hasWarnings) {
      const names = belowMinStores.map(sid => `${getStore(sid)?.name || sid}(최소 ${getMinOrder(sid).toLocaleString()}원)`).join(', ')
      alert('최소 주문금액 미달: ' + names)
      return
    }
    setShowBankConfirm(true)
  }

  async function handleOrder() {
    setShowConfirm(false)
    if (someStoreNoSlots) {
      alert('일부 가게의 운영시간이 종료되었습니다. 내일 다시 주문해주세요.')
      return
    }
    setLoading(true)

    let deviceUuid = getLocalStorage('cosmart_device_uuid')
    if (!deviceUuid) {
      deviceUuid = generateDeviceUUID()
      setLocalStorage('cosmart_device_uuid', deviceUuid)
    }

    try {
      setLocalStorage('cosmart_phone', phone)

      const results = await Promise.all(storeIds.map(async sid => {
        const store = getStore(sid)
        const items = cart.storeGroups[sid].map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          subtotal: i.unit_price * i.quantity,
        }))
        const total_amount = items.reduce((s, i) => s + i.subtotal, 0)
        const slotValue = timeSlots[sid] ?? ''
        const slotLabel = storeSlotsMap[sid]?.find(t => t.value === slotValue)?.label || slotValue

        // Build scheduled_at: today's date at the slot start hour (local time)
        let scheduled_at: string | undefined
        if (slotValue) {
          const startH = parseInt(slotValue.split('-')[0], 10)
          if (!isNaN(startH)) {
            const d = new Date()
            d.setHours(startH, 0, 0, 0)
            scheduled_at = d.toISOString()
          }
        }

        const res = await fetch('/api/market/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: sid,
            store_name: (dynamicStores[sid]?.name) || store?.name || sid,
            device_uuid: deviceUuid,
            nickname,
            customer_phone: phone.trim(),
            pickup_type: pickupType,
            delivery_address: pickupType === 'delivery' ? `종로구 ${dong} ${address}` : '매장 픽업',
            delivery_memo: `희망시간 ${slotLabel}${memo ? ' / ' + memo : ''}`,
            scheduled_at,
            items,
            total_amount,
          }),
        })
        return { ok: res.ok, json: await res.json().catch(() => null), store: store?.name || sid }
      }))

      const failed = results.filter(r => !r.ok)
      if (failed.length === 0) {
        if (pickupType === 'delivery') {
          setLocalStorage('cosmart_dong', dong)
          setLocalStorage('cosmart_address', address)
        }
        cart.clearAll()
        setShowSuccess(true)
        successTimerRef.current = setTimeout(() => {
          setShowSuccess(false)
          router.push('/orders')
        }, 5000)
      } else {
        alert('일부 주문 실패: ' + failed.map(f => f.store).join(', '))
      }
    } catch {
      alert('\uC8FC\uBB38 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4')
    }
    setLoading(false)
  }

  if (cart.totalItems === 0) {
    return (
      <div className="min-h-screen bg-[#f9f9f9]">
        <header className="sticky top-0 z-40 bg-white border-b border-[#eee] flex items-center px-4 h-[56px]">
          <button type="button" onClick={() => router.push('/market')} className="text-xl w-8">{'\u2190'}</button>
          <h1 className="flex-1 text-center text-[15px] font-bold text-[#1a1c1c]">{'\uC7A5\uBC14\uAD6C\uB2C8'}</h1>
          <div className="w-8" />
        </header>
        <div className="flex flex-col items-center justify-center pt-32 gap-3">
          <span className="text-6xl">{'\uD83D\uDED2'}</span>
          <p className="text-[16px] font-bold text-[#1a1c1c]">{'\uC7A5\uBC14\uAD6C\uB2C8\uAC00 \uBE44\uC5B4 \uC788\uC5B4\uC694'}</p>
          <p className="text-[13px] text-[#a3a3a3]">{'\uC0C1\uC810\uAC00\uC5D0\uC11C \uC0C1\uD488\uC744 \uB2F4\uC544\uBCF4\uC138\uC694'}</p>
          <button onClick={() => router.push('/market')}
            className="mt-4 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-[#10b981]">
            {'\uC0C1\uC810\uAC00 \uB458\uB7EC\uBCF4\uAE30'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#eee] flex items-center px-4 h-[56px]">
        <button type="button" onClick={() => { if (confirm('\uC7A5\uBC14\uAD6C\uB2C8\uB97C \uBE44\uC6B0\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) cart.clearAll() }}
          className="text-[12px] text-[#a3a3a3] w-14 text-left">{'\uC804\uCCB4\uC0AD\uC81C'}</button>
        <h1 className="flex-1 text-center text-[15px] font-bold text-[#1a1c1c]">{'\uC7A5\uBC14\uAD6C\uB2C8'}</h1>
        <button type="button" onClick={() => router.back()} className="text-xl w-14 text-right text-[#1a1c1c]">{'\u2715'}</button>
      </header>

      <div className="px-4 pt-4 pb-28 space-y-4">
        {storeIds.length > 1 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] bg-[#f0fdf8] border border-[#d1fae5]">
            <span>{'\uD83E\uDDFE'}</span>
            <p className="text-[12px] text-[#3c4a42]">
              <b className="text-[#10b981]">{storeIds.length}{'\uAC1C \uAC00\uAC8C'}</b>{'\uAC00 \uAC01\uAC01 \uB530\uB85C \uC8FC\uBB38\u00B7\uACB0\uC81C\uB429\uB2C8\uB2E4'}
            </p>
          </div>
        )}

        {storeIds.map(sid => {
          const store = getStore(sid)
          const items = cart.storeGroups[sid]
          const storeTotal = cart.getStoreTotal(sid)
          const storeBelowMin = storeTotal < getMinOrder(sid)
          const storeClosed = isClosedToday(dynamicStores[sid])

          return (
            <div key={sid} className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="px-4 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{store?.emoji || '\uD83C\uDFEA'}</span>
                  <span className="text-[14px] font-bold text-[#1a1c1c]">{store?.name || sid}</span>
                  {storeClosed && (
                    <span className="text-[10px] bg-[#fee2e2] text-[#dc2626] px-2 py-0.5 rounded-full font-bold">오늘 휴무</span>
                  )}
                </div>
                <button onClick={() => cart.clearStore(sid)} className="text-[11px] text-[#a3a3a3]">{'\uAC00\uAC8C \uC0AD\uC81C'}</button>
              </div>
              {storeClosed && (
                <div className="mx-4 mt-3 bg-[#fff1f2] border border-[#fecdd3] rounded-xl px-4 py-3">
                  <p className="text-[12px] text-[#be123c] font-medium">🚫 {closedReason(dynamicStores[sid])} — 현재 주문할 수 없습니다</p>
                </div>
              )}

              {items.map(item => (
                <div key={item.product_id} className="px-4 py-3 flex items-center gap-3 border-b border-[#f9f9f9]">
                  <div className="w-10 h-10 rounded-[6px] bg-[#f2f4f6] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.emoji
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1a1c1c] truncate">{item.product_name}</p>
                    <p className="text-[12px] text-[#a3a3a3]">{item.unit_price.toLocaleString()}{'\uC6D0'}/{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-[#e0e0e0] rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => cart.updateQuantity(item.product_id, sid, item.quantity - 1)}
                        className="w-9 h-9 text-[16px] flex items-center justify-center text-[#3c4a42] active:bg-[#f0f0f0]"
                      >−</button>
                      <span className="w-7 text-center text-[13px] font-bold text-[#1a1c1c]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => cart.updateQuantity(item.product_id, sid, Math.min(item.quantity + 1, MAX_QUANTITY))}
                        className="w-9 h-9 text-[16px] flex items-center justify-center text-[#3c4a42] active:bg-[#f0f0f0]"
                        disabled={item.quantity >= MAX_QUANTITY}
                      >+</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(item.product_id, sid, 0)}
                      className="w-8 h-8 flex items-center justify-center text-[#dc2626] text-[14px] rounded-lg bg-[#fee2e2] active:bg-[#fecaca]"
                    >🗑</button>
                  </div>
                  <p className="text-[13px] font-bold text-[#1a1c1c] w-16 text-right">{(item.unit_price * item.quantity).toLocaleString()}원</p>
                </div>
              ))}

              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#a3a3a3]">{'\uC18C\uACC4'}</span>
                  <span className="text-[14px] font-bold text-[#10b981]">{storeTotal.toLocaleString()}{'\uC6D0'}</span>
                </div>
                {storeBelowMin && (
                  <p className="text-[11px] text-[#b45309] mt-2 bg-[#fef3c7] rounded-[6px] px-3 py-1.5">
                    최소 주문금액 {getMinOrder(sid).toLocaleString()}원 미달 ({(getMinOrder(sid) - storeTotal).toLocaleString()}원 부족)
                  </p>
                )}
              </div>
            </div>
          )
        })}

        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex justify-between text-[13px] text-[#3c4a42] mb-2">
            <span>{'\uC0C1\uD488 \uD569\uACC4'}</span>
            <span className="font-semibold">{cart.totalAmount.toLocaleString()}{'\uC6D0'}</span>
          </div>
          {totalDeliveryFee > 0 && (
            <div className="flex justify-between text-[13px] text-[#3c4a42] mb-2">
              <span>{'\uBC30\uB2EC\uBE44'}</span>
              <span className="font-semibold">{totalDeliveryFee.toLocaleString()}{'\uC6D0'}</span>
            </div>
          )}
          <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[#f0f0f0]">
            <span className="text-[#1a1c1c]">{'\uCD1D \uACB0\uC81C\uAE08\uC561'}</span>
            <span className="text-[#10b981]">{(cart.totalAmount + totalDeliveryFee).toLocaleString()}{'\uC6D0'}</span>
          </div>
          {hasWarnings && (
            <p className="text-[11px] text-[#b45309] mt-2 bg-[#fef3c7] rounded-[6px] px-3 py-1.5">
              가게별 최소 주문금액 미달 가게가 있습니다
            </p>
          )}
        </div>

        <div className="bg-white rounded-[8px] p-4 space-y-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[14px] font-bold text-[#1a1c1c]">배송 정보</p>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPickupType('delivery')}
              className="py-3 px-2 rounded-xl border text-[13px] font-semibold transition-all"
              style={pickupType === 'delivery'
                ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                : { borderColor: '#e0e0e0', background: '#fafafa', color: '#3c4a42' }}>
              문앞 배송
            </button>
            <button type="button" onClick={() => setPickupType('pickup')}
              className="py-3 px-2 rounded-xl border text-[13px] font-semibold transition-all"
              style={pickupType === 'pickup'
                ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                : { borderColor: '#e0e0e0', background: '#fafafa', color: '#3c4a42' }}>
              매장 픽업
            </button>
          </div>

          {/* 전화번호 — 항상 필수 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">
              전화번호 <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[#1a1c1c] placeholder-[#c0c0c0] text-[14px] outline-none focus:border-[#10b981]"
            />
          </div>

          {pickupType === 'delivery' && (
            <>
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">
                  동 선택 <span className="text-[#dc2626]">*</span>
                  <span className="ml-1 text-[11px] text-[#10b981]">종로구</span>
                </label>
                <select
                  value={dong}
                  onChange={e => setDong(e.target.value)}
                  className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[14px] outline-none bg-white focus:border-[#10b981] appearance-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', color: dong ? '#1a1c1c' : '#c0c0c0' }}
                >
                  <option value="" disabled>배달 가능 동을 선택하세요</option>
                  {ALLOWED_DONGS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">상세 주소 <span className="text-[#dc2626]">*</span></label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="건물명, 동·호수까지 정확히"
                  className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[#1a1c1c] placeholder-[#c0c0c0] text-[14px] outline-none focus:border-[#10b981]"
                />
              </div>
            </>
          )}

          {/* 가게별 희망 수령 시간 (배송·픽업 공통) */}
          {storeIds.map(sid => {
            const storeInfo = dynamicStores[sid] || getStore(sid)
            const slots = storeSlotsMap[sid] || []
            const currentSlot = timeSlots[sid] ?? ''
            return (
              <div key={sid}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] text-[#a3a3a3]">
                    {storeInfo?.emoji || '🏪'} <span className="font-medium">{storeInfo?.name || sid}</span> 희망 수령 시간
                  </label>
                  {storeInfo?.hours && (
                    <span className="text-[11px] text-[#10b981] font-medium">운영 {storeInfo.hours}</span>
                  )}
                </div>
                {slots.length === 0 ? (
                  <div className="w-full border border-[#fca5a5] bg-[#fff1f1] rounded-xl px-4 py-3 text-[13px] text-[#dc2626]">
                    현재 운영시간이 종료되었습니다
                  </div>
                ) : (
                  <select
                    value={currentSlot}
                    onChange={e => setTimeSlots(prev => ({ ...prev, [sid]: e.target.value }))}
                    className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[14px] text-[#1a1c1c] outline-none bg-white focus:border-[#10b981] appearance-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                  >
                    {slots.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}

          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">
              {pickupType === 'pickup' ? '픽업 메모' : '배송 메모'} (선택)
            </label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder={pickupType === 'pickup' ? '방문 예정 시간 등' : '초인종 금지, 비번 등'}
              className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[#1a1c1c] placeholder-[#c0c0c0] text-[14px] outline-none focus:border-[#10b981]"
            />
          </div>
        </div>

        {/* 가게별 계좌이체 정보 */}
        {storeIds.map(sid => {
          const storeInfo = dynamicStores[sid]
          const bankAccount = storeInfo?.bank_account
          if (!bankAccount) return null
          return (
            <div key={sid} className="bg-[#f0fdf8] border border-[#d1fae5] rounded-[8px] p-4">
              <p className="text-[13px] font-semibold text-[#1a1c1c] mb-1">
                {storeInfo?.emoji} {storeInfo?.name} 계좌이체
              </p>
              <p className="text-[13px] text-[#3c4a42] font-medium">{bankAccount}</p>
              {nickname && (
                <p className="text-[12px] text-amber-600 mt-1.5">
                  입금자명을 닉네임 <b>'{nickname}'</b>으로 해주세요
                </p>
              )}
            </div>
          )
        })}

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-emerald-500" />
          <span className="text-[12px] text-[#94a3b8]">{'\uAC1C\uC778\uC815\uBCF4(\uC774\uB984, \uC8FC\uC18C, \uC5F0\uB77D\uCC98) \uC218\uC9D1 \uBC0F \uC774\uC6A9\uC5D0 \uB3D9\uC758\uD569\uB2C8\uB2E4 (\uD544\uC218)'}</span>
        </label>

        {closedStores.length > 0 && (
          <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-[8px] px-4 py-3">
            <p className="text-[12px] text-[#be123c] font-medium">🚫 휴무 중인 가게가 있어 주문할 수 없습니다. 해당 가게 상품을 제거해주세요.</p>
          </div>
        )}
        <button
          type="button"
          onClick={validateAndConfirm}
          disabled={loading || someStoreNoSlots || closedStores.length > 0}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 active:opacity-80"
          style={{ background: (someStoreNoSlots || closedStores.length > 0) ? '#94a3b8' : '#10b981' }}
        >
          {loading ? '처리 중...' : storeIds.length > 1 ? `가게별 주문하기 (${storeIds.length}건)` : '주문하기'}
        </button>
      </div>

      {/* 계좌이체 확인 팝업 */}
      {showBankConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBankConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[20px] p-6">
            <div className="text-center mb-3">
              <span className="text-[44px]">🏦</span>
            </div>
            <h3 className="text-[18px] font-bold text-[#1a1c1c] text-center mb-1">계좌이체 완료 하셨나요?</h3>
            <p className="text-[13px] text-[#a3a3a3] text-center mb-4">아래 계좌로 입금 후 주문을 완료해주세요</p>

            {storeIds.map(sid => {
              const storeInfo = dynamicStores[sid]
              const bankAccount = storeInfo?.bank_account
              return (
                <div key={sid} className="bg-[#f0fdf8] border border-[#d1fae5] rounded-[12px] p-4 mb-3">
                  <p className="text-[12px] font-semibold text-[#3c4a42] mb-1.5">
                    {storeInfo?.emoji || '🏪'} {storeInfo?.name || sid}
                  </p>
                  {bankAccount ? (
                    <p className="text-[15px] font-bold text-[#1a1c1c]">{bankAccount}</p>
                  ) : (
                    <p className="text-[13px] text-[#a3a3a3]">계좌 정보 없음 (현장 결제)</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[13px] font-bold text-[#10b981]">{cart.getStoreTotal(sid).toLocaleString()}원</p>
                    {nickname && bankAccount && (
                      <p className="text-[11px] text-amber-600">입금자명: <b>{nickname}</b></p>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowBankConfirm(false)}
                className="flex-1 h-[48px] rounded-[12px] text-[14px] font-medium"
                style={{ background: '#f2f4f6', color: '#1a1c1c' }}
              >
                아직 안 했어요
              </button>
              <button
                onClick={() => { setShowBankConfirm(false); setShowConfirm(true) }}
                className="flex-1 h-[48px] rounded-[12px] text-[14px] font-bold text-white"
                style={{ background: '#10b981' }}
              >
                완료했어요 ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주문 확인 모달 (2-7) */}
      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[20px] p-6">
            <h3 className="text-[17px] font-bold text-[#1a1c1c] mb-1">주문을 확정할까요?</h3>
            <p className="text-[13px] text-[#a3a3a3] mb-4">
              {pickupType === 'delivery' ? `배송지: 종로구 ${dong} ${address}` : '매장 픽업'}
            </p>
            <div className="bg-[#f9f9f9] rounded-[12px] p-3 mb-4 space-y-1">
              {storeIds.map(sid => (
                <div key={sid} className="flex justify-between text-[13px]">
                  <span className="text-[#3c4a42]">{getStore(sid)?.name || sid}</span>
                  <span className="font-bold text-[#10b981]">{cart.getStoreTotal(sid).toLocaleString()}원</span>
                </div>
              ))}
              <div className="flex justify-between text-[14px] font-bold pt-2 border-t border-[#eee] mt-1">
                <span>합계</span>
                <span className="text-[#10b981]">{cart.totalAmount.toLocaleString()}원</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 h-[48px] rounded-[12px] bg-[#f2f4f6] text-[#1a1c1c] text-[14px] font-medium">
                취소
              </button>
              <button onClick={handleOrder}
                className="flex-1 h-[48px] rounded-[12px] bg-[#10b981] text-white text-[14px] font-bold">
                주문 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주문 성공 모달 (2-2) */}
      {showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-[20px] font-bold text-[#1a1c1c] mb-2">주문 완료!</h3>
            <p className="text-[14px] text-[#a3a3a3] mb-1">입금 후 사장님 확인을 기다려주세요</p>
            <p className="text-[12px] text-[#c0c0c0] mb-6">5초 후 자동으로 주문내역으로 이동합니다</p>
            <button
              onClick={() => {
                if (successTimerRef.current) clearTimeout(successTimerRef.current)
                setShowSuccess(false)
                router.push('/orders')
              }}
              className="w-full h-[48px] rounded-[14px] bg-[#10b981] text-white text-[15px] font-bold"
            >
              주문내역 보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
