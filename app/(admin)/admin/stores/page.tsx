'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { STORES } from '@/lib/market-data'

interface StoreInfo {
  store_id: string
  name: string
  category: string
  emoji: string
  hours: string
  is_open: boolean
  min_order: number
  delivery_fee: number
  badge: string | null
  description: string
  product_count?: number
  owner_nickname?: string
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    setLoading(true)

    // 정적 데이터로 기본 가게 목록 구성
    const storeList: StoreInfo[] = STORES.map(s => ({
      store_id: s.id,
      name: s.name,
      category: s.category,
      emoji: s.emoji,
      hours: s.hours || '09:00~18:00',
      is_open: s.isOpen,
      min_order: s.minOrder,
      delivery_fee: s.deliveryFee,
      badge: s.badge || null,
      description: s.description,
      product_count: s.products.length,
    }))

    // DB에서 store_settings 오버라이드 + 상품 수 + 담당 사장님 정보
    try {
      const [settingsRes, productsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stores'),
        fetch('/api/store/products?store_id=__all__'),
        fetch('/api/admin/users?role=owner'),
      ])
      const settings = await settingsRes.json()
      const products = await productsRes.json()
      const users = await usersRes.json()

      // DB settings로 오버라이드
      if (settings.data) {
        settings.data.forEach((s: any) => {
          const idx = storeList.findIndex(st => st.store_id === s.store_id)
          if (idx >= 0) {
            storeList[idx] = { ...storeList[idx], ...s, name: s.name || storeList[idx].name }
          }
        })
      }

      // 상품 수 카운트
      if (products.data) {
        const counts: Record<string, number> = {}
        products.data.forEach((p: any) => {
          counts[p.store_id] = (counts[p.store_id] || 0) + 1
        })
        storeList.forEach(s => {
          if (counts[s.store_id]) s.product_count = counts[s.store_id]
        })
      }

      // 담당 사장님 매칭
      if (users.data) {
        users.data.forEach((u: any) => {
          if (u.store_id) {
            const store = storeList.find(s => s.store_id === u.store_id)
            if (store) store.owner_nickname = u.nickname
          }
        })
      }
    } catch {}

    setStores(storeList)
    setLoading(false)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">상점가 가게 관리</h1>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">등록된 가게 {stores.length}개</p>
        </div>
        <button onClick={loadStores} className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]">
          새로고침
        </button>
      </div>

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
                  {['가게', '카테고리', '영업시간', '상태', '최소주문', '배달비', '상품 수', '담당 사장님', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.store_id} className="border-b border-[#f9f9f9] hover:bg-[#f9f9f9] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{store.emoji}</span>
                        <div>
                          <p className="text-[13px] font-semibold text-[#1a1c1c]">{store.name}</p>
                          <p className="text-[11px] text-[#a3a3a3]">{store.store_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.category}</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.hours}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${store.is_open ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                        {store.is_open ? '영업중' : '영업종료'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.min_order.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.delivery_fee === 0 ? '무료' : `${store.delivery_fee.toLocaleString()}원`}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[#6d28d9]">{store.product_count || 0}개</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">
                      {store.owner_nickname ? (
                        <span className="bg-[#ede9fe] text-[#6d28d9] px-2 py-0.5 rounded-full text-[11px] font-medium">{store.owner_nickname}</span>
                      ) : (
                        <span className="text-[#a3a3a3] text-[11px]">미배정</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/stores/${store.store_id}`}
                        className="text-[12px] text-[#6d28d9] font-medium hover:underline"
                      >
                        상품 보기 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {stores.map(store => (
              <Link key={store.store_id} href={`/admin/stores/${store.store_id}`}>
                <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{store.emoji}</span>
                      <div>
                        <p className="text-[14px] font-bold text-[#1a1c1c]">{store.name}</p>
                        <p className="text-[11px] text-[#a3a3a3]">{store.category}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${store.is_open ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                      {store.is_open ? '영업중' : '영업종료'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#3c4a42] mb-3 line-clamp-1">{store.description}</p>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex gap-3 text-[#a3a3a3]">
                      <span>상품 <b className="text-[#6d28d9]">{store.product_count || 0}개</b></span>
                      <span>최소주문 {store.min_order.toLocaleString()}원</span>
                    </div>
                    {store.owner_nickname && (
                      <span className="bg-[#ede9fe] text-[#6d28d9] px-2 py-0.5 rounded-full font-medium">{store.owner_nickname}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
