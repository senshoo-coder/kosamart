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
  'central-super': 'linear-gradient(150deg, #1e3a5f 0%, #0f172a 100%)',
  'banchan':       'linear-gradient(150deg, #14532d 0%, #052e16 100%)',
  'butcher':       'linear-gradient(150deg, #7f1d1d 0%, #450a0a 100%)',
  'bonjuk':        'linear-gradient(150deg, #78350f 0%, #451a03 100%)',
  'chicken':       'linear-gradient(150deg, #7c2d12 0%, #431407 100%)',
  'bakery':        'linear-gradient(150deg, #713f12 0%, #422006 100%)',
}

const PARTICIPANTS: Record<string, number> = {
  'central-super': 23,
  'banchan':       45,
  'butcher':       12,
  'bonjuk':        8,
  'chicken':       31,
  'bakery':        19,
}

interface DynamicStore {
  id: string; name: string; emoji: string; category: string; description: string
  isOpen: boolean; badge?: string; hours?: string; minOrder: number
  deliveryFee: number; accentColor: string; is_active: boolean; isCustom: boolean
}

function NeighborhoodIllustration() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full" style={{ opacity: 0.45 }}>
      {/* Hills */}
      <ellipse cx="140" cy="175" rx="200" ry="70" fill="#4a9a68" />
      <ellipse cx="240" cy="175" rx="120" ry="55" fill="#3d8559" />

      {/* Tree left */}
      <rect x="18" y="108" width="6" height="52" rx="2" fill="#3d7a53" />
      <ellipse cx="21" cy="98" rx="16" ry="17" fill="#4faa72" />
      <ellipse cx="21" cy="92" rx="12" ry="13" fill="#5db87a" />

      {/* Building A */}
      <rect x="36" y="68" width="46" height="92" rx="3" fill="#3d7a53" />
      <polygon points="31,68 87,68 59,45" fill="#4faa72" />
      <rect x="43" y="78" width="12" height="12" rx="1" fill="#2a5c40" />
      <rect x="61" y="78" width="12" height="12" rx="1" fill="#2a5c40" />
      <rect x="43" y="98" width="12" height="12" rx="1" fill="#2a5c40" />
      <rect x="61" y="98" width="12" height="12" rx="1" fill="#2a5c40" />
      <rect x="50" y="128" width="14" height="32" rx="2" fill="#2a5c40" />

      {/* Tree mid-left */}
      <rect x="90" y="112" width="5" height="48" rx="2" fill="#3d7a53" />
      <ellipse cx="93" cy="100" rx="14" ry="15" fill="#4faa72" />
      <ellipse cx="93" cy="95" rx="10" ry="11" fill="#5db87a" />

      {/* Building B (tallest, center) */}
      <rect x="108" y="44" width="64" height="116" rx="3" fill="#3d7a53" />
      <polygon points="102,44 178,44 140,16" fill="#4faa72" />
      <rect x="116" y="58" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="136" y="58" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="155" y="58" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="116" y="80" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="136" y="80" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="155" y="80" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="116" y="102" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="136" y="102" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="155" y="102" width="13" height="13" rx="1" fill="#2a5c40" />
      <rect x="130" y="134" width="18" height="26" rx="2" fill="#2a5c40" />

      {/* Tree mid-right */}
      <rect x="180" y="115" width="5" height="45" rx="2" fill="#3d7a53" />
      <ellipse cx="183" cy="103" rx="13" ry="14" fill="#4faa72" />
      <ellipse cx="183" cy="97" rx="9" ry="10" fill="#5db87a" />

      {/* Building C */}
      <rect x="192" y="78" width="48" height="82" rx="3" fill="#3d7a53" />
      <rect x="186" y="68" width="60" height="12" rx="2" fill="#4faa72" />
      <rect x="199" y="88" width="11" height="11" rx="1" fill="#2a5c40" />
      <rect x="218" y="88" width="11" height="11" rx="1" fill="#2a5c40" />
      <rect x="199" y="108" width="11" height="11" rx="1" fill="#2a5c40" />
      <rect x="218" y="108" width="11" height="11" rx="1" fill="#2a5c40" />
      <rect x="205" y="132" width="14" height="28" rx="2" fill="#2a5c40" />

      {/* Tree right */}
      <rect x="248" y="110" width="6" height="50" rx="2" fill="#3d7a53" />
      <ellipse cx="251" cy="98" rx="15" ry="16" fill="#4faa72" />
      <ellipse cx="251" cy="92" rx="11" ry="12" fill="#5db87a" />

      {/* People */}
      <circle cx="90" cy="150" r="4" fill="#4faa72" opacity="0.9" />
      <rect x="87" y="154" width="6" height="8" rx="1" fill="#4faa72" opacity="0.9" />
      <circle cx="105" cy="148" r="4" fill="#5db87a" opacity="0.9" />
      <rect x="102" y="152" width="6" height="8" rx="1" fill="#5db87a" opacity="0.9" />

      {/* Ground line */}
      <rect x="0" y="158" width="280" height="2" fill="#4faa72" opacity="0.5" />
    </svg>
  )
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
    <div className="min-h-[100dvh]" style={{ background: '#f5f0e8' }}>

      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 h-[56px]"
        style={{ background: 'rgba(245,240,232,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <span className="font-bold text-[18px] tracking-[-0.5px]" style={{ color: '#2d5a3d' }}>
          평창동 상점가
        </span>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-full text-[18px]" style={{ color: '#4a6358' }}>
            🔔
          </button>
          <button
            onClick={() => router.push('/market/cart')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
            style={cart.totalItems > 0
              ? { background: '#2d5a3d', color: '#fff' }
              : { background: '#e5dfd5', color: '#4a6358' }
            }
          >
            <span>🛒</span>
            {cart.totalItems > 0 && <span>{cart.totalItems}</span>}
          </button>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #2d5a3d 0%, #1e4530 55%, #112b1d 100%)',
          minHeight: 260,
        }}
      >
        {/* 배경 도트 패턴 */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* 일러스트 */}
        <div className="absolute right-0 bottom-0 w-[68%] h-full">
          <NeighborhoodIllustration />
        </div>

        {/* 그라데이션 오버레이 (텍스트 가독성) */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, rgba(17,43,29,0.85) 40%, transparent 100%)',
        }} />

        {/* 텍스트 */}
        <div className="relative px-5 pt-8 pb-9">
          <p className="text-[10px] font-medium tracking-[2.5px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            PYEONGCHANG-DONG SHOPPING DISTRICT
          </p>
          <h1 className="text-[21px] font-bold leading-[32px]" style={{ color: '#fff' }}>
            평창동 이웃들의<br />
            다정함이 모인 곳,
          </h1>
          <h1 className="text-[21px] font-bold leading-[32px] mt-0.5" style={{ color: '#7dd4a8' }}>
            우리 동네 상점가입니다.
          </h1>

          {/* 뱃지 */}
          <div
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span>🚚</span>
            <span>여러 가게 · <strong>한 번에 묶음배송</strong></span>
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <div className={`flex flex-col gap-0 ${cart.totalItems > 0 ? 'pb-[88px]' : 'pb-8'}`}>

        {/* 카테고리 칩 */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                style={activeCategory === cat
                  ? { background: '#2d5a3d', color: '#fff' }
                  : { background: '#e5dfd5', color: '#4a6358' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 가게 목록 헤더 */}
        <div className="px-5 mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold" style={{ color: '#1a1c1c' }}>
            인기 가게
          </h2>
          <span className="text-[12px]" style={{ color: '#8c9688' }}>{filteredStores.length}개</span>
        </div>

        {/* 가게 카드 목록 */}
        <div className="px-4 flex flex-col gap-4">
          {filteredStores.map(store => {
            const shortCat = CATEGORY_MAP[store.category] || store.category
            const participants = PARTICIPANTS[store.id] || 0
            const gradient = STORE_GRADIENTS[store.id] || 'linear-gradient(150deg, #1e293b, #0f172a)'
            const storeImage = allImages[store.id]?.store
            const storeCartCount = cart.getStoreItemCount(store.id)
            const imgHeight = (store as any).image_height || 176
            const imgPosition = (store as any).image_position || 'center'

            return (
              <Link key={store.id} href={`/market/${store.id}`} className="block">
                <div
                  className="bg-white overflow-hidden"
                  style={{ borderRadius: 16, boxShadow: '0 2px 14px rgba(0,0,0,0.08)' }}
                >
                  {/* 이미지 */}
                  <div
                    className="w-full relative overflow-hidden flex items-center justify-center"
                    style={{ height: imgHeight, background: storeImage ? undefined : gradient }}
                  >
                    {storeImage ? (
                      <img
                        src={storeImage}
                        alt={store.name}
                        className="w-full h-full object-contain"
                        style={{ objectPosition: imgPosition }}
                      />
                    ) : (
                      <span className="text-[72px] opacity-50 select-none">{store.emoji}</span>
                    )}

                    {/* 카테고리 뱃지 */}
                    <div
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: 'rgba(0,0,0,0.42)', color: '#fff', backdropFilter: 'blur(4px)' }}
                    >
                      {shortCat}
                    </div>

                    {/* 장바구니 뱃지 */}
                    {storeCartCount > 0 && (
                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold text-white shadow-lg"
                        style={{ background: '#2d5a3d' }}
                      >
                        🛒 {storeCartCount}
                      </div>
                    )}

                    {/* 하단 그라데이션 */}
                    <div className="absolute bottom-0 left-0 right-0 h-12" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.22), transparent)',
                    }} />
                  </div>

                  {/* 정보 */}
                  <div className="px-4 pt-3.5 pb-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <p className="text-[17px] font-bold" style={{ color: '#1a1c1c' }}>{store.name}</p>
                      <span className="text-[11px] mt-0.5 flex-shrink-0 ml-2" style={{ color: '#8c9688' }}>
                        {store.hours || '09:00~18:00'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[12px]" style={{ color: '#8c9688' }}>
                        👥 {participants}명 참여중
                      </span>
                    </div>

                    <p className="text-[13px] leading-[20px] line-clamp-2 mb-3.5" style={{ color: '#6c7a71' }}>
                      {store.description}
                    </p>

                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: '1px solid #f0ebe3' }}
                    >
                      <span className="text-[11px]" style={{ color: '#8c9688' }}>
                        최소주문 {store.minOrder.toLocaleString()}원
                      </span>
                      <div
                        className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white"
                        style={{ background: '#2d5a3d' }}
                      >
                        구매하기
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {filteredStores.length === 0 && (
            <div className="py-16 text-center text-[13px]" style={{ color: '#a3a3a3' }}>
              해당 카테고리의 가게가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 플로팅 장바구니 바 */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-[64px] left-0 right-0 z-40 px-4 pb-3">
          <button
            onClick={() => router.push('/market/cart')}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-white shadow-xl"
            style={{ background: '#2d5a3d' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span className="text-[14px] font-bold">장바구니</span>
              <span className="text-[12px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.18)' }}>
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
