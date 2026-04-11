'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketCart } from '@/lib/cart/MarketCartContext'
import { getStore } from '@/lib/market-data'
import { getLocalStorage, setLocalStorage, generateDeviceUUID } from '@/lib/utils'

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

export default function CartPage() {
  const router = useRouter()
  const cart = useMarketCart()
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

  const MIN_ORDER_PER_STORE = 5000
  const belowMinStores = storeIds.filter(sid => cart.getStoreTotal(sid) < MIN_ORDER_PER_STORE)
  const hasWarnings = belowMinStores.length > 0

  const totalDeliveryFee = storeIds.reduce((sum, sid) => {
    const store = getStore(sid)
    return sum + (store?.deliveryFee || 0)
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

  const someStoreNoSlots = pickupType === 'delivery' && storeIds.some(sid => storeSlotsMap[sid]?.length === 0)

  async function handleOrder() {
    if (pickupType === 'delivery' && someStoreNoSlots) {
      alert('일부 가게의 운영시간이 종료되었습니다. 내일 다시 주문해주세요.')
      return
    }
    if (pickupType === 'delivery' && !phone.trim()) {
      alert('전화번호를 입력해주세요')
      return
    }
    if (pickupType === 'delivery' && !address.trim()) {
      alert('\uBC30\uC1A1 \uC8FC\uC18C\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694')
      return
    }
    if (!consent) {
      alert('\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4')
      return
    }
    if (!nickname) {
      alert('\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4')
      return
    }
    if (hasWarnings) {
      const names = belowMinStores.map(sid => getStore(sid)?.name || sid).join(', ')
      alert('\uAC00\uAC8C\uBCC4 \uCD5C\uC18C\uC8FC\uBB38\uAE08\uC561 ' + MIN_ORDER_PER_STORE.toLocaleString() + '\uC6D0 \uBBF8\uB2EC: ' + names)
      return
    }

    setLoading(true)

    let deviceUuid = getLocalStorage('cosmart_device_uuid')
    if (!deviceUuid) {
      deviceUuid = generateDeviceUUID()
      setLocalStorage('cosmart_device_uuid', deviceUuid)
    }

    try {
      if (pickupType === 'delivery') setLocalStorage('cosmart_phone', phone)

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

        const res = await fetch('/api/market/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: sid,
            store_name: (dynamicStores[sid]?.name) || store?.name || sid,
            device_uuid: deviceUuid,
            nickname,
            customer_phone: pickupType === 'delivery' ? phone.trim() : undefined,
            pickup_type: pickupType,
            delivery_address: pickupType === 'delivery' ? address : '매장 픽업',
            delivery_memo: pickupType === 'delivery'
              ? `희망시간 ${slotLabel}${memo ? ' / ' + memo : ''}`
              : memo,
            items,
            total_amount,
          }),
        })
        return { ok: res.ok, json: await res.json().catch(() => null), store: store?.name || sid }
      }))

      const failed = results.filter(r => !r.ok)
      if (failed.length === 0) {
        if (pickupType === 'delivery') {
          setLocalStorage('cosmart_address', address)
        }
        cart.clearAll()
        router.push('/orders')
      } else {
        alert('\uC77C\uBD80 \uC8FC\uBB38 \uC2E4\uD328: ' + failed.map(f => f.store).join(', '))
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

      <div className="px-4 pt-4 pb-6 space-y-4">
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
          const storeBelowMin = storeTotal < MIN_ORDER_PER_STORE

          return (
            <div key={sid} className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="px-4 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{store?.emoji || '\uD83C\uDFEA'}</span>
                  <span className="text-[14px] font-bold text-[#1a1c1c]">{store?.name || sid}</span>
                </div>
                <button onClick={() => cart.clearStore(sid)} className="text-[11px] text-[#a3a3a3]">{'\uAC00\uAC8C \uC0AD\uC81C'}</button>
              </div>

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
                  <div className="flex items-center border border-[#e0e0e0] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(item.product_id, sid, item.quantity - 1)}
                      className="w-9 h-9 text-[16px] flex items-center justify-center text-[#3c4a42] active:bg-[#f0f0f0]"
                    >{'\u2212'}</button>
                    <span className="w-7 text-center text-[13px] font-bold text-[#1a1c1c]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(item.product_id, sid, item.quantity + 1)}
                      className="w-9 h-9 text-[16px] flex items-center justify-center text-[#3c4a42] active:bg-[#f0f0f0]"
                    >+</button>
                  </div>
                  <p className="text-[13px] font-bold text-[#1a1c1c] w-16 text-right">{(item.unit_price * item.quantity).toLocaleString()}{'\uC6D0'}</p>
                </div>
              ))}

              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#a3a3a3]">{'\uC18C\uACC4'}</span>
                  <span className="text-[14px] font-bold text-[#10b981]">{storeTotal.toLocaleString()}{'\uC6D0'}</span>
                </div>
                {storeBelowMin && (
                  <p className="text-[11px] text-[#b45309] mt-2 bg-[#fef3c7] rounded-[6px] px-3 py-1.5">
                    {'\uCD5C\uC18C\uC8FC\uBB38\uAE08\uC561 ' + MIN_ORDER_PER_STORE.toLocaleString() + '\uC6D0 \uBBF8\uB2EC (' + (MIN_ORDER_PER_STORE - storeTotal).toLocaleString() + '\uC6D0 \uBD80\uC871)'}
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
              {'\uAC00\uAC8C\uBCC4 \uCD5C\uC18C\uC8FC\uBB38\uAE08\uC561 ' + MIN_ORDER_PER_STORE.toLocaleString() + '\uC6D0 \uBBF8\uB2EC \uAC00\uAC8C\uAC00 \uC788\uC2B5\uB2C8\uB2E4'}
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

          {/* 전화번호 — 배송 시 필수 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">
              전화번호 {pickupType === 'delivery' ? <span className="text-[#dc2626]">*</span> : '(선택)'}
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
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">상세 주소 <span className="text-[#dc2626]">*</span></label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="동, 호수까지 정확히"
                className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[#1a1c1c] placeholder-[#c0c0c0] text-[14px] outline-none focus:border-[#10b981]"
              />
            </div>
          )}

          {/* 가게별 희망 수령 시간 */}
          {pickupType === 'delivery' && storeIds.map(sid => {
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

        <button
          type="button"
          onClick={handleOrder}
          disabled={loading || someStoreNoSlots}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 active:opacity-80"
          style={{ background: someStoreNoSlots ? '#94a3b8' : '#10b981' }}
        >
          {loading
            ? '\uCC98\uB9AC \uC911...'
            : storeIds.length > 1
              ? '\uAC00\uAC8C\uBCC4 \uC8FC\uBB38\uD558\uAE30 (' + storeIds.length + '\uAC74)'
              : '\uC8FC\uBB38\uD558\uAE30'
          }
        </button>
      </div>
    </div>
  )
}
