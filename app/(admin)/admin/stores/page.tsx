'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { STORES } from '@/lib/market-data'

interface StoreDisplay {
  id: string
  name: string
  emoji: string
  category: string
  description: string
  isOpen: boolean
  badge?: string
  hours?: string
  minOrder: number
  deliveryFee: number
  accentColor: string
  is_active: boolean
  isCustom: boolean
  product_count?: number
  owner_nickname?: string
}

interface StoresConfig {
  overrides: Record<string, any>
  custom: any[]
  deleted: string[]
}

const CATEGORIES = ['편의점·슈퍼', '반찬·가정식', '정육·축산', '죽·분식', '치킨·튀김', '베이커리·카페', '한식', '중식', '일식', '기타']
const ACCENT_OPTIONS = ['#10b981', '#6d28d9', '#2170e4', '#e29100', '#ef4444', '#ec4899', '#0ea5e9', '#14b8a6']
const HOUR_OPTIONS_START = Array.from({ length: 19 }, (_, i) => i + 5) // 05~23
const HOUR_OPTIONS_END   = Array.from({ length: 19 }, (_, i) => i + 6) // 06~24

function parseHoursRange(hours: string): { start: number; end: number } {
  const m = (hours || '').match(/^(\d{1,2}):\d{2}~(\d{1,2}):\d{2}$/)
  return { start: parseInt(m?.[1] || '9'), end: parseInt(m?.[2] || '22') }
}
function buildHours(start: number, end: number): string {
  return `${String(start).padStart(2, '0')}:00~${String(end).padStart(2, '0')}:00`
}

const DEFAULT_STORE = {
  id: '', name: '', emoji: '🏪', category: '기타', description: '',
  isOpen: true, badge: '', hours: '09:00~18:00', minOrder: 10000,
  deliveryFee: 0, accentColor: '#10b981', bank_account: '', telegram_chat_id: '',
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: checked ? '#8B5CF6' : '#d1d5db' }}>
      <span className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreDisplay[]>([])
  const [config, setConfig] = useState<StoresConfig>({ overrides: {}, custom: [], deleted: [] })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<StoreDisplay | null>(null)
  const [editingStore, setEditingStore] = useState<any | null>(null)
  const [isNewStore, setIsNewStore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [configRes, marketRes, productsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stores-config'),
        fetch('/api/market/stores'),
        fetch('/api/store/products?store_id=__all__'),
        fetch('/api/admin/users?role=owner'),
      ])

      const configData = await configRes.json()
      const marketData = await marketRes.json()
      const products = await productsRes.json()
      const users = await usersRes.json()

      if (configData.data) setConfig(configData.data)

      const storeList: StoreDisplay[] = (marketData.data || []).map((s: any) => ({
        ...s,
        product_count: 0,
        owner_nickname: undefined,
      }))

      if (products.data) {
        const counts: Record<string, number> = {}
        products.data.forEach((p: any) => { counts[p.store_id] = (counts[p.store_id] || 0) + 1 })
        storeList.forEach(s => { if (counts[s.id]) s.product_count = counts[s.id] })
      }
      if (users.data) {
        users.data.forEach((u: any) => {
          if (u.store_id) {
            const store = storeList.find(s => s.id === u.store_id)
            if (store) store.owner_nickname = u.nickname
          }
        })
      }

      // 어드민 store-settings(is_active) 덮어쓰기
      try {
        const settingsRes = await fetch('/api/admin/stores')
        const settings = await settingsRes.json()
        if (settings.data) {
          settings.data.forEach((s: any) => {
            const store = storeList.find(st => st.id === s.store_id)
            if (store && s.is_active !== undefined) store.is_active = s.is_active
          })
        }
      } catch {}

      setStores(storeList)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function toggleActive(store_id: string, is_active: boolean) {
    setToggling(store_id)
    await fetch('/api/admin/stores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id, is_active }),
    }).catch(() => {})
    setStores(prev => prev.map(s => s.id === store_id ? { ...s, is_active } : s))
    setToggling(null)
  }

  function openAdd() {
    setEditingStore({ ...DEFAULT_STORE })
    setIsNewStore(true)
  }

  function openEdit(store: StoreDisplay) {
    setEditingStore({
      id: store.id,
      name: store.name,
      emoji: store.emoji,
      category: store.category,
      description: store.description,
      isOpen: store.isOpen,
      badge: store.badge || '',
      hours: store.hours || '09:00~18:00',
      minOrder: store.minOrder,
      deliveryFee: store.deliveryFee,
      accentColor: store.accentColor,
      bank_account: (store as any).bank_account || '',
      telegram_chat_id: (store as any).telegram_chat_id || '',
      isCustom: store.isCustom,
    })
    setIsNewStore(false)
  }

  async function saveStore() {
    if (!editingStore?.name) { alert('가게 이름을 입력해주세요'); return }
    if (isNewStore && !editingStore?.id) { alert('가게 ID를 입력해주세요'); return }
    setSaving(true)
    try {
      const payload = {
        ...editingStore,
        badge: editingStore.badge || undefined,
        minOrder: Number(editingStore.minOrder),
        deliveryFee: Number(editingStore.deliveryFee),
      }
      const method = isNewStore ? 'POST' : 'PATCH'
      const res = await fetch('/api/admin/stores-config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error || '저장 실패'); setSaving(false); return }
      setEditingStore(null)
      await loadAll()
    } catch { alert('저장 중 오류') }
    setSaving(false)
  }

  async function deleteStore() {
    if (!deleteConfirm) return
    setDeleting(true)
    await fetch('/api/admin/stores-config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteConfirm.id, isCustom: deleteConfirm.isCustom }),
    }).catch(() => {})
    setDeleteConfirm(null)
    setDeleting(false)
    await loadAll()
  }

  const activeCount = stores.filter(s => s.is_active).length

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">상점가 가게 관리</h1>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">
            전체 {stores.length}개 · 고객 화면 노출 <span className="text-[#8B5CF6] font-semibold">{activeCount}개</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]">새로고침</button>
          <button onClick={openAdd}
            className="h-[36px] px-4 rounded-[10px] text-[12px] font-semibold text-white flex items-center gap-1.5"
            style={{ background: '#8B5CF6' }}>
            <span className="material-symbols-outlined text-[16px]">add</span> 가게 추가
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] bg-[#ede9fe] border border-[#ddd6fe]">
        <span className="material-symbols-outlined text-[18px] text-[#8B5CF6] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <p className="text-[12px] text-[#6d28d9] leading-[18px]">
          노출 토글로 고객 화면 노출 여부를 제어할 수 있습니다. ✏️ 버튼으로 가게 정보를 수정하고, 🗑️ 버튼으로 삭제할 수 있습니다.
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
                  {['가게', '카테고리', '영업시간', '영업상태', '고객 노출', '최소주문', '배달비', '상품', '담당사장님', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id} className="border-b border-[#f9f9f9] hover:bg-[#f9f9f9] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{store.emoji}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-[#1a1c1c]">{store.name}</p>
                            {store.isCustom && <span className="text-[9px] bg-[#ede9fe] text-[#8B5CF6] px-1.5 py-0.5 rounded-full font-semibold">커스텀</span>}
                            {store.badge && <span className="text-[9px] bg-[#fef3c7] text-[#b45309] px-1.5 py-0.5 rounded-full font-semibold">{store.badge}</span>}
                          </div>
                          <p className="text-[11px] text-[#a3a3a3]">{store.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.category}</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.hours}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${store.isOpen ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                        {store.isOpen ? '영업중' : '영업종료'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle checked={store.is_active} onChange={(v) => toggleActive(store.id, v)} disabled={toggling === store.id} />
                        <span className={`text-[11px] font-medium ${store.is_active ? 'text-[#8B5CF6]' : 'text-[#a3a3a3]'}`}>
                          {store.is_active ? '노출' : '숨김'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.minOrder.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store.deliveryFee === 0 ? '무료' : `${store.deliveryFee.toLocaleString()}원`}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[#8B5CF6]">{store.product_count || 0}개</td>
                    <td className="px-4 py-3">
                      {store.owner_nickname
                        ? <span className="bg-[#ede9fe] text-[#8B5CF6] px-2 py-0.5 rounded-full text-[11px] font-medium">{store.owner_nickname}</span>
                        : <span className="text-[#a3a3a3] text-[11px]">미배정</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/stores/${store.id}/manage`}
                          className="text-[11px] text-[#8B5CF6] font-medium hover:underline whitespace-nowrap">상품</Link>
                        <span className="text-[#e0e0e0]">·</span>
                        <button onClick={() => openEdit(store)} className="p-1 rounded-[6px] hover:bg-[#ede9fe] text-[#8B5CF6] transition-colors" title="수정">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteConfirm(store)} className="p-1 rounded-[6px] hover:bg-[#fee2e2] text-[#b91c1c] transition-colors" title="삭제">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {stores.map(store => (
              <div key={store.id} className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{store.emoji}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[14px] font-bold text-[#1a1c1c]">{store.name}</p>
                        {store.isCustom && <span className="text-[9px] bg-[#ede9fe] text-[#8B5CF6] px-1.5 py-0.5 rounded-full">커스텀</span>}
                      </div>
                      <p className="text-[11px] text-[#a3a3a3]">{store.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(store)} className="p-1.5 rounded-[6px] bg-[#f2f4f6] text-[#8B5CF6]">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteConfirm(store)} className="p-1.5 rounded-[6px] bg-[#f2f4f6] text-[#b91c1c]">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded-[8px] mb-3"
                  style={{ background: store.is_active ? '#faf5ff' : '#f9fafb', border: `1px solid ${store.is_active ? '#ddd6fe' : '#e5e7eb'}` }}>
                  <span className="text-[12px] font-medium" style={{ color: store.is_active ? '#6d28d9' : '#6b7280' }}>
                    {store.is_active ? '고객 화면 노출중' : '고객 화면 숨김'}
                  </span>
                  <Toggle checked={store.is_active} onChange={(v) => toggleActive(store.id, v)} disabled={toggling === store.id} />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex gap-3 text-[#a3a3a3]">
                    <span>상품 <b className="text-[#8B5CF6]">{store.product_count || 0}개</b></span>
                    <span>{store.hours}</span>
                  </div>
                  <Link href={`/admin/stores/${store.id}/manage`} className="text-[12px] text-[#8B5CF6] font-medium">상품 관리 →</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 가게 추가/수정 모달 */}
      {editingStore && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setEditingStore(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-[16px] sm:rounded-[16px] p-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-bold text-[#1a1c1c]">{isNewStore ? '새 가게 추가' : '가게 정보 수정'}</h3>
              <button onClick={() => setEditingStore(null)} className="text-[#a3a3a3] hover:text-[#1a1c1c]">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* ID (신규만) */}
              {isNewStore && (
                <div>
                  <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">가게 ID <span className="text-[#b91c1c]">*</span></label>
                  <input value={editingStore.id} onChange={e => setEditingStore({ ...editingStore, id: e.target.value.replace(/[^a-z0-9-]/g, '') })}
                    placeholder="영문 소문자, 숫자, - 만 사용 (예: my-store)"
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6]" />
                </div>
              )}

              {/* 이모지 + 이름 */}
              <div className="flex gap-3">
                <div className="w-20 flex-shrink-0">
                  <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">이모지</label>
                  <input value={editingStore.emoji} onChange={e => setEditingStore({ ...editingStore, emoji: e.target.value })}
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2.5 text-center text-xl outline-none focus:border-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">가게 이름 <span className="text-[#b91c1c]">*</span></label>
                  <input value={editingStore.name} onChange={e => setEditingStore({ ...editingStore, name: e.target.value })}
                    placeholder="예: 중앙슈퍼"
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6]" />
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">카테고리</label>
                <select value={editingStore.category} onChange={e => setEditingStore({ ...editingStore, category: e.target.value })}
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] outline-none focus:border-[#8B5CF6] bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* 설명 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">가게 설명</label>
                <textarea value={editingStore.description} onChange={e => setEditingStore({ ...editingStore, description: e.target.value })}
                  placeholder="가게를 소개하는 한 줄 설명"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6] resize-none h-20" />
              </div>

              {/* 영업시간 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">영업시간</label>
                <div className="flex items-center gap-2">
                  <select
                    value={parseHoursRange(editingStore.hours).start}
                    onChange={e => {
                      const start = parseInt(e.target.value)
                      const { end } = parseHoursRange(editingStore.hours)
                      setEditingStore({ ...editingStore, hours: buildHours(start, Math.max(start + 1, end)) })
                    }}
                    className="flex-1 border border-[#e0e0e0] rounded-[8px] px-3 py-2.5 text-[13px] text-[#1a1c1c] outline-none focus:border-[#8B5CF6] bg-white"
                  >
                    {HOUR_OPTIONS_START.map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span className="text-[#a3a3a3] text-sm flex-shrink-0">~</span>
                  <select
                    value={parseHoursRange(editingStore.hours).end}
                    onChange={e => {
                      const end = parseInt(e.target.value)
                      const { start } = parseHoursRange(editingStore.hours)
                      setEditingStore({ ...editingStore, hours: buildHours(start, end) })
                    }}
                    className="flex-1 border border-[#e0e0e0] rounded-[8px] px-3 py-2.5 text-[13px] text-[#1a1c1c] outline-none focus:border-[#8B5CF6] bg-white"
                  >
                    {HOUR_OPTIONS_END.map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 뱃지 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">뱃지 (선택)</label>
                <input value={editingStore.badge} onChange={e => setEditingStore({ ...editingStore, badge: e.target.value })}
                  placeholder="예: 인기, 신규"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6]" />
              </div>

              {/* 최소주문 + 배달비 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">최소 주문금액 (원)</label>
                  <input type="number" value={editingStore.minOrder} onChange={e => setEditingStore({ ...editingStore, minOrder: Number(e.target.value) })}
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">배달비 (원, 0=무료)</label>
                  <input type="number" value={editingStore.deliveryFee} onChange={e => setEditingStore({ ...editingStore, deliveryFee: Number(e.target.value) })}
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] outline-none focus:border-[#8B5CF6]" />
                </div>
              </div>

              {/* 액센트 컬러 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">테마 컬러</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_OPTIONS.map(color => (
                    <button key={color} onClick={() => setEditingStore({ ...editingStore, accentColor: color })}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{ background: color, borderColor: editingStore.accentColor === color ? '#1a1c1c' : 'transparent', transform: editingStore.accentColor === color ? 'scale(1.2)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>

              {/* 계좌이체 정보 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">계좌이체 정보 (선택)</label>
                <input value={editingStore.bank_account || ''} onChange={e => setEditingStore({ ...editingStore, bank_account: e.target.value })}
                  placeholder="예: 국민은행 123-456-789012 (홍길동)"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6]" />
                <p className="text-[11px] text-[#a3a3a3] mt-1">주문 결제 화면에 표시됩니다</p>
              </div>

              {/* 텔레그램 가게방 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">텔레그램 가게방 Chat ID (선택)</label>
                <input value={editingStore.telegram_chat_id || ''} onChange={e => setEditingStore({ ...editingStore, telegram_chat_id: e.target.value })}
                  placeholder="예: -1001234567890"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6] font-mono" />
                <p className="text-[11px] text-[#a3a3a3] mt-1">주문 발생 시 관리방 + 가게방으로 동시 알림 발송</p>
              </div>

              {/* 영업 여부 */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editingStore.isOpen} onChange={e => setEditingStore({ ...editingStore, isOpen: e.target.checked })} className="w-4 h-4 accent-[#8B5CF6]" />
                <span className="text-[13px] text-[#3c4a42] font-medium">현재 영업중</span>
              </label>
            </div>

            <button onClick={saveStore} disabled={saving}
              className="w-full mt-6 py-3 rounded-[8px] text-[14px] font-bold text-white disabled:opacity-60 transition-opacity"
              style={{ background: '#8B5CF6' }}>
              {saving ? '저장 중...' : isNewStore ? '가게 추가' : '수정 저장'}
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-5" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-[16px] p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#fee2e2] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-[#b91c1c]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#1a1c1c]">가게 삭제</p>
                <p className="text-[12px] text-[#a3a3a3]">{deleteConfirm.emoji} {deleteConfirm.name}</p>
              </div>
            </div>
            <p className="text-[13px] text-[#3c4a42] mb-5">
              {deleteConfirm.isCustom
                ? '이 가게를 완전히 삭제합니다. 복구할 수 없습니다.'
                : '이 가게는 기본 데이터에 포함되어 있어 관리자 목록에서 숨겨지며, 고객 화면에서도 제거됩니다.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-[8px] text-[13px] font-semibold border border-[#e0e0e0] text-[#3c4a42]">취소</button>
              <button onClick={deleteStore} disabled={deleting}
                className="flex-1 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[#b91c1c] text-white disabled:opacity-60">
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
