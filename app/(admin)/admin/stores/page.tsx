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
  is_active: boolean
  min_order: number
  delivery_fee: number
  badge: string | null
  description: string
  product_count?: number
  owner_nickname?: string
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: checked ? '#8B5CF6' : '#d1d5db' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    setLoading(true)

    const storeList: StoreInfo[] = STORES.map(s => ({
      store_id: s.id,
      name: s.name,
      category: s.category,
      emoji: s.emoji,
      hours: s.hours || '09:00~18:00',
      is_open: s.isOpen,
      is_active: true, // 기본값: 활성
      min_order: s.minOrder,
      delivery_fee: s.deliveryFee,
      badge: s.badge || null,
      description: s.description,
      product_count: s.products.length,
    }))

    try {
      const [settingsRes, productsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stores'),
        fetch('/api/store/products?store_id=__all__'),
        fetch('/api/admin/users?role=owner'),
      ])
      const settings = await settingsRes.json()
      const products = await productsRes.json()
      const users = await usersRes.json()

      if (settings.data) {
        settings.data.forEach((s: any) => {
          const idx = storeList.findIndex(st => st.store_id === s.store_id)
          if (idx >= 0) {
            storeList[idx] = {
              ...storeList[idx],
              ...s,
              name: s.name || storeList[idx].name,
              is_active: s.is_active !== undefined ? s.is_active : storeList[idx].is_active,
            }
          }
        })
      }

      if (products.data) {
        const counts: Record<string, number> = {}
        products.data.forEach((p: any) => { counts[p.store_id] = (counts[p.store_id] || 0) + 1 })
        storeList.forEach(s => { if (counts[s.store_id]) s.product_count = counts[s.store_id] })
      }

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

  async function toggleActive(store_id: string, is_active: boolean) {
    setToggling(store_id)
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id, is_active }),
      })
      if (res.ok) {
        setStores(prev => prev.map(s => s.store_id === store_id ? { ...s, is_active } : s))
      }
    } catch {}
    setToggling(null)
  }

  const activeCount = stores.filter(s => s.is_active).length

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">상점가 가게 관리</h1>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">
            전체 {stores.length}개 · 고객 화면 노출 <span className="text-[#8B5CF6] font-semibold">{activeCount}개</span>
          </p>
        </div>
        <button onClick={loadStores} className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]">
          새로고침
        </button>
      </div>

      {/* 안내 배너 */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] bg-[#ede9fe] border border-[#ddd6fe]">
        <span className="material-symbols-outlined text-[18px] text-[#8B5CF6] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>toggle_on</span>
        <p className="text-[12px] text-[#6d28d9] leading-[18px]">
          <span className="font-semibold">가게 노출 설정</span> — 토글을 끄면 고객 시장 화면에서 해당 가게가 숨겨집니다. 영업 상태(영업중/종료)와는 별개입니다.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 데스크탑 테이블 */}
          <div className="bg-white rounded-[8px] overflow-hidden hidden md:block" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f5f5f5]">
                  {['가게', '카테고리', '영업시간', '영업상태', '노출 설정', '최소주문', '배달비', '상품 수', '담당 사장님', ''].map(h => (
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={store.is_active}
                          onChange={(v) => toggleActive(store.store_id, v)}
                          disabled={toggling === store.store_id}
                        />
                        <span className={`text-[11px] font-medium ${store.is_active ? 'text-[#8B5CF6]' : 'text-[#a3a3a3]'}`}>
                          {store.is_active ? '노출중' : '숨김'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.min_order.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.delivery_fee === 0 ? '무료' : `${store.delivery_fee.toLocaleString()}원`}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[#8B5CF6]">{store.product_count || 0}개</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">
                      {store.owner_nickname ? (
                        <span className="bg-[#ede9fe] text-[#8B5CF6] px-2 py-0.5 rounded-full text-[11px] font-medium">{store.owner_nickname}</span>
                      ) : (
                        <span className="text-[#a3a3a3] text-[11px]">미배정</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/stores/${store.store_id}`} className="text-[12px] text-[#8B5CF6] font-medium hover:underline">
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
              <div key={store.store_id} className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{store.emoji}</span>
                    <div>
                      <p className="text-[14px] font-bold text-[#1a1c1c]">{store.name}</p>
                      <p className="text-[11px] text-[#a3a3a3]">{store.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${store.is_open ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                      {store.is_open ? '영업중' : '영업종료'}
                    </span>
                  </div>
                </div>

                {/* 노출 토글 */}
                <div className="flex items-center justify-between py-2.5 px-3 rounded-[8px] mb-3" style={{ background: store.is_active ? '#faf5ff' : '#f9fafb', border: `1px solid ${store.is_active ? '#ddd6fe' : '#e5e7eb'}` }}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]" style={{ color: store.is_active ? '#8B5CF6' : '#9ca3af', fontVariationSettings: "'FILL' 1" }}>
                      {store.is_active ? 'visibility' : 'visibility_off'}
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: store.is_active ? '#6d28d9' : '#6b7280' }}>
                      {store.is_active ? '고객 화면에 노출중' : '고객 화면에서 숨김'}
                    </span>
                  </div>
                  <Toggle
                    checked={store.is_active}
                    onChange={(v) => toggleActive(store.store_id, v)}
                    disabled={toggling === store.store_id}
                  />
                </div>

                <p className="text-[12px] text-[#3c4a42] mb-3 line-clamp-1">{store.description}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex gap-3 text-[#a3a3a3]">
                    <span>상품 <b className="text-[#8B5CF6]">{store.product_count || 0}개</b></span>
                    <span>최소주문 {store.min_order.toLocaleString()}원</span>
                  </div>
                  <Link href={`/admin/stores/${store.store_id}`} className="text-[12px] text-[#8B5CF6] font-medium">
                    상품 보기 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
