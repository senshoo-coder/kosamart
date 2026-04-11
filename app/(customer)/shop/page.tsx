'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice, getDeadlineText, getLocalStorage, formatDate } from '@/lib/utils'
import type { GroupBuy, Product, CartItem } from '@/lib/types'

// =============================================
// 장바구니 전역 상태 (간이 구현)
// =============================================
let globalCart: CartItem[] = []

export default function ShopPage() {
  const router = useRouter()
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([])
  const [selected, setSelected] = useState<GroupBuy | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showOrder, setShowOrder] = useState(false)
  const nickname = getLocalStorage('cosmart_nickname')

  useEffect(() => {
    fetch('/api/group-buys')
      .then(r => r.json())
      .then(d => {
        const active = (d.data || []).filter((gb: GroupBuy) => gb.status === 'active')
        setGroupBuys(active)
        if (active.length > 0) {
          setSelected(active[0])
          setProducts((active[0].products || []).filter((p: { is_available: boolean }) => p.is_available !== false))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalAmount = products.reduce((sum, p) => sum + (p.price * (cart[p.id] || 0)), 0)

  function changeQty(id: string, delta: number) {
    setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))
  }

  function handleOrder() {
    if (!nickname) { router.push('/login'); return }
    if (totalItems === 0) { alert('상품을 선택해주세요'); return }
    setShowOrder(true)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <div>
            <h1 className="text-[16px] font-bold text-[#1a1c1c] leading-tight">공동구매</h1>
            <p className="text-[11px] text-[#10b981] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse inline-block" />
              공구 진행중
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nickname && (
            <span className="text-[12px] text-[#3c4a42] bg-[#f2f4f6] rounded-full px-3 py-1.5">
              👤 {nickname}
            </span>
          )}
          {totalItems > 0 && (
            <button
              onClick={handleOrder}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: '#10b981' }}
            >
              🛒
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            </button>
          )}
          </div>
      </header>

      <div className="px-4 pt-4 pb-4">
        {/* 공구 배너 */}
        {selected && (
          <div className="rounded-2xl mb-4 overflow-hidden card-3d"
            style={{ background: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #047857 100%)' }}>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full text-indigo-300"
                  style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  ✨ 이번 주 공구
                </span>
              </div>
              <h2 className="font-700 text-white text-lg leading-tight">{selected.title}</h2>
              {selected.order_deadline && (
                <p className="text-emerald-300 text-xs mt-1">
                  마감 <span className="font-700 text-white">{getDeadlineText(selected.order_deadline)}</span>
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <div className="glass rounded-lg px-2.5 py-1.5 text-center" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="text-white font-800 text-sm">{products.length}</div>
                  <div className="text-emerald-300 text-xs">상품</div>
                </div>
                {selected.delivery_date && (
                  <div className="glass rounded-lg px-2.5 py-1.5 text-center" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                    <div className="text-white font-800 text-xs">{formatDate(selected.delivery_date)}</div>
                    <div className="text-emerald-300 text-xs">배달 예정</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 상품 그리드 */}
        <h3 className="text-sm font-600 text-slate-400 mb-3 px-1">오늘의 큐레이션 메뉴</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              qty={cart[product.id] || 0}
              onChangeQty={(delta) => changeQty(product.id, delta)}
            />
          ))}
        </div>

        {/* 장바구니 플로팅 버튼 */}
        {totalItems > 0 && (
          <div className="fixed bottom-24 left-4 right-4 z-40">
            <Button
              className="w-full py-4 text-base rounded-2xl"
              onClick={handleOrder}
            >
              <span className="flex items-center justify-between w-full">
                <span>{totalItems}개 담음</span>
                <span className="font-800">{formatPrice(totalAmount)} 주문하기 →</span>
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* 주문 모달 */}
      {showOrder && selected && (
        <OrderModal
          groupBuy={selected}
          products={products}
          cart={cart}
          totalAmount={totalAmount}
          onClose={() => setShowOrder(false)}
          onSuccess={() => {
            setShowOrder(false)
            setCart({})
            router.push('/orders')
          }}
        />
      )}
    </div>
  )
}

// ─── 상품 카드 ───────────────────────────────
function ProductCard({ product, qty, onChangeQty }: {
  product: Product
  qty: number
  onChangeQty: (delta: number) => void
}) {
  const EMOJIS: Record<string, string> = {
    '참나물 무침': '🥬', '궁중 떡볶이': '🍱', '시금치 나물': '🌿',
    '볶음밥 세트': '🍚', '도라지 무침': '🥗', '순두부 찌개': '🍲',
  }
  const emoji = EMOJIS[product.name] || '🛒'

  return (
    <div className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer card-3d"
      style={qty > 0 ? { borderColor: 'rgba(16,185,129,0.4)', boxShadow: '0 8px 24px rgba(16,185,129,0.15)' } : {}}
      onClick={() => onChangeQty(1)}>
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="font-600 text-white text-sm leading-tight">{product.name}</p>
      {product.description && (
        <p className="text-xs text-slate-500 mt-0.5 mb-2">{product.description}</p>
      )}
      <p className="text-emerald-400 font-700 text-base mb-3">{formatPrice(product.price)}</p>
      <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <button onClick={() => onChangeQty(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-700 text-emerald-400 transition-all active:scale-95"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
          −
        </button>
        <span className="text-white font-700 w-8 text-center">{qty}</span>
        <button onClick={() => onChangeQty(1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-700 text-emerald-400 transition-all active:scale-95"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
          +
        </button>
      </div>
    </div>
  )
}

// ─── 주문 모달 ───────────────────────────────
function OrderModal({ groupBuy, products, cart, totalAmount, onClose, onSuccess }: {
  groupBuy: GroupBuy
  products: Product[]
  cart: Record<string, number>
  totalAmount: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [address, setAddress] = useState(getLocalStorage('cosmart_address') || '')
  const [memo, setMemo] = useState('')
  const [timeSlot, setTimeSlot] = useState('09:00~12:00')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const nickname = getLocalStorage('cosmart_nickname')
  const deviceUuid = getLocalStorage('cosmart_device_uuid')
  const items = products.filter(p => (cart[p.id] || 0) > 0)

  async function submit() {
    if (!address.trim()) { alert('배송 주소를 입력해주세요'); return }
    if (!consent) { alert('개인정보 동의가 필요합니다'); return }
    setLoading(true)

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_buy_id: groupBuy.id,
        device_uuid: deviceUuid,
        nickname,
        delivery_address: address,
        delivery_memo: `${timeSlot}${memo ? ' / ' + memo : ''}`,
        items: items.map(p => ({ product_id: p.id, quantity: cart[p.id] })),
      }),
    })
    if (res.ok) {
      localStorage.setItem('cosmart_address', address)
      onSuccess()
    } else {
      alert('주문 실패. 다시 시도해주세요.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-3xl p-5"
        style={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)' }}>

        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-700 text-white text-base">주문서 작성</h3>
          <button onClick={onClose} className="text-slate-500 text-2xl">×</button>
        </div>

        {/* 주문 상품 */}
        <div className="glass rounded-xl p-4 mb-4">
          {items.map(p => (
            <div key={p.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-slate-300">{p.name} × {cart[p.id]}</span>
              <span className="text-sm text-emerald-400 font-600">{formatPrice(p.price * cart[p.id])}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 mt-1">
            <span className="text-sm text-slate-400 font-600">합계</span>
            <span className="text-lg text-emerald-400 font-800">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-500">상세 주소 *</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="동·호수까지 정확히 (예: 평창동 101동 302호)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-emerald-500/60"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-500">희망 수령 시간</label>
            <select
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/60"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {['09:00~12:00', '12:00~15:00', '15:00~18:00', '18:00~21:00'].map(t => (
                <option key={t} value={t} style={{ background: '#1e293b' }}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-500">메모 (선택)</label>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="초인종 금지, 공동현관 비번 등"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* 계좌 안내 */}
        <div className="glass rounded-xl p-4 mb-4" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
          <p className="text-sm font-600 text-white mb-1">💳 계좌이체</p>
          <p className="text-xs text-slate-400">국민은행 <span className="text-white font-600">123-456-789012</span> (코사마트)</p>
          <p className="text-xs text-amber-400 mt-1.5">⚠️ 입금자명을 닉네임 <span className="font-700">'{nickname}'</span>으로 해주세요</p>
        </div>

        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 accent-emerald-500" />
          <span className="text-xs text-slate-400">개인정보(이름, 주소, 연락처) 수집·이용에 동의합니다 (필수)</span>
        </label>

        <Button className="w-full py-4 text-base" onClick={submit} loading={loading}>
          공구 참여 완료 🎉
        </Button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">상품 불러오는 중...</p>
      </div>
    </div>
  )
}
