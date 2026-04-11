'use client'
import { useState, use, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStore } from '@/lib/market-data'
import type { StoreProduct } from '@/lib/market-data'
import { useStoreImages } from '@/lib/hooks/useStoreImages'
import { useStoreProducts, type DBProduct } from '@/lib/hooks/useStoreProducts'
import { useMarketCart } from '@/lib/cart/MarketCartContext'

export default function StorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const router = useRouter()
  const staticStore = getStore(storeId)
  const [dynamicInfo, setDynamicInfo] = useState<{ name?: string; emoji?: string; description?: string } | null>(null)
  const { products: dbProducts } = useStoreProducts(storeId)
  const cart = useMarketCart()

  const [activeCategory, setActiveCategory] = useState('전체')
  const storeImages = useStoreImages(storeId)

  // 동적 가게 정보 로드 (이름 변경 반영)
  useEffect(() => {
    fetch('/api/market/stores')
      .then(r => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          const found = data.find((s: any) => s.id === storeId)
          if (found) setDynamicInfo({ name: found.name, emoji: found.emoji, description: found.description })
        }
      })
      .catch(() => {})
  }, [storeId])

  // 동적 정보로 오버레이된 store 객체
  const store = staticStore ? { ...staticStore, ...dynamicInfo } : null

  // DB 상품 우선, 없으면 정적 데이터 fallback
  const products: (StoreProduct & { imageUrl?: string })[] = useMemo(() => {
    if (dbProducts.length > 0) {
      return dbProducts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        originalPrice: p.original_price || undefined,
        discountRate: p.original_price && p.original_price > p.price
          ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
          : undefined,
        unit: p.unit,
        emoji: p.emoji,
        subcategory: p.subcategory || undefined,
        isAvailable: p.is_available,
        isPopular: p.is_popular,
        tag: p.tag || undefined,
        imageUrl: p.image_url || undefined,
      }))
    }
    return store?.products || []
  }, [dbProducts, store])

  if (!store) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-[#3c4a42]">가게를 찾을 수 없습니다</p>
          <button onClick={() => router.push('/market')} className="mt-4 text-[#10b981] text-sm">← 상점가로</button>
        </div>
      </div>
    )
  }

  const storeItemCount = cart.getStoreItemCount(storeId)
  const storeTotal = cart.getStoreTotal(storeId)

  const subcats = useMemo(() => {
    const cats = Array.from(new Set(products.filter(p => p.subcategory).map(p => p.subcategory!)))
    return cats.length > 0 ? ['전체', ...cats] : store.subcategories ? ['전체', ...store.subcategories] : ['전체']
  }, [products, store])

  const displayedProducts = products.filter(p =>
    p.isAvailable && (activeCategory === '전체' || p.subcategory === activeCategory)
  )

  function handleAdd(product: StoreProduct & { imageUrl?: string }) {
    cart.addItem({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      unit: product.unit,
      emoji: product.emoji,
      image_url: product.imageUrl || storeImages[product.id],
      store_id: storeId,
      store_name: store!.name,
    })
  }

  function getProductQty(productId: string) {
    const item = cart.items.find(i => i.product_id === productId && i.store_id === storeId)
    return item?.quantity || 0
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#eee] flex items-center px-4 py-3">
        <button onClick={() => router.push('/market')} className="text-[#1a1c1c] text-xl w-8 flex items-center">←</button>
        <h1 className="flex-1 text-center text-[15px] font-bold text-[#1a1c1c]">{store.name}</h1>
        <button onClick={() => router.push('/market/cart')} className="relative text-[#1a1c1c] w-8 flex items-center justify-end text-lg">
          🛒
          {cart.totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#10b981] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.totalItems}</span>
          )}
        </button>
      </header>

      {/* 히어로 */}
      <div className="h-52 relative overflow-hidden"
        style={{ background: storeImages['store'] ? undefined : `linear-gradient(160deg, ${store.accentColor}60 0%, ${store.accentColor}20 60%, #1a1c1c 100%)` }}>
        {storeImages['store'] ? (
          <img src={storeImages['store']} alt={store.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[120px] opacity-30 select-none">{store.emoji}</div>
        )}
        <div className="absolute bottom-6 left-6">
          <p className="text-white/80 text-sm font-medium">{store.category}</p>
        </div>
      </div>

      {/* 가게 정보 카드 */}
      <div className="mx-3 -mt-10 bg-white rounded-2xl shadow-lg p-5 relative z-10 mb-1">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-[18px] font-bold text-[#1a1c1c] flex-1 pr-2">{store.name}</h2>
          {store.badge && (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold flex-shrink-0" style={{ background: store.accentColor, color: 'white' }}>{store.badge}</span>
          )}
        </div>
        <p className="text-[13px] text-[#3c4a42] leading-relaxed mb-4">{store.description}</p>
        <div className="grid grid-cols-3 border border-[#f0f0f0] rounded-xl overflow-hidden mb-4">
          <div className="text-center py-3 px-2">
            <p className="text-[10px] text-[#94a3b8] mb-1">운영시간</p>
            <p className="text-[12px] font-semibold text-[#1a1c1c]">{store.hours || '09:00~18:00'}</p>
          </div>
          <div className="text-center py-3 px-2 border-x border-[#f0f0f0]">
            <p className="text-[10px] text-[#94a3b8] mb-1">최소주문</p>
            <p className="text-[12px] font-semibold text-[#1a1c1c]">{store.minOrder.toLocaleString()}원</p>
          </div>
          <div className="text-center py-3 px-2">
            <p className="text-[10px] text-[#94a3b8] mb-1">배송비</p>
            <p className="text-[12px] font-semibold" style={{ color: store.deliveryFee === 0 ? '#10b981' : '#1a1c1c' }}>
              {store.deliveryFee === 0 ? '무료' : `${store.deliveryFee.toLocaleString()}원`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#f0fdf8] rounded-xl px-4 py-3">
          <span className="text-xl">🚚</span>
          <p className="text-[12px] text-[#3c4a42] leading-relaxed">여러 가게 상품을 장바구니에 담아 <b className="text-[#10b981]">묶음배송</b> 가능</p>
        </div>
      </div>

      {/* 카테고리 */}
      {subcats.length > 1 && (
        <div className="px-4 pt-4 pb-2 overflow-x-auto flex gap-2" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {subcats.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all"
              style={activeCategory === cat ? { background: store.accentColor, color: 'white' } : { background: '#f0f0f0', color: '#3c4a42' }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 상품 그리드 */}
      <div className="px-3 pb-36 grid grid-cols-2 gap-3 mt-2">
        {displayedProducts.map(product => {
          const qty = getProductQty(product.id)
          const imgSrc = (product as any).imageUrl || storeImages[product.id]
          return (
            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="relative h-36" style={{ background: imgSrc ? undefined : 'linear-gradient(135deg, #1a1c1c 0%, #2d3748 100%)' }}>
                {imgSrc ? (
                  <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">{product.emoji}</div>
                )}
                {product.discountRate && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{product.discountRate}%</div>
                )}
                {product.tag && !product.discountRate && (
                  <div className="absolute top-2 left-2 text-white text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: store.accentColor }}>{product.tag}</div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[13px] font-semibold text-[#1a1c1c] mb-1 leading-tight line-clamp-2 min-h-[36px]">{product.name}</p>
                {product.originalPrice && (
                  <p className="text-[11px] text-[#94a3b8] line-through mb-0.5">{product.originalPrice.toLocaleString()}원</p>
                )}
                <p className="text-[15px] font-bold mb-2.5" style={{ color: store.accentColor }}>{product.price.toLocaleString()}원</p>
                {qty === 0 ? (
                  <button onClick={() => handleAdd(product)}
                    className="w-full py-2 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 active:opacity-80"
                    style={{ background: store.accentColor }}>
                    <span>🛒</span><span>담기</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-lg overflow-hidden border" style={{ borderColor: store.accentColor }}>
                    <button onClick={() => cart.updateQuantity(product.id, storeId, qty - 1)}
                      className="w-10 h-9 text-[16px] font-bold flex items-center justify-center" style={{ color: store.accentColor }}>−</button>
                    <span className="text-[14px] font-bold" style={{ color: store.accentColor }}>{qty}</span>
                    <button onClick={() => cart.updateQuantity(product.id, storeId, qty + 1)}
                      className="w-10 h-9 text-[16px] font-bold flex items-center justify-center" style={{ color: store.accentColor }}>+</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {displayedProducts.length === 0 && (
          <div className="col-span-2 py-16 text-center text-[#94a3b8] text-sm">해당 카테고리 상품이 없습니다</div>
        )}
      </div>

      {/* 하단 장바구니 바 */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-[64px] left-0 right-0 z-40 px-3 pb-3">
          <button
            onClick={() => router.push('/market/cart')}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-white shadow-xl"
            style={{ background: '#10b981' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span className="text-[14px] font-bold">장바구니 보기</span>
              <span className="bg-white/20 text-[12px] px-2 py-0.5 rounded-full font-semibold">{cart.totalItems}개</span>
            </div>
            <span className="text-[15px] font-bold">{cart.totalAmount.toLocaleString()}원</span>
          </button>
        </div>
      )}
    </div>
  )
}
