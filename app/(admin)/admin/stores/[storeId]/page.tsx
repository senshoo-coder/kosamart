'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { STORES } from '@/lib/market-data'

interface DBProduct {
  id: string
  store_id: string
  name: string
  description: string
  price: number
  original_price: number | null
  unit: string
  emoji: string
  image_url: string | null
  subcategory: string | null
  tag: string | null
  is_available: boolean
  is_popular: boolean
  sort_order: number
}

export default function AdminStoreProductsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const store = STORES.find(s => s.id === storeId)

  const [products, setProducts] = useState<DBProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all')

  useEffect(() => {
    loadProducts()
  }, [storeId])

  async function loadProducts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/store/products?store_id=${storeId}`)
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        setProducts(json.data)
      } else if (store) {
        // DB에 없으면 정적 데이터 fallback
        setProducts(store.products.map(p => ({
          id: p.id,
          store_id: storeId,
          name: p.name,
          description: p.description,
          price: p.price,
          original_price: p.originalPrice || null,
          unit: p.unit,
          emoji: p.emoji,
          image_url: null,
          subcategory: p.subcategory || null,
          tag: p.tag || null,
          is_available: p.isAvailable,
          is_popular: p.isPopular || false,
          sort_order: 0,
        })))
      }
    } catch {}
    setLoading(false)
  }

  const filtered = products.filter(p => {
    if (filter === 'available') return p.is_available
    if (filter === 'unavailable') return !p.is_available
    return true
  })

  const availCount = products.filter(p => p.is_available).length
  const unavailCount = products.filter(p => !p.is_available).length

  function calcDiscount(price: number, original: number | null) {
    if (!original || original <= price) return null
    return Math.round(((original - price) / original) * 100)
  }

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/admin/stores" className="text-[#6d28d9] text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{store?.emoji || '🏪'}</span>
            <h1 className="text-[20px] font-bold text-[#1a1c1c]">{store?.name || storeId}</h1>
          </div>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">
            {store?.category} · 상품 {products.length}개 (판매중 {availCount} / 품절 {unavailCount})
          </p>
        </div>
        <button onClick={loadProducts} className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]">
          새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">전체 상품</p>
          <p className="text-[20px] font-bold text-[#1a1c1c]">{products.length}개</p>
        </div>
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">판매중</p>
          <p className="text-[20px] font-bold text-[#065f46]">{availCount}개</p>
        </div>
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">품절</p>
          <p className="text-[20px] font-bold text-[#b91c1c]">{unavailCount}개</p>
        </div>
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">할인 상품</p>
          <p className="text-[20px] font-bold text-[#6d28d9]">{products.filter(p => p.original_price && p.original_price > p.price).length}개</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: `전체 (${products.length})` },
          { key: 'available' as const, label: `판매중 (${availCount})` },
          { key: 'unavailable' as const, label: `품절 (${unavailCount})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors"
            style={filter === tab.key
              ? { background: '#6d28d9', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 상품 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#6d28d9]/30 border-t-[#6d28d9] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 데스크탑 테이블 */}
          <div className="bg-white rounded-[8px] overflow-hidden hidden md:block" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f5f5f5]">
                  {['상품', '카테고리', '판매가', '원래가', '할인율', '단위', '태그', '상태'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const discount = calcDiscount(p.price, p.original_price)
                  return (
                    <tr key={p.id} className="border-b border-[#f9f9f9] hover:bg-[#f9f9f9]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-8 h-8 rounded-[6px] object-cover" />
                          ) : (
                            <span className="text-lg">{p.emoji}</span>
                          )}
                          <div>
                            <p className="text-[13px] font-semibold text-[#1a1c1c]">{p.name}</p>
                            <p className="text-[11px] text-[#a3a3a3] truncate max-w-[200px]">{p.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{p.subcategory || '—'}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-[#10b981]">{p.price.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-[12px] text-[#a3a3a3]">
                        {p.original_price ? <span className="line-through">{p.original_price.toLocaleString()}원</span> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {discount ? (
                          <span className="text-[11px] font-bold text-[#b91c1c] bg-[#fef2f2] px-2 py-0.5 rounded-full">{discount}%</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{p.unit}</td>
                      <td className="px-4 py-3">
                        {p.tag ? (
                          <span className="text-[11px] bg-[#ede9fe] text-[#6d28d9] px-2 py-0.5 rounded-full font-medium">{p.tag}</span>
                        ) : p.is_popular ? (
                          <span className="text-[11px] bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded-full font-medium">인기</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${p.is_available ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                          {p.is_available ? '판매중' : '품절'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-[#a3a3a3] text-[13px]">상품이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-2">
            {filtered.map(p => {
              const discount = calcDiscount(p.price, p.original_price)
              return (
                <div key={p.id} className="bg-white rounded-[8px] p-4 flex items-center gap-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-12 h-12 rounded-[8px] object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-[8px] bg-[#f2f4f6] flex items-center justify-center text-xl flex-shrink-0">{p.emoji}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-[#1a1c1c] truncate">{p.name}</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${p.is_available ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                        {p.is_available ? '판매' : '품절'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a3a3a3] truncate">{p.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-bold text-[#10b981]">{p.price.toLocaleString()}원</p>
                    {p.original_price && (
                      <p className="text-[10px] text-[#a3a3a3] line-through">{p.original_price.toLocaleString()}원</p>
                    )}
                    {discount && <span className="text-[9px] font-bold text-[#b91c1c]">{discount}%↓</span>}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-[#a3a3a3] text-[13px]">상품이 없습니다</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
