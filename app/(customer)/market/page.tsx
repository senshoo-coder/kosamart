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

type DisplayStatus = 'visible' | 'hidden' | 'coming_soon'

interface DynamicStore {
  id: string; name: string; emoji: string; category: string; description: string
  isOpen: boolean; badge?: string; hours?: string; minOrder: number
  deliveryFee: number; accentColor: string; is_active: boolean; isCustom: boolean
  display_status?: DisplayStatus
  sort_order?: number
}

function NeighborhoodIllustration() {
  return (
    <svg viewBox="0 0 320 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">

      {/* ── 나무 1 (왼쪽) ── */}
      <rect x="12" y="106" width="7" height="44" rx="2" fill="rgba(50,90,60,0.45)" />
      <circle cx="16" cy="93" r="20" fill="#6ab584" />
      <circle cx="16" cy="87" r="15" fill="#7dca97" />
      <circle cx="8" cy="99" r="11" fill="#6ab584" />
      <circle cx="24" cy="99" r="11" fill="#6ab584" />

      {/* ── 나무 2 (가게 사이) ── */}
      <rect x="166" y="113" width="6" height="37" rx="2" fill="rgba(50,90,60,0.45)" />
      <circle cx="169" cy="101" r="17" fill="#6ab584" />
      <circle cx="169" cy="96" r="13" fill="#7dca97" />
      <circle cx="162" cy="107" r="10" fill="#6ab584" />
      <circle cx="176" cy="107" r="10" fill="#6ab584" />

      {/* ── 나무 3 (오른쪽) ── */}
      <rect x="298" y="109" width="7" height="41" rx="2" fill="rgba(50,90,60,0.45)" />
      <circle cx="302" cy="97" r="19" fill="#6ab584" />
      <circle cx="302" cy="91" r="14" fill="#7dca97" />
      <circle cx="294" cy="103" r="10" fill="#6ab584" />
      <circle cx="310" cy="103" r="10" fill="#6ab584" />

      {/* ── 건물 1: CAFE ── */}
      <rect x="38" y="68" width="60" height="82" rx="4" fill="rgba(255,255,255,0.88)" />
      <path d="M32,68 L104,68 L100,54 L36,54 Z" fill="#e8956d" />
      <rect x="32" y="50" width="72" height="6" rx="2" fill="#d4815a" />
      <line x1="48" y1="54" x2="45" y2="68" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="63" y1="54" x2="60" y2="68" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="78" y1="54" x2="75" y2="68" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="93" y1="54" x2="90" y2="68" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <rect x="49" y="74" width="38" height="13" rx="2" fill="#e8956d" />
      <text x="68" y="85" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" fontFamily="sans-serif">CAFE</text>
      <rect x="44" y="94" width="18" height="15" rx="2" fill="#b8e4f0" opacity="0.75" />
      <line x1="53" y1="94" x2="53" y2="109" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
      <line x1="44" y1="101" x2="62" y2="101" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
      <rect x="74" y="94" width="18" height="15" rx="2" fill="#b8e4f0" opacity="0.75" />
      <line x1="83" y1="94" x2="83" y2="109" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
      <line x1="74" y1="101" x2="92" y2="101" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
      <rect x="55" y="119" width="16" height="31" rx="2" fill="#c8a882" />
      <circle cx="68" cy="135" r="1.5" fill="#8b6914" />

      {/* ── 건물 2: 꽃가게 ── */}
      <rect x="118" y="76" width="52" height="74" rx="4" fill="rgba(255,255,255,0.88)" />
      <path d="M112,76 L176,76 L172,63 L116,63 Z" fill="#d97878" />
      <rect x="112" y="59" width="64" height="6" rx="2" fill="#c46060" />
      <line x1="126" y1="63" x2="124" y2="76" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="140" y1="63" x2="138" y2="76" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="154" y1="63" x2="152" y2="76" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="168" y1="63" x2="166" y2="76" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <rect x="124" y="83" width="36" height="22" rx="2" fill="#b8e4f0" opacity="0.65" />
      <rect x="130" y="97" width="2.5" height="9" fill="#5a9e6a" />
      <circle cx="131" cy="95" r="4.5" fill="#f48fb1" />
      <rect x="141" y="96" width="2.5" height="10" fill="#5a9e6a" />
      <circle cx="142" cy="93" r="5.5" fill="#ffb74d" />
      <rect x="152" y="97" width="2.5" height="9" fill="#5a9e6a" />
      <circle cx="153" cy="95" r="4.5" fill="#f48fb1" />
      <rect x="122" y="105" width="40" height="7" rx="2" fill="#c8a882" />
      <rect x="130" y="122" width="14" height="28" rx="2" fill="#c8a882" />
      <circle cx="141" cy="137" r="1.5" fill="#8b6914" />

      {/* ── 건물 3: BAKERY ── */}
      <rect x="194" y="70" width="62" height="80" rx="4" fill="rgba(255,255,255,0.88)" />
      <path d="M188,70 L262,70 L258,57 L192,57 Z" fill="#e8b86d" />
      <rect x="188" y="53" width="74" height="6" rx="2" fill="#d4a050" />
      <line x1="204" y1="57" x2="201" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="218" y1="57" x2="215" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="232" y1="57" x2="229" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <line x1="246" y1="57" x2="243" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
      <rect x="205" y="77" width="42" height="13" rx="2" fill="#e8b86d" />
      <text x="226" y="88" textAnchor="middle" fontSize="6.5" fill="white" fontWeight="bold" fontFamily="sans-serif">BAKERY</text>
      <rect x="200" y="97" width="46" height="22" rx="2" fill="#b8e4f0" opacity="0.65" />
      <ellipse cx="213" cy="107" rx="7" ry="5" fill="#d4a050" opacity="0.85" />
      <ellipse cx="225" cy="109" rx="8.5" ry="5.5" fill="#c8855a" opacity="0.85" />
      <ellipse cx="239" cy="107" rx="7" ry="5" fill="#d4a050" opacity="0.85" />
      <rect x="214" y="127" width="16" height="23" rx="2" fill="#c8a882" />
      <circle cx="227" cy="139" r="1.5" fill="#8b6914" />

      {/* ══════════════════════════════════ */}
      {/* ── 캐릭터들 ── */}
      {/* ══════════════════════════════════ */}

      {/* 1. 어르신 (할머니, 지팡이) */}
      <circle cx="25" cy="109" r="7" fill="#f2caa0" />
      <circle cx="25" cy="103" r="5" fill="#d0d0d0" />
      <path d="M18,106 Q25,100 32,106" stroke="#c4c4c4" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="19" y="116" width="12" height="15" rx="4" fill="#9e7eb5" transform="rotate(4,25,123)" />
      <rect x="18" y="128" width="14" height="8" rx="2" fill="#8a6aa0" />
      <rect x="20" y="135" width="4.5" height="13" rx="2" fill="#f2caa0" />
      <rect x="26" y="135" width="4.5" height="13" rx="2" fill="#f2caa0" />
      <ellipse cx="22.5" cy="148.5" rx="4" ry="2" fill="#4a3a2a" />
      <ellipse cx="28.5" cy="148.5" rx="4" ry="2" fill="#4a3a2a" />
      <path d="M32,122 Q35,135 33,149" stroke="#a07830" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="33" cy="121" rx="3" ry="2" fill="#a07830" />
      <line x1="31" y1="122" x2="33" y2="122" stroke="#f2caa0" strokeWidth="3" strokeLinecap="round" />

      {/* 2. 성인 여성 + 아이 (손잡고 걷기) */}
      {/* 엄마 */}
      <circle cx="93" cy="106" r="7.5" fill="#f2caa0" />
      <path d="M85.5,103 Q93,97 100.5,103" stroke="#5c3d1e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <circle cx="101" cy="104" r="3" fill="#5c3d1e" />
      <rect x="86" y="113" width="15" height="18" rx="4" fill="#5b7fa6" />
      <path d="M85,128 Q93,137 101,128" fill="#4a6890" />
      <rect x="87.5" y="135" width="5" height="13" rx="2" fill="#f2caa0" />
      <rect x="94.5" y="135" width="5" height="13" rx="2" fill="#f2caa0" />
      <ellipse cx="90" cy="148.5" rx="4.5" ry="2" fill="#3a2a1e" />
      <ellipse cx="97" cy="148.5" rx="4.5" ry="2" fill="#3a2a1e" />
      <line x1="101" y1="119" x2="109" y2="128" stroke="#f2caa0" strokeWidth="3.5" strokeLinecap="round" />
      {/* 아이 */}
      <circle cx="117" cy="118" r="7" fill="#f2caa0" />
      <circle cx="110" cy="114" r="3.5" fill="#d97878" />
      <circle cx="124" cy="114" r="3.5" fill="#d97878" />
      <path d="M110,114 Q117,110 124,114" stroke="#5c3d1e" strokeWidth="3" fill="none" />
      <rect x="111" y="125" width="12" height="13" rx="3" fill="#e8956d" />
      <rect x="110" y="135" width="14" height="6" rx="2" fill="#d4815a" />
      <rect x="112" y="140" width="4" height="9" rx="2" fill="#f2caa0" />
      <rect x="118" y="140" width="4" height="9" rx="2" fill="#f2caa0" />
      <ellipse cx="114" cy="149.5" rx="3.5" ry="2" fill="#e85d5d" />
      <ellipse cx="120" cy="149.5" rx="3.5" ry="2" fill="#e85d5d" />
      <line x1="111" y1="129" x2="103" y2="128" stroke="#f2caa0" strokeWidth="3.5" strokeLinecap="round" />

      {/* 3. 청년 (꽃가게 앞) */}
      <circle cx="185" cy="107" r="7" fill="#f2caa0" />
      <path d="M178,104 Q185,98 192,104" stroke="#3a2010" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="179" y="114" width="12" height="17" rx="4" fill="#7ec8a0" />
      <rect x="178" y="128" width="14" height="10" rx="2" fill="#5a7a6a" />
      <rect x="180" y="137" width="4.5" height="12" rx="2" fill="#5a7a6a" />
      <rect x="187" y="137" width="4.5" height="12" rx="2" fill="#5a7a6a" />
      <ellipse cx="182.5" cy="149.5" rx="4" ry="2" fill="#2d2d2d" />
      <ellipse cx="189.5" cy="149.5" rx="4" ry="2" fill="#2d2d2d" />
      <line x1="179" y1="118" x2="174" y2="130" stroke="#f2caa0" strokeWidth="3" strokeLinecap="round" />
      <line x1="191" y1="118" x2="196" y2="130" stroke="#f2caa0" strokeWidth="3" strokeLinecap="round" />

      {/* 4. 아빠 + 어린 아이 (베이커리 앞) */}
      {/* 아빠 */}
      <circle cx="272" cy="107" r="7.5" fill="#f2caa0" />
      <path d="M264.5,104 Q272,98 279.5,104" stroke="#2a1a0a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <rect x="265" y="114" width="15" height="18" rx="4" fill="#7a7abd" />
      <rect x="264" y="129" width="17" height="9" rx="2" fill="#4a5068" />
      <rect x="266" y="137" width="5" height="12" rx="2" fill="#4a5068" />
      <rect x="273" y="137" width="5" height="12" rx="2" fill="#4a5068" />
      <ellipse cx="268.5" cy="149.5" rx="4.5" ry="2" fill="#2a2a2a" />
      <ellipse cx="275.5" cy="149.5" rx="4.5" ry="2" fill="#2a2a2a" />
      <line x1="265" y1="119" x2="259" y2="131" stroke="#f2caa0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="280" y1="119" x2="284" y2="129" stroke="#f2caa0" strokeWidth="3.5" strokeLinecap="round" />
      {/* 아빠 손 잡은 유아 */}
      <circle cx="257" cy="125" r="5.5" fill="#f2caa0" />
      <path d="M252,122 Q257,118 262,122" stroke="#5c3d1e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="252" y="130" width="10" height="10" rx="3" fill="#ffb74d" />
      <rect x="253" y="139" width="3.5" height="9" rx="2" fill="#f2caa0" />
      <rect x="258" y="139" width="3.5" height="9" rx="2" fill="#f2caa0" />
      <ellipse cx="254.5" cy="148.5" rx="3" ry="1.8" fill="#4a80c8" />
      <ellipse cx="259.5" cy="148.5" rx="3" ry="1.8" fill="#4a80c8" />
      <line x1="262" y1="132" x2="264" y2="131" stroke="#f2caa0" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── 지면 ── */}
      <rect x="0" y="149" width="320" height="21" fill="rgba(0,0,0,0.09)" />
      <rect x="0" y="149" width="320" height="2" fill="rgba(0,0,0,0.1)" />
    </svg>
  )
}

interface SearchProduct {
  id: string
  store_id: string
  store_name: string
  store_emoji: string
  store_color?: string
  name: string
  description?: string
  price: number
  original_price?: number | null
  unit?: string
  emoji?: string
  image_url?: string | null
  is_available?: boolean
  display_status?: 'visible' | 'hidden' | 'coming_soon'
}

export default function MarketPage() {
  const [activeCategory, setActiveCategory] = useState('전체')
  const [dynamicStores, setDynamicStores] = useState<DynamicStore[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [allProducts, setAllProducts] = useState<SearchProduct[] | null>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
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

  // 검색어가 입력되면 전체 상품 한 번 로드 (이후 캐시 사용)
  useEffect(() => {
    if (!searchQuery.trim()) return
    if (allProducts !== null) return
    if (!dynamicStores) return
    setLoadingSearch(true)
    fetch('/api/store/products?store_id=__all__')
      .then(r => r.json())
      .then(({ data }) => {
        if (!Array.isArray(data)) return
        const storeMap: Record<string, DynamicStore> = {}
        dynamicStores.forEach(s => { storeMap[s.id] = s })
        const products: SearchProduct[] = data
          .filter((p: any) => storeMap[p.store_id]) // 알려진 가게만
          .map((p: any) => {
            const store = storeMap[p.store_id]
            return {
              id: p.id,
              store_id: p.store_id,
              store_name: store?.name || p.store_id,
              store_emoji: store?.emoji || '🏪',
              store_color: store?.accentColor,
              name: p.name,
              description: p.description,
              price: p.price,
              original_price: p.original_price,
              unit: p.unit,
              emoji: p.emoji,
              image_url: p.image_url,
              is_available: p.is_available,
              display_status: store?.display_status,
            }
          })
        setAllProducts(products)
      })
      .catch(() => {})
      .finally(() => setLoadingSearch(false))
  }, [searchQuery, dynamicStores, allProducts])

  const searchResults = useMemo<SearchProduct[]>(() => {
    if (!searchQuery.trim() || !allProducts) return []
    const q = searchQuery.trim().toLowerCase()
    return allProducts.filter(p => {
      if (!p.is_available) return false
      // 입점예정 가게 상품은 검색 결과에서도 제외
      if (p.display_status === 'coming_soon' || p.display_status === 'hidden') return false
      const haystack = `${p.name} ${p.description || ''} ${p.store_name}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [searchQuery, allProducts])

  const isSearching = !!searchQuery.trim()

  const baseStores: DynamicStore[] = dynamicStores ?? STORES.map(s => ({
    id: s.id, name: s.name, emoji: s.emoji, category: s.category,
    description: s.description, isOpen: s.isOpen, badge: s.badge,
    hours: s.hours, minOrder: s.minOrder, deliveryFee: s.deliveryFee,
    accentColor: s.accentColor, is_active: true, isCustom: false,
  }))

  const filteredStores = baseStores.filter(store => {
    // hidden은 고객 화면에서 완전히 숨김. coming_soon은 표시하되 클릭 잠금.
    if (store.display_status === 'hidden') return false
    if (!store.display_status && !store.is_active) return false
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
        style={{ background: '#5c8b6a', minHeight: 220 }}
      >
        {/* 일러스트 (전체 너비) */}
        <div className="absolute inset-0">
          <NeighborhoodIllustration />
        </div>

        {/* 텍스트 가독성 오버레이 (왼쪽→투명) */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, rgba(40,80,55,0.78) 38%, rgba(40,80,55,0.25) 70%, transparent 100%)',
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

        {/* 통합 상품 검색 */}
        <div className="px-5 pt-5">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9688] text-[15px] pointer-events-none">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="전체 상점에서 상품 검색"
              className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-full pl-11 pr-10 py-3 text-[13px] outline-none focus:border-[#2d5a3d]"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#e5dfd5] text-[#4a6358] text-[14px] flex items-center justify-center hover:bg-[#d4ccbf]"
                aria-label="검색 지우기">×</button>
            )}
          </div>
        </div>

        {/* 검색 모드: 결과 표시 */}
        {isSearching && (
          <div className="px-5 pt-4">
            {loadingSearch && allProducts === null ? (
              <div className="py-12 text-center text-[13px]" style={{ color: '#8c9688' }}>검색 중...</div>
            ) : searchResults.length === 0 ? (
              <div className="py-12 text-center text-[13px]" style={{ color: '#8c9688' }}>
                "<b>{searchQuery}</b>" 검색 결과가 없습니다
              </div>
            ) : (
              <>
                <p className="text-[12px] mb-3" style={{ color: '#6c7a71' }}>
                  <b style={{ color: '#2d5a3d' }}>{searchResults.length}건</b>의 상품 검색 결과
                </p>
                <div className="flex flex-col gap-2.5">
                  {searchResults.map(p => (
                    <Link key={`${p.store_id}-${p.id}`} href={`/market/${p.store_id}`}
                      className="bg-white rounded-xl p-3 flex items-center gap-3"
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      {/* 썸네일 */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#f0ebe3] flex items-center justify-center">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <span className="text-2xl">{p.emoji || '🛒'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: '#e5dfd5', color: '#4a6358' }}>
                            {p.store_emoji} {p.store_name}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold leading-tight truncate" style={{ color: '#1a1c1c' }}>{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: '#8c9688' }}>{p.description}</p>
                        )}
                        <p className="text-[13px] font-bold mt-1" style={{ color: p.store_color || '#2d5a3d' }}>
                          {p.price.toLocaleString()}원
                        </p>
                      </div>
                      <span className="text-[#94a3b8] text-[18px] flex-shrink-0">›</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 카테고리 칩 + 가게 목록 (검색 모드 아닐 때만) */}
        {!isSearching && (
        <>
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
            const isComing = store.display_status === 'coming_soon'

            const cardBody = (
              <div
                className="bg-white overflow-hidden"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
                  position: 'relative',
                }}
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
                      style={{ objectPosition: imgPosition, filter: isComing ? 'grayscale(60%)' : undefined }}
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

                  {/* 입점예정 뱃지 */}
                  {isComing && (
                    <div
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-[12px] font-bold shadow-lg"
                      style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                    >
                      🚧 입점예정
                    </div>
                  )}

                  {/* 장바구니 뱃지 (입점예정 아닐 때) */}
                  {!isComing && storeCartCount > 0 && (
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

                  {/* 입점예정 오버레이 */}
                  {isComing && (
                    <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  )}
                </div>

                {/* 정보 */}
                <div className="px-4 pt-3.5 pb-4">
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-[17px] font-bold" style={{ color: isComing ? '#8c9688' : '#1a1c1c' }}>{store.name}</p>
                    <span className="text-[11px] mt-0.5 flex-shrink-0 ml-2" style={{ color: '#8c9688' }}>
                      {store.hours || '09:00~18:00'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[12px]" style={{ color: '#8c9688' }}>
                      {isComing ? '✨ 곧 만나요!' : `👥 ${participants}명 참여중`}
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
                      {isComing ? '주문은 입점 후 가능' : `최소주문 ${store.minOrder.toLocaleString()}원`}
                    </span>
                    <div
                      className="px-4 py-2 rounded-[8px] text-[12px] font-semibold"
                      style={isComing
                        ? { background: '#e5e7eb', color: '#6b7280' }
                        : { background: '#2d5a3d', color: '#fff' }
                      }
                    >
                      {isComing ? '오픈 준비중' : '구매하기'}
                    </div>
                  </div>
                </div>
              </div>
            )

            return isComing ? (
              <div key={store.id} className="block cursor-not-allowed" aria-disabled="true">
                {cardBody}
              </div>
            ) : (
              <Link key={store.id} href={`/market/${store.id}`} className="block">
                {cardBody}
              </Link>
            )
          })}

          {filteredStores.length === 0 && (
            <div className="py-16 text-center text-[13px]" style={{ color: '#a3a3a3' }}>
              해당 카테고리의 가게가 없습니다
            </div>
          )}
        </div>
        </>
        )}
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
