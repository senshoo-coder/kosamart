'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STORES } from '@/lib/market-data'
import { useAllStoreImages } from '@/lib/hooks/useStoreImages'
import { useMarketCart } from '@/lib/cart/MarketCartContext'

const CATEGORIES = ['전체', '정육', '슈퍼', '반찬', '분식', '치킨', '베이커리']

const CATEGORY_MAP: Record<string, string> = {
  '정육·축산': '정육',
  '편의점·슈퍼': '슈퍼',
  '반찬·가정식': '반찬',
  '죽·분식': '분식',
  '치킨·튀김': '치킨',
  '베이커리·카페': '베이커리',
}

const STORE_GRADIENTS: Record<string, string> = {
  'central-super': 'linear-gradient(160deg, #1e3a5f 0%, #0f172a 100%)',
  'banchan':       'linear-gradient(160deg, #14532d 0%, #052e16 100%)',
  'butcher':       'linear-gradient(160deg, #7f1d1d 0%, #450a0a 100%)',
  'bonjuk':        'linear-gradient(160deg, #78350f 0%, #451a03 100%)',
  'chicken':       'linear-gradient(160deg, #7c2d12 0%, #431407 100%)',
  'bakery':        'linear-gradient(160deg, #713f12 0%, #422006 100%)',
}

const PARTICIPANTS: Record<string, number> = {
  'central-super': 23,
  'banchan': 45,
  'butcher': 12,
  'bonjuk': 8,
  'chicken': 31,
  'bakery': 19,
}

interface DynamicStore {
  id: string; name: string; emoji: string; category: string; description: string
  isOpen: boolean; badge?: string; hours?: string; minOrder: number
  deliveryFee: number; accentColor: string; is_active: boolean; isCustom: boolean
}

export default function MarketPage() {
  const [activeCategory, setActiveCategory] = useState('전체')
  const [dynamicStores, setDynamicStores] = useState<DynamicStore[] | null>(null)
  const storeIds = useMemo(() => (dynamicStores ?? STORES).map(s => s.id), [dynamicStores])
  const allImages = useAllStoreImages(storeIds)
  const cart = useMarketCart()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/market/stores')
      .then(r => r.json())
      .then(({ data }) => { if (data) setDynamicStores(data) })
      .catch(() => {})
  }, [])

  const baseStores: DynamicStore[] = dynamicStores ?? STORES.map(s => ({
    id: s.id, name: s.name, emoji: s.emoji, category: s.category,
    description: s.description, isOpen: s.isOpen, badge: s.badge,
    hours: s.hours, minOrder: s.minOrder, deliveryFee: s.deliveryFee,
    accentColor: s.accentColor, is_active: true, isCustom: false,
  }))

  const filteredStores = baseStores.filter(store => {
    if (!store.is_active) return false
    if (activeCategory === '전체') return true
    const short = CATEGORY_MAP[store.category] || store.category
    return short === activeCategory
  })

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚚</span>
          <span className="font-bold text-[20px] text-[#10b981] tracking-[-1px]">평창동 상점가</span>
        </div>
        <div className="flex items-center gap-4 text-[#1a1c1c] text-[18px]">
          <button>🔔</button>
          <button onClick={() => router.push('/market/cart')} className="relative">
            🛍
            {cart.totalItems > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#10b981] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.totalItems}</span>
            )}
          </button>
        </div>
      </header>

      <div className="px-5 pt-5 pb-6 flex flex-col gap-6">
        {/* 섹션 타이틀 + 배너 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <h2 className="text-[28px] font-bold text-[#1a1c1c] tracking-[-1px] leading-[36px]">평창동 상점가</h2>
            <button className="text-[14px] text-[#10b981] font-medium pb-1">전체보기</button>
          </div>

          {/* 코사마트 배너 */}
          <div className="flex gap-3 items-start p-[17px] rounded-[8px]" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <span className="text-lg mt-0.5">🚚</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] text-[#10b981] font-medium">코사마트 상점가 서비스</span>
                <span className="bg-[#10b981] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">묶음배송</span>
              </div>
              <p className="text-[12px] text-[#3c4a42] leading-[15px]">
                시장 내 여러 가게의 상품을 장바구니에 담아{' '}
                <span className="text-[#10b981] font-medium">한 번에 묶음배송</span> 받으실 수 있습니다!
              </p>
            </div>
          </div>

          {/* 히어로 배너 */}
          <div className="relative h-[192px] rounded-[8px] overflow-hidden shadow-sm"
            style={{ background: 'linear-gradient(160deg, #064E3B 0%, #065F46 50%, #047857 100%)' }}>
            <div className="absolute inset-0 flex items-center justify-center text-[80px] opacity-20 select-none pointer-events-none">🥬🥩🍞</div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0))' }} />
            <div className="absolute bottom-5 left-5">
              <p className="text-white/90 text-[12px] mb-1">산지직송 프레시 마켓</p>
              <p className="text-white text-[20px] font-bold leading-[28px]">지금 가장 신선한 제철 식재료</p>
            </div>
          </div>
        </div>

        {/* 카테고리 칩 */}
        <div className="flex gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-5 py-2 rounded-[12px] text-[14px] font-medium transition-all"
              style={activeCategory === cat ? { background: '#10b981', color: '#fff' } : { background: '#e8e8e8', color: '#1a1c1c' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* 가게 목록 */}
        <div className="flex flex-col gap-6">
          {filteredStores.map(store => {
            const shortCat = CATEGORY_MAP[store.category] || store.category
            const participants = PARTICIPANTS[store.id] || 0
            const gradient = STORE_GRADIENTS[store.id] || 'linear-gradient(160deg, #1e293b, #0f172a)'
            const storeImage = allImages[store.id]?.store
            const storeCartCount = cart.getStoreItemCount(store.id)

            const imgHeight = (store as any).image_height || 160
            const imgPosition = (store as any).image_position || 'center'

            return (
              <Link key={store.id} href={`/market/${store.id}`} className="block">
                <div className="bg-white rounded-[8px] overflow-hidden">
                  {/* 이미지 */}
                  <div className="w-full flex items-center justify-center overflow-hidden relative"
                    style={{ height: imgHeight, background: storeImage ? undefined : gradient }}>
                    {storeImage ? (
                      <img src={storeImage} alt={store.name} className="w-full h-full object-cover" style={{ objectPosition: imgPosition }} />
                    ) : (
                      <span className="text-[72px] opacity-60 select-none">{store.emoji}</span>
                    )}
                    {storeCartCount > 0 && (
                      <div className="absolute top-3 right-3 bg-[#10b981] text-white text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        🛒 {storeCartCount}
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-[#10b981] tracking-[1px] mb-0.5">{shortCat}</p>
                        <p className="text-[18px] font-bold text-[#1a1c1c] leading-[28px]">{store.name}</p>
                      </div>
                      <p className="text-[13px] text-[#3c4a42] mt-1 flex-shrink-0">운영시간 {store.hours || '09:00 ~ 18:00'}</p>
                    </div>
                    <p className="text-[14px] text-[#3c4a42] leading-[22.75px] line-clamp-2">{store.description}</p>
                    <div className="flex items-center justify-between pt-[9px]" style={{ borderTop: '1px solid #eee' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px]">👥</span>
                        <span className="text-[12px] text-[#10b981] font-medium">{participants}명 참여중</span>
                      </div>
                      <div className="px-5 py-2 text-[12px] font-medium text-white rounded-[4px]" style={{ background: '#10b981' }}>구매하기</div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {filteredStores.length === 0 && (
            <div className="py-16 text-center text-[#a3a3a3] text-sm">해당 카테고리의 가게가 없습니다</div>
          )}
        </div>
      </div>

      {/* 플로팅 장바구니 바 */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-[64px] left-0 right-0 z-40 px-4 pb-3">
          <button onClick={() => router.push('/market/cart')}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-white shadow-xl"
            style={{ background: '#10b981' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span className="text-[14px] font-bold">장바구니</span>
              <span className="bg-white/20 text-[12px] px-2 py-0.5 rounded-full font-semibold">
                {Object.keys(cart.storeGroups).length}개 가게 · {cart.totalItems}개
              </span>
            </div>
            <span className="text-[15px] font-bold">{cart.totalAmount.toLocaleString()}원 →</span>
          </button>
        </div>
      )}
    </div>
  )
}
