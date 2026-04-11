'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketCart } from '@/lib/cart/MarketCartContext'
import { getStore } from '@/lib/market-data'
import { getLocalStorage, setLocalStorage, generateDeviceUUID } from '@/lib/utils'

const TIME_SLOTS = [
  { value: '09-10', label: '09:00 ~ 10:00' },
  { value: '10-11', label: '10:00 ~ 11:00' },
  { value: '11-12', label: '11:00 ~ 12:00' },
  { value: '12-13', label: '12:00 ~ 13:00' },
  { value: '13-14', label: '13:00 ~ 14:00' },
  { value: '14-15', label: '14:00 ~ 15:00' },
  { value: '15-16', label: '15:00 ~ 16:00' },
  { value: '16-17', label: '16:00 ~ 17:00' },
  { value: '17-18', label: '17:00 ~ 18:00' },
  { value: '18-19', label: '18:00 ~ 19:00' },
  { value: '19-20', label: '19:00 ~ 20:00' },
  { value: '20-21', label: '20:00 ~ 21:00' },
]

export default function CartPage() {
  const router = useRouter()
  const cart = useMarketCart()
  const [address, setAddress] = useState(() => {
    if (typeof window === 'undefined') return ''
    return getLocalStorage('cosmart_address') || ''
  })
  const [pickupType, setPickupType] = useState<'delivery' | 'pickup'>('delivery')
  const [timeSlot, setTimeSlot] = useState('12-13')
  const [memo, setMemo] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const nickname = typeof window !== 'undefined' ? getLocalStorage('cosmart_nickname') : null
  const storeIds = Object.keys(cart.storeGroups)

  const MIN_ORDER_PER_STORE = 5000
  const belowMinStores = storeIds.filter(sid => cart.getStoreTotal(sid) < MIN_ORDER_PER_STORE)
  const hasWarnings = belowMinStores.length > 0

  const totalDeliveryFee = storeIds.reduce((sum, sid) => {
    const store = getStore(sid)
    return sum + (store?.deliveryFee || 0)
  }, 0)

  const selectedTimeLabel = TIME_SLOTS.find(t => t.value === timeSlot)?.label || timeSlot

  async function handleOrder() {
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

        const res = await fetch('/api/market/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: sid,
            store_name: store?.name || sid,
            device_uuid: deviceUuid,
            nickname,
            pickup_type: pickupType,
            delivery_address: pickupType === 'delivery' ? address : '\uB9E4\uC7A5 \uD53D\uC5C5',
            delivery_memo: pickupType === 'delivery'
              ? '\uD76C\uB9DD\uC2DC\uAC04 ' + selectedTimeLabel + (memo ? ' / ' + memo : '')
              : memo,
            items,
            total_amount,
          }),
        })
        return { ok: res.ok, json: await res.json().catch(() => null), store: store?.name || sid }
      }))

      const failed = results.filter(r => !r.ok)
      if (failed.length === 0) {
        if (pickupType === 'delivery') setLocalStorage('cosmart_address', address)
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
          <p className="text-[14px] font-bold text-[#1a1c1c]">{'\uBC30\uC1A1 \uC815\uBCF4'}</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPickupType('delivery')}
              className="py-3 px-2 rounded-xl border text-[13px] font-semibold transition-all"
              style={pickupType === 'delivery'
                ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                : { borderColor: '#e0e0e0', background: '#fafafa', color: '#3c4a42' }
              }
            >{'\uBB38\uC55E \uBC30\uC1A1'}</button>
            <button
              type="button"
              onClick={() => setPickupType('pickup')}
              className="py-3 px-2 rounded-xl border text-[13px] font-semibold transition-all"
              style={pickupType === 'pickup'
                ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                : { borderColor: '#e0e0e0', background: '#fafafa', color: '#3c4a42' }
              }
            >{'\uB9E4\uC7A5 \uD53D\uC5C5'}</button>
          </div>

          {pickupType === 'delivery' && (
            <>
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">{'\uC0C1\uC138 \uC8FC\uC18C *'}</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder={'\uB3D9, \uD638\uC218\uAE4C\uC9C0 \uC815\uD655\uD788'}
                  className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[#1a1c1c] placeholder-[#c0c0c0] text-[14px] outline-none focus:border-[#10b981]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">{'\uD76C\uB9DD \uC218\uB839 \uC2DC\uAC04'}</label>
                <select
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[14px] text-[#1a1c1c] outline-none bg-white focus:border-[#10b981] appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23999\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                >
                  {TIME_SLOTS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block">
              {pickupType === 'pickup' ? '\uD53D\uC5C5 \uBA54\uBAA8' : '\uBC30\uC1A1 \uBA54\uBAA8'} ({'\uC120\uD0DD'})
            </label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder={pickupType === 'pickup' ? '\uBC29\uBB38 \uC608\uC815 \uC2DC\uAC04 \uB4F1' : '\uCD08\uC778\uC885 \uAE08\uC9C0, \uBE44\uBC88 \uB4F1'}
              className="w-full border border-[#e0e0e0] rounded-xl px-4 py-3 text-[#1a1c1c] placeholder-[#c0c0c0] text-[14px] outline-none focus:border-[#10b981]"
            />
          </div>
        </div>

        <div className="bg-[#f0fdf8] border border-[#d1fae5] rounded-[8px] p-4">
          <p className="text-[14px] font-semibold text-[#1a1c1c] mb-1">{'\uACC4\uC88C\uC774\uCCB4'}</p>
          <p className="text-[13px] text-[#3c4a42]">{'\uAD6D\uBBFC\uC740\uD589'} <span className="font-semibold">123-456-789012</span> ({'\uCF54\uC0AC\uB9C8\uD2B8'})</p>
          {nickname && <p className="text-[12px] text-amber-600 mt-1.5">{'\uC785\uAE08\uC790\uBA85\uC744 \uB2C9\uB124\uC784'} <b>'{nickname}'</b>({'\uC73C'}){'\uB85C \uD574\uC8FC\uC138\uC694'}</p>}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-emerald-500" />
          <span className="text-[12px] text-[#94a3b8]">{'\uAC1C\uC778\uC815\uBCF4(\uC774\uB984, \uC8FC\uC18C, \uC5F0\uB77D\uCC98) \uC218\uC9D1 \uBC0F \uC774\uC6A9\uC5D0 \uB3D9\uC758\uD569\uB2C8\uB2E4 (\uD544\uC218)'}</span>
        </label>

        <button
          type="button"
          onClick={handleOrder}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 active:opacity-80"
          style={{ background: '#10b981' }}
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
