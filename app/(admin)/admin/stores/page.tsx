'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { STORES } from '@/lib/market-data'

type DisplayStatus = 'visible' | 'hidden' | 'coming_soon'

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
  display_status: DisplayStatus
  sort_order: number
  isCustom: boolean
  product_count?: number
  owner_nickname?: string
}

const STATUS_LABEL: Record<DisplayStatus, string> = {
  visible: '노출',
  hidden: '숨김',
  coming_soon: '입점예정',
}
const STATUS_COLOR: Record<DisplayStatus, { bg: string; text: string; border: string }> = {
  visible:     { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  hidden:      { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  coming_soon: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
}

interface StoresConfig {
  overrides: Record<string, any>
  custom: any[]
  deleted: string[]
}

const CATEGORIES = ['편의점·슈퍼', '반찬·가정식', '정육·축산', '죽·분식', '치킨·튀김', '베이커리·카페', '한식', '중식', '일식', '기타']
const DAYS = [
  { key: 'sun', label: '일' }, { key: 'mon', label: '월' }, { key: 'tue', label: '화' },
  { key: 'wed', label: '수' }, { key: 'thu', label: '목' }, { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
]
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
  deliveryFee: 0, accentColor: '#10b981', bank_account: '', telegram_chat_id: '', phone: '',
}

function StatusSelect({ value, onChange, disabled, size = 'md' }: {
  value: DisplayStatus
  onChange: (v: DisplayStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const opts: DisplayStatus[] = ['visible', 'hidden', 'coming_soon']
  const padX = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]'
  return (
    <div className={`inline-flex bg-[#f2f4f6] rounded-[6px] p-0.5 ${disabled ? 'opacity-60' : ''}`}>
      {opts.map(s => {
        const active = value === s
        const color = STATUS_COLOR[s]
        return (
          <button key={s} type="button" disabled={disabled}
            onClick={() => onChange(s)}
            className={`${padX} ${fontSize} font-semibold rounded-[5px] transition-colors`}
            style={active
              ? { background: '#fff', color: color.text, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
              : { background: 'transparent', color: '#6b7280' }
            }>
            {STATUS_LABEL[s]}
          </button>
        )
      })}
    </div>
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
  const [adminClosedDateInput, setAdminClosedDateInput] = useState('')

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

      const storeList: StoreDisplay[] = (marketData.data || []).map((s: any, i: number) => ({
        ...s,
        display_status: (s.display_status as DisplayStatus) || (s.is_active ? 'visible' : 'hidden'),
        sort_order: typeof s.sort_order === 'number' ? s.sort_order : i,
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

      // 어드민 store-settings 덮어쓰기 (display_status, sort_order)
      try {
        const settingsRes = await fetch('/api/admin/stores')
        const settings = await settingsRes.json()
        if (settings.data) {
          settings.data.forEach((s: any) => {
            const store = storeList.find(st => st.id === s.store_id)
            if (store) {
              if (s.display_status) store.display_status = s.display_status
              if (typeof s.sort_order === 'number') store.sort_order = s.sort_order
              store.is_active = store.display_status !== 'hidden'
            }
          })
        }
      } catch {}

      // sort_order로 정렬
      storeList.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))

      setStores(storeList)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function setDisplayStatus(store_id: string, display_status: DisplayStatus) {
    setToggling(store_id)
    setStores(prev => prev.map(s =>
      s.id === store_id ? { ...s, display_status, is_active: display_status !== 'hidden' } : s
    ))
    await fetch('/api/admin/stores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id, display_status }),
    }).catch(() => {})
    setToggling(null)
  }

  async function moveStore(store_id: string, direction: 'up' | 'down') {
    const idx = stores.findIndex(s => s.id === store_id)
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swap < 0 || swap >= stores.length) return

    // 자리 바꾸고 sort_order 0..N으로 재번호
    const next = [...stores]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const renumbered = next.map((s, i) => ({ ...s, sort_order: i }))
    setStores(renumbered)

    await fetch('/api/admin/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: renumbered.map(s => ({ store_id: s.id, sort_order: s.sort_order })) }),
    }).catch(() => {})
  }

  function openAdd() {
    setEditingStore({ ...DEFAULT_STORE })
    setIsNewStore(true)
  }

  // 일회성: 사용자 전화번호 정규화
  const [phoneMigBusy, setPhoneMigBusy] = useState(false)
  async function runPhoneMigration() {
    if (!confirm('users 테이블의 전화번호를 모두 숫자만 남도록 정규화합니다.\n예) "010-1234-5678" → "01012345678"\n\n진행할까요?')) return
    setPhoneMigBusy(true)
    try {
      const res = await fetch('/api/admin/migrate-normalize-phones', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        alert('실패: ' + json.error)
      } else {
        alert(
          '✅ 완료\n\n변경: ' + json.data.changed_count + '건\n' +
          '이미 정규화됨: ' + json.data.unchanged_count + '건\n' +
          '총: ' + json.data.total + '건'
        )
      }
    } catch (e: any) {
      alert('오류: ' + e.message)
    }
    setPhoneMigBusy(false)
  }

  // 일회성: 홈앤미트 카테고리 정리
  const [butcherCatBusy, setButcherCatBusy] = useState(false)
  async function runButcherCategoriesMigration() {
    if (!confirm('홈앤미트 카테고리를 정리합니다.\n\n' +
      '• 돼지고기 → 한돈 (병합)\n' +
      '• 소고기 → 한우 (병합)\n' +
      '• 닭볶음탕용 토막 → 닭고기 (신규)\n\n진행할까요?')) return
    setButcherCatBusy(true)
    try {
      const res = await fetch('/api/admin/migrate-butcher-categories', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        alert('실패: ' + json.error)
      } else {
        const cats = Object.entries(json.data.final_categories)
          .map(([k, v]) => `${k}: ${v}개`).join('\n')
        alert(
          '✅ 완료 (변경 ' + json.data.changed_count + '건)\n\n' +
          '【최종 카테고리】\n' + cats + '\n\n총 ' + json.data.total + '개'
        )
      }
    } catch (e: any) {
      alert('오류: ' + e.message)
    }
    setButcherCatBusy(false)
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
      phone: (store as any).phone || '',
      weekly_closed: (store as any).weekly_closed || [],
      closed_dates: (store as any).closed_dates || [],
      isCustom: store.isCustom,
    })
    setAdminClosedDateInput('')
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

  const visibleCount = stores.filter(s => s.display_status === 'visible').length
  const comingCount = stores.filter(s => s.display_status === 'coming_soon').length
  const hiddenCount = stores.filter(s => s.display_status === 'hidden').length

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">상점가 가게 관리</h1>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">
            전체 {stores.length}개 · 노출 <span className="text-[#6d28d9] font-semibold">{visibleCount}</span> · 입점예정 <span className="text-[#b45309] font-semibold">{comingCount}</span> · 숨김 <span className="text-[#6b7280] font-semibold">{hiddenCount}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runPhoneMigration} disabled={phoneMigBusy}
            className="h-[36px] px-3 rounded-[10px] bg-[#dbeafe] text-[#1e40af] text-[11px] font-semibold border border-[#bfdbfe] disabled:opacity-50"
            title="users 전화번호 정규화 (1회용)">
            {phoneMigBusy ? '실행 중...' : '📞 전화번호 정규화'}
          </button>
          <button onClick={runButcherCategoriesMigration} disabled={butcherCatBusy}
            className="h-[36px] px-3 rounded-[10px] bg-[#fef3c7] text-[#b45309] text-[11px] font-semibold border border-[#fde68a] disabled:opacity-50"
            title="홈앤미트 카테고리 정리 (1회용)">
            {butcherCatBusy ? '실행 중...' : '🔧 홈앤미트 카테고리 정리'}
          </button>
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
          ▲▼ 버튼으로 노출 순서를 바꿔요. 고객 노출은 <b>노출 / 입점예정 / 숨김</b> 중 선택. ✏️ 버튼으로 가게 정보를 수정하고, 🗑️ 버튼으로 삭제할 수 있습니다.
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
                  {['순서', '가게', '카테고리', '영업시간', '영업상태', '고객 노출', '최소주문', '배달비', '상품', '담당사장님', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stores.map((store, idx) => (
                  <tr key={store.id} className="border-b border-[#f9f9f9] hover:bg-[#f9f9f9] transition-colors">
                    <td className="px-2 py-3">
                      <div className="flex flex-col items-center gap-0">
                        <button onClick={() => moveStore(store.id, 'up')} disabled={idx === 0}
                          className="w-6 h-5 flex items-center justify-center text-[11px] text-[#888] hover:text-[#8B5CF6] disabled:opacity-25 disabled:cursor-not-allowed"
                          title="위로">▲</button>
                        <button onClick={() => moveStore(store.id, 'down')} disabled={idx === stores.length - 1}
                          className="w-6 h-5 flex items-center justify-center text-[11px] text-[#888] hover:text-[#8B5CF6] disabled:opacity-25 disabled:cursor-not-allowed"
                          title="아래로">▼</button>
                      </div>
                    </td>
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
                      <StatusSelect value={store.display_status}
                        onChange={(v) => setDisplayStatus(store.id, v)}
                        disabled={toggling === store.id} />
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
            {stores.map((store, idx) => (
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
                    <button onClick={() => moveStore(store.id, 'up')} disabled={idx === 0}
                      className="p-1.5 rounded-[6px] bg-[#f2f4f6] text-[#888] disabled:opacity-25"
                      title="위로">▲</button>
                    <button onClick={() => moveStore(store.id, 'down')} disabled={idx === stores.length - 1}
                      className="p-1.5 rounded-[6px] bg-[#f2f4f6] text-[#888] disabled:opacity-25"
                      title="아래로">▼</button>
                    <button onClick={() => openEdit(store)} className="p-1.5 rounded-[6px] bg-[#f2f4f6] text-[#8B5CF6]">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteConfirm(store)} className="p-1.5 rounded-[6px] bg-[#f2f4f6] text-[#b91c1c]">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded-[8px] mb-3"
                  style={{
                    background: STATUS_COLOR[store.display_status].bg,
                    border: `1px solid ${STATUS_COLOR[store.display_status].border}`
                  }}>
                  <span className="text-[12px] font-medium" style={{ color: STATUS_COLOR[store.display_status].text }}>
                    고객 화면: <b>{STATUS_LABEL[store.display_status]}</b>
                  </span>
                  <StatusSelect value={store.display_status}
                    onChange={(v) => setDisplayStatus(store.id, v)}
                    disabled={toggling === store.id}
                    size="sm" />
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

              {/* 가게 전화번호 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">가게 전화번호 (선택)</label>
                <input type="tel" value={editingStore.phone || ''} onChange={e => setEditingStore({ ...editingStore, phone: e.target.value })}
                  placeholder="예: 02-123-4567"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#8B5CF6]" />
                <p className="text-[11px] text-[#a3a3a3] mt-1">고객이 가게 화면에서 탭하면 바로 전화 연결</p>
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

              {/* 정기 휴무 요일 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">정기 휴무 요일</label>
                <div className="flex gap-1">
                  {DAYS.map(d => {
                    const active = (editingStore.weekly_closed || []).includes(d.key)
                    return (
                      <button key={d.key} type="button"
                        onClick={() => setEditingStore({
                          ...editingStore,
                          weekly_closed: active
                            ? (editingStore.weekly_closed || []).filter((k: string) => k !== d.key)
                            : [...(editingStore.weekly_closed || []), d.key],
                        })}
                        className="flex-1 py-2 rounded-[8px] text-[12px] font-bold transition-all border"
                        style={active
                          ? { background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }
                          : { background: '#f9f9f9', color: '#a3a3a3', borderColor: '#e0e0e0' }
                        }
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 임시 휴무일 */}
              <div>
                <label className="text-[12px] font-semibold text-[#1a1c1c] mb-1.5 block">임시 휴무일 지정</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={adminClosedDateInput}
                    onChange={e => setAdminClosedDateInput(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[13px] text-[#1a1c1c] outline-none focus:border-[#b91c1c]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!adminClosedDateInput || (editingStore.closed_dates || []).includes(adminClosedDateInput)) return
                      setEditingStore({
                        ...editingStore,
                        closed_dates: [...(editingStore.closed_dates || []), adminClosedDateInput].sort(),
                      })
                      setAdminClosedDateInput('')
                    }}
                    className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white"
                    style={{ background: '#b91c1c' }}
                  >
                    추가
                  </button>
                </div>
                {(editingStore.closed_dates || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editingStore.closed_dates || []).map((d: string) => (
                      <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        {d}
                        <button type="button" className="ml-0.5 font-bold"
                          onClick={() => setEditingStore({
                            ...editingStore,
                            closed_dates: (editingStore.closed_dates || []).filter((x: string) => x !== d),
                          })}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
