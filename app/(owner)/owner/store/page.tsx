'use client'
import { useState, useEffect, useRef } from 'react'
import { STORES, type Store } from '@/lib/market-data'
import BulkProductUpload from '@/components/products/BulkProductUpload'

const HOUR_OPTIONS_START = Array.from({ length: 19 }, (_, i) => i + 5) // 05~23
const HOUR_OPTIONS_END   = Array.from({ length: 19 }, (_, i) => i + 6) // 06~24
const DAYS = [
  { key: 'sun', label: '일' }, { key: 'mon', label: '월' }, { key: 'tue', label: '화' },
  { key: 'wed', label: '수' }, { key: 'thu', label: '목' }, { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
]

function parseHoursRange(hours: string): { start: number; end: number } {
  const m = (hours || '').match(/^(\d{1,2}):\d{2}~(\d{1,2}):\d{2}$/)
  return { start: parseInt(m?.[1] || '9'), end: parseInt(m?.[2] || '22') }
}

function computeIsOpen(store: any): boolean {
  if (!store) return false
  if (!store.isOpen) return false
  if (!store.hours) return true
  const now = new Date()
  const h = now.getHours()
  const { start, end } = parseHoursRange(store.hours)
  if (h < start || h >= end) return false
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const today = dayKeys[now.getDay()]
  if (store.weekly_closed?.includes(today)) return false
  const todayStr = now.toISOString().slice(0, 10)
  if (store.closed_dates?.includes(todayStr)) return false
  return true
}
function buildHours(start: number, end: number): string {
  return `${String(start).padStart(2, '0')}:00~${String(end).padStart(2, '0')}:00`
}

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

interface ImageMap {
  [key: string]: string
}

const EMPTY_PRODUCT: Omit<DBProduct, 'id' | 'store_id'> = {
  name: '',
  description: '',
  price: 0,
  original_price: null,
  unit: '개',
  emoji: '📦',
  image_url: null,
  subcategory: null,
  tag: null,
  is_available: true,
  is_popular: false,
  sort_order: 0,
}

export default function OwnerStorePage() {
  const [store, setStore] = useState<Store | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<DBProduct[]>([])
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ name: '', description: '', hours: '', minOrder: 0, deliveryFee: 0, bank_account: '', telegram_chat_id: '', phone: '', weekly_closed: [] as string[], closed_dates: [] as string[] })
  const [closedDateInput, setClosedDateInput] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [images, setImages] = useState<ImageMap>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<{ type: string; id: string | null }>({ type: 'store', id: null })

  // 상품 편집 모달
  const [editingProduct, setEditingProduct] = useState<Partial<DBProduct> | null>(null)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cosmart_user')
      if (raw) {
        const user = JSON.parse(raw)
        if (user.store_id) {
          const sid = user.store_id
          setStoreId(sid)
          // 정적 fallback 먼저 세팅
          const found = STORES.find(s => s.id === sid)
          if (found) setStore(found)
          // 동적 가게 정보로 덮어쓰기 (이름 변경 반영)
          fetch('/api/market/stores')
            .then(r => r.json())
            .then(({ data }) => {
              if (Array.isArray(data)) {
                const dynamic = data.find((s: any) => s.id === sid)
                if (dynamic) setStore((prev: any) => prev ? { ...prev, ...dynamic } : dynamic)
              }
            })
            .catch(() => {})
          loadProducts(sid)
          loadImages(sid)
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  function startEditInfo() {
    setInfoForm({
      name: store?.name || '',
      description: store?.description || '',
      hours: store?.hours || '',
      minOrder: store?.minOrder || 0,
      deliveryFee: store?.deliveryFee || 0,
      bank_account: (store as any)?.bank_account || '',
      telegram_chat_id: (store as any)?.telegram_chat_id || '',
      phone: (store as any)?.phone || '',
      weekly_closed: (store as any)?.weekly_closed || [],
      closed_dates: (store as any)?.closed_dates || [],
    })
    setClosedDateInput('')
    setEditingInfo(true)
  }

  async function saveInfo() {
    if (!storeId) return
    setSavingInfo(true)
    try {
      const res = await fetch('/api/store/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, ...infoForm }),
      })
      const json = await res.json()
      if (json.error) { alert(json.error); return }
      setStore((prev: any) => prev ? { ...prev, ...infoForm } : prev)
      setEditingInfo(false)
    } catch { alert('저장 중 오류가 발생했습니다') }
    finally { setSavingInfo(false) }
  }

  async function loadProducts(sid: string) {
    try {
      const res = await fetch(`/api/store/products?store_id=${sid}`)
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        const sorted = [...json.data].sort((a: DBProduct, b: DBProduct) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        setProducts(sorted)
      } else {
        // DB에 없으면 정적 데이터 fallback (store state 대신 직접 조회)
        const staticStore = STORES.find(s => s.id === sid)
        if (staticStore) {
          const fallback: DBProduct[] = staticStore.products.map(p => ({
            id: p.id,
            store_id: sid,
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
          }))
          setProducts(fallback)
        }
      }
    } catch {}
  }

  async function loadImages(sid: string) {
    try {
      const res = await fetch(`/api/store/images?store_id=${sid}`)
      const json = await res.json()
      if (json.data) {
        const map: ImageMap = {}
        json.data.forEach((img: any) => {
          const key = img.target_type === 'store' ? 'store' : img.target_id
          if (key) map[key] = img.image_url
        })
        setImages(map)
      }
    } catch {}
  }

  function triggerUpload(type: string, id: string | null) {
    setUploadTarget({ type, id })
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !storeId) return

    const key = uploadTarget.type === 'store' ? 'store' : uploadTarget.id!
    setUploading(key)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('store_id', storeId)
    formData.append('target_type', uploadTarget.type)
    if (uploadTarget.id) formData.append('target_id', uploadTarget.id)

    try {
      const res = await fetch('/api/store/images', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.data?.image_url) {
        setImages(prev => ({ ...prev, [key]: json.data.image_url }))
        // 상품 이미지인 경우 DB에도 반영
        if (uploadTarget.type === 'product' && uploadTarget.id) {
          await fetch('/api/store/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uploadTarget.id, image_url: json.data.image_url }),
          })
        }
      } else if (json.error) {
        alert(`이미지 업로드 실패: ${json.error}`)
      }
    } catch {
      alert('이미지 업로드 중 오류가 발생했습니다')
    }

    setUploading(null)
    e.target.value = ''
  }

  function openAddProduct() {
    setEditingProduct({ ...EMPTY_PRODUCT })
    setIsNewProduct(true)
  }

  function openEditProduct(product: DBProduct) {
    setEditingProduct({ ...product })
    setIsNewProduct(false)
  }

  async function saveProduct() {
    if (!editingProduct || !storeId) return
    if (!editingProduct.name?.trim()) {
      alert('상품명을 입력해주세요')
      return
    }
    if (!editingProduct.price || editingProduct.price <= 0) {
      alert('가격을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      if (isNewProduct) {
        const res = await fetch('/api/store/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingProduct, store_id: storeId }),
        })
        const json = await res.json()
        if (json.data) {
          setProducts(prev => [...prev, json.data])
          setEditingProduct(null)
        } else {
          alert(json.error || '상품 추가 실패')
        }
      } else {
        const res = await fetch('/api/store/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingProduct),
        })
        const json = await res.json()
        if (json.data) {
          setProducts(prev => prev.map(p => p.id === json.data.id ? json.data : p))
          setEditingProduct(null)
        } else {
          alert(json.error || '상품 수정 실패')
        }
      }
    } catch {
      alert('저장 중 오류가 발생했습니다')
    }
    setSaving(false)
  }

  async function deleteProduct(productId: string) {
    try {
      const url = storeId
        ? `/api/store/products?id=${productId}&store_id=${storeId}`
        : `/api/store/products?id=${productId}`
      const res = await fetch(url, { method: 'DELETE' })
      const json = await res.json()
      if (json.data) {
        setProducts(prev => prev.filter(p => p.id !== productId))
        setDeleteConfirm(null)
      } else {
        alert(json.error || '삭제 실패')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  async function moveProduct(productId: string, direction: 'up' | 'down') {
    const target = products.find(p => p.id === productId)
    if (!target) return
    const group = products.filter(p => p.is_available === target.is_available)
    const groupIdx = group.findIndex(p => p.id === productId)
    const swapIdx = direction === 'up' ? groupIdx - 1 : groupIdx + 1
    if (swapIdx < 0 || swapIdx >= group.length) return

    // 그룹 내에서 자리 바꾸고, sort_order를 0,1,2..로 재번호
    // (판매중/품절 그룹이 겹치지 않도록 offset 사용)
    const newGroup = [...group]
    ;[newGroup[groupIdx], newGroup[swapIdx]] = [newGroup[swapIdx], newGroup[groupIdx]]
    const offset = target.is_available ? 0 : 10000
    const updates = newGroup.map((p, i) => ({ id: p.id, sort_order: offset + i }))
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]))

    // 낙관적 업데이트
    setProducts(prev =>
      prev
        .map(p => updateMap.has(p.id) ? { ...p, sort_order: updateMap.get(p.id)! } : p)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    )

    try {
      await Promise.all(updates.map(u =>
        fetch('/api/store/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: u.id, store_id: storeId, sort_order: u.sort_order }),
        })
      ))
    } catch {
      alert('순서 변경 중 오류가 발생했습니다')
      if (storeId) loadProducts(storeId)
    }
  }

  async function toggleAvailability(product: DBProduct) {
    try {
      const res = await fetch('/api/store/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, is_available: !product.is_available }),
      })
      const json = await res.json()
      if (json.data) {
        setProducts(prev => prev.map(p => p.id === json.data.id ? json.data : p))
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    )
  }

  if (!store && !storeId) {
    return (
      <div className="p-5">
        <h1 className="text-[20px] font-bold text-[#1a1c1c] mb-2">내 가게</h1>
        <div className="bg-white rounded-[8px] p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <span className="text-4xl block mb-3">🏪</span>
          <p className="text-[14px] font-semibold text-[#1a1c1c] mb-1">담당 가게가 설정되지 않았습니다</p>
          <p className="text-[12px] text-[#a3a3a3]">관리자에게 문의하여 가게를 배정받으세요</p>
        </div>
      </div>
    )
  }

  const availableProducts = products.filter(p => p.is_available)
  const unavailableProducts = products.filter(p => !p.is_available)
  const storeName = store?.name || storeId || '내 가게'
  const storeEmoji = store?.emoji || '🏪'
  const accentColor = store?.accentColor || '#10b981'

  function calcDiscount(price: number, original: number | null) {
    if (!original || original <= price) return null
    return Math.round(((original - price) / original) * 100)
  }

  return (
    <div className="p-5 space-y-5">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">내 가게</h1>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">가게 정보 및 상품 관리</p>
        </div>
        <div className="flex items-center gap-2">
          {storeId && (
            <BulkProductUpload
              storeId={storeId}
              accentColor={accentColor}
              onSuccess={() => loadProducts(storeId)}
            />
          )}
          <button
            onClick={openAddProduct}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white"
            style={{ background: '#10b981' }}
          >
            + 상품 추가
          </button>
        </div>
      </div>

      {/* 가게 대표 이미지 */}
      <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div
          className="relative w-full flex items-center justify-center cursor-pointer group overflow-hidden"
          onClick={() => triggerUpload('store', null)}
          style={{
            height: (store as any)?.image_height || 192,
            background: images['store'] ? undefined : `linear-gradient(160deg, ${accentColor}60, ${accentColor}20, #1a1c1c)`,
          }}
        >
          {images['store'] ? (
            <img src={images['store']} alt={storeName} className="w-full h-full object-contain"
              style={{ objectPosition: (store as any)?.image_position || 'center' }} />
          ) : (
            <span className="text-[80px] opacity-40 select-none">{storeEmoji}</span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#1a1c1c]">
              {uploading === 'store' ? '업로드 중...' : '대표 이미지 변경'}
            </span>
          </div>
          {uploading === 'store' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* 가게 정보 */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-[#1a1c1c]">{storeName}</h2>
                {store?.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: accentColor + '20', color: accentColor }}>
                    {store.badge}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#a3a3a3]">{store?.category}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${computeIsOpen(store) ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
              {computeIsOpen(store) ? '영업중' : '영업종료'}
            </div>
          </div>

          <p className="text-[13px] text-[#3c4a42] mb-4">{store?.description}</p>

          {/* 영업정보 — 보기/편집 전환 */}
          {editingInfo ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">가게 이름</label>
                <input
                  type="text"
                  value={infoForm.name}
                  onChange={e => setInfoForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">가게 설명</label>
                <textarea
                  value={infoForm.description}
                  onChange={e => setInfoForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be] resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">영업시간</label>
                <div className="flex items-center gap-2">
                  <select
                    value={parseHoursRange(infoForm.hours).start}
                    onChange={e => {
                      const start = parseInt(e.target.value)
                      const { end } = parseHoursRange(infoForm.hours)
                      setInfoForm(f => ({ ...f, hours: buildHours(start, Math.max(start + 1, end)) }))
                    }}
                    className="flex-1 border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be] bg-white"
                  >
                    {HOUR_OPTIONS_START.map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span className="text-[#a3a3a3] text-sm flex-shrink-0">~</span>
                  <select
                    value={parseHoursRange(infoForm.hours).end}
                    onChange={e => {
                      const end = parseInt(e.target.value)
                      const { start } = parseHoursRange(infoForm.hours)
                      setInfoForm(f => ({ ...f, hours: buildHours(start, end) }))
                    }}
                    className="flex-1 border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be] bg-white"
                  >
                    {HOUR_OPTIONS_END.map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">최소 주문 (원)</label>
                  <input
                    type="number"
                    value={infoForm.minOrder}
                    onChange={e => setInfoForm(f => ({ ...f, minOrder: Number(e.target.value) }))}
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">배달비 (원, 0=무료)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={infoForm.deliveryFee}
                    onChange={e => setInfoForm(f => ({ ...f, deliveryFee: Math.max(0, Number(e.target.value)) }))}
                    className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">가게 전화번호</label>
                <input
                  type="tel"
                  value={infoForm.phone}
                  onChange={e => setInfoForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="예) 02-123-4567"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be]"
                />
                <p className="text-[11px] text-[#a3a3a3] mt-1">고객이 가게 화면에서 탭하면 바로 전화 연결됩니다</p>
              </div>

              <div>
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-1">계좌이체 정보</label>
                <input
                  type="text"
                  value={infoForm.bank_account}
                  onChange={e => setInfoForm(f => ({ ...f, bank_account: e.target.value }))}
                  placeholder="예) 국민은행 123-456-789012 (홍길동)"
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#0058be]"
                />
                <p className="text-[11px] text-[#a3a3a3] mt-1">주문 결제 화면에 표시됩니다</p>
              </div>

              {/* 정기 휴무 요일 */}
              <div>
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-2">정기 휴무 요일</label>
                <div className="flex gap-1">
                  {DAYS.map(d => {
                    const active = infoForm.weekly_closed.includes(d.key)
                    return (
                      <button key={d.key} type="button"
                        onClick={() => setInfoForm(f => ({
                          ...f,
                          weekly_closed: active
                            ? f.weekly_closed.filter(k => k !== d.key)
                            : [...f.weekly_closed, d.key],
                        }))}
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
                <label className="text-[11px] text-[#a3a3a3] font-medium block mb-2">임시 휴무일 지정</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={closedDateInput}
                    onChange={e => setClosedDateInput(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 border border-[#e0e0e0] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1c1c] focus:outline-none focus:border-[#b91c1c]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!closedDateInput || infoForm.closed_dates.includes(closedDateInput)) return
                      setInfoForm(f => ({ ...f, closed_dates: [...f.closed_dates, closedDateInput].sort() }))
                      setClosedDateInput('')
                    }}
                    className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white"
                    style={{ background: '#b91c1c' }}
                  >
                    추가
                  </button>
                </div>
                {infoForm.closed_dates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {infoForm.closed_dates.map(d => (
                      <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        {d}
                        <button type="button" className="ml-0.5 font-bold"
                          onClick={() => setInfoForm(f => ({ ...f, closed_dates: f.closed_dates.filter(x => x !== d) }))}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveInfo}
                  disabled={savingInfo}
                  className="flex-1 py-2.5 rounded-[8px] text-[13px] font-semibold text-white"
                  style={{ background: accentColor, opacity: savingInfo ? 0.6 : 1 }}
                >
                  {savingInfo ? '저장 중…' : '저장'}
                </button>
                <button
                  onClick={() => setEditingInfo(false)}
                  className="px-5 py-2.5 rounded-[8px] text-[13px] font-medium text-[#666] bg-[#f0f0f0]"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f9f9f9] rounded-[8px] p-3">
                  <p className="text-[11px] text-[#a3a3a3] mb-1">영업시간</p>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">{store?.hours || '—'}</p>
                </div>
                <div className="bg-[#f9f9f9] rounded-[8px] p-3">
                  <p className="text-[11px] text-[#a3a3a3] mb-1">최소 주문</p>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">{store?.minOrder?.toLocaleString()}원</p>
                </div>
                <div className="bg-[#f9f9f9] rounded-[8px] p-3">
                  <p className="text-[11px] text-[#a3a3a3] mb-1">배달비</p>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">{store?.deliveryFee === 0 ? '무료' : `${store?.deliveryFee?.toLocaleString()}원`}</p>
                </div>
                <div className="bg-[#f9f9f9] rounded-[8px] p-3">
                  <p className="text-[11px] text-[#a3a3a3] mb-1">판매 상품</p>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">{products.length}개</p>
                </div>
              </div>
              {(store as any)?.bank_account && (
                <div className="mt-3 bg-[#f0fdf8] border border-[#d1fae5] rounded-[8px] p-3">
                  <p className="text-[11px] text-[#a3a3a3] mb-1">계좌이체 정보</p>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">{(store as any).bank_account}</p>
                </div>
              )}
              {((store as any)?.weekly_closed?.length > 0 || (store as any)?.closed_dates?.length > 0) && (
                <div className="mt-3 bg-[#fff8f8] border border-[#fecaca] rounded-[8px] p-3">
                  <p className="text-[11px] text-[#a3a3a3] mb-1.5">휴무일</p>
                  {(store as any)?.weekly_closed?.length > 0 && (
                    <p className="text-[12px] font-semibold text-[#b91c1c] mb-1">
                      매주 {DAYS.filter(d => (store as any).weekly_closed.includes(d.key)).map(d => d.label + '요일').join(', ')}
                    </p>
                  )}
                  {(store as any)?.closed_dates?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(store as any).closed_dates.map((d: string) => (
                        <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c]">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={startEditInfo}
                className="mt-3 w-full py-2 rounded-[8px] text-[13px] font-medium border"
                style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '08' }}
              >
                영업정보 수정
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 판매중 상품 */}
      <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 border-b border-[#f5f5f5]">
          <h3 className="text-[14px] font-bold text-[#1a1c1c]">판매 상품 ({availableProducts.length}개 판매중)</h3>
          <p className="text-[11px] text-[#a3a3a3] mt-0.5">상품을 탭하여 수정하세요</p>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {availableProducts.map((product, idx) => (
            <ProductRow
              key={product.id}
              product={product}
              imageUrl={images[product.id] || product.image_url || undefined}
              uploading={uploading === product.id}
              onUpload={() => triggerUpload('product', product.id)}
              onEdit={() => openEditProduct(product)}
              onToggle={() => toggleAvailability(product)}
              onDelete={() => setDeleteConfirm(product.id)}
              onMoveUp={() => moveProduct(product.id, 'up')}
              onMoveDown={() => moveProduct(product.id, 'down')}
              canMoveUp={idx > 0}
              canMoveDown={idx < availableProducts.length - 1}
              calcDiscount={calcDiscount}
            />
          ))}
          {availableProducts.length === 0 && (
            <div className="py-8 text-center text-[#a3a3a3] text-[13px]">
              판매중인 상품이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 품절 상품 */}
      {unavailableProducts.length > 0 && (
        <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-4 border-b border-[#f5f5f5]">
            <h3 className="text-[14px] font-bold text-[#b91c1c]">품절 상품 ({unavailableProducts.length}개)</h3>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {unavailableProducts.map((product, idx) => (
              <ProductRow
                key={product.id}
                product={product}
                imageUrl={images[product.id] || product.image_url || undefined}
                uploading={uploading === product.id}
                onUpload={() => triggerUpload('product', product.id)}
                onEdit={() => openEditProduct(product)}
                onToggle={() => toggleAvailability(product)}
                onDelete={() => setDeleteConfirm(product.id)}
                onMoveUp={() => moveProduct(product.id, 'up')}
                onMoveDown={() => moveProduct(product.id, 'down')}
                canMoveUp={idx > 0}
                canMoveDown={idx < unavailableProducts.length - 1}
                calcDiscount={calcDiscount}
                disabled
              />
            ))}
          </div>
        </div>
      )}

      {/* 상품 편집 모달 */}
      {editingProduct && (
        <ProductModal
          product={editingProduct}
          isNew={isNewProduct}
          saving={saving}
          onChange={setEditingProduct}
          onSave={saveProduct}
          onClose={() => setEditingProduct(null)}
          calcDiscount={calcDiscount}
          storeId={storeId}
          currentImageUrl={editingProduct.id ? (images[editingProduct.id] || editingProduct.image_url || null) : (editingProduct.image_url || null)}
          onImageUploaded={(url) => {
            setEditingProduct(prev => prev ? { ...prev, image_url: url } : prev)
            if (editingProduct.id) setImages(prev => ({ ...prev, [editingProduct.id!]: url }))
          }}
        />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-[12px] p-6 mx-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-[#1a1c1c] mb-2">상품 삭제</p>
            <p className="text-[13px] text-[#3c4a42] mb-5">이 상품을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-[8px] text-[13px] font-semibold border border-[#e0e0e0] text-[#3c4a42]"
              >
                취소
              </button>
              <button
                onClick={() => deleteProduct(deleteConfirm)}
                className="flex-1 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[#b91c1c] text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductRow({ product, imageUrl, uploading, onUpload, onEdit, onToggle, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, calcDiscount, disabled }: {
  product: DBProduct
  imageUrl?: string
  uploading: boolean
  onUpload: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  calcDiscount: (price: number, original: number | null) => number | null
  disabled?: boolean
}) {
  const discount = calcDiscount(product.price, product.original_price)

  return (
    <div className={`px-5 py-3 flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
      {/* 순서 이동 */}
      <div className="flex flex-col flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="w-6 h-5 flex items-center justify-center text-[11px] text-[#888] hover:text-[#10b981] disabled:opacity-25 disabled:cursor-not-allowed"
          title="위로"
        >▲</button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="w-6 h-5 flex items-center justify-center text-[11px] text-[#888] hover:text-[#10b981] disabled:opacity-25 disabled:cursor-not-allowed"
          title="아래로"
        >▼</button>
      </div>

      {/* 이미지 */}
      <button
        onClick={onUpload}
        className="relative w-12 h-12 rounded-[8px] overflow-hidden flex-shrink-0 group"
        style={{ background: imageUrl ? undefined : '#f2f4f6' }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl flex items-center justify-center w-full h-full">{product.emoji}</span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-medium">
            {uploading ? '...' : '사진'}
          </span>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* 상품 정보 */}
      <button className="flex-1 min-w-0 text-left" onClick={onEdit}>
        <p className="text-[13px] font-semibold text-[#1a1c1c] truncate">{product.name}</p>
        <p className="text-[11px] text-[#a3a3a3] truncate">{product.description}</p>
      </button>

      {/* 가격 + 할인 */}
      <div className="text-right flex-shrink-0 mr-1">
        {disabled ? (
          <span className="text-[11px] text-[#b91c1c] font-medium">품절</span>
        ) : (
          <>
            <p className="text-[13px] font-bold text-[#10b981]">{product.price.toLocaleString()}원</p>
            {product.original_price && (
              <p className="text-[10px] text-[#a3a3a3] line-through">{product.original_price.toLocaleString()}원</p>
            )}
            {discount && (
              <span className="text-[9px] font-bold text-[#b91c1c]">{discount}% 할인</span>
            )}
          </>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className={`text-[10px] px-2 py-1 rounded-full font-medium ${product.is_available ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#d1fae5] text-[#065f46]'}`}
        >
          {product.is_available ? '품절' : '판매'}
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] px-2 py-1 rounded-full font-medium bg-[#f5f5f5] text-[#a3a3a3]"
        >
          삭제
        </button>
      </div>
    </div>
  )
}

function ProductModal({ product, isNew, saving, onChange, onSave, onClose, calcDiscount, storeId, currentImageUrl, onImageUploaded }: {
  product: Partial<DBProduct>
  isNew: boolean
  saving: boolean
  onChange: (p: Partial<DBProduct>) => void
  onSave: () => void
  onClose: () => void
  calcDiscount: (price: number, original: number | null) => number | null
  storeId: string | null
  currentImageUrl: string | null
  onImageUploaded: (url: string) => void
}) {
  const discount = calcDiscount(product.price || 0, product.original_price || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const imgInputRef = useRef<HTMLInputElement>(null)

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !storeId) return
    setUploadError('')
    if (!product.id) {
      setUploadError('이미지는 상품을 먼저 저장한 뒤 추가할 수 있어요.')
      e.target.value = ''
      return
    }
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('store_id', storeId)
      formData.append('target_type', 'product')
      formData.append('target_id', product.id)
      const res = await fetch('/api/store/images', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.data?.image_url) {
        // 상품에도 image_url 영구 저장
        await fetch('/api/store/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: product.id, store_id: storeId, image_url: json.data.image_url }),
        })
        onImageUploaded(json.data.image_url)
      } else {
        setUploadError(json.error || '업로드 실패')
      }
    } catch {
      setUploadError('업로드 중 오류가 발생했습니다')
    }
    setUploadingImage(false)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[16px] sm:rounded-[16px] bg-white p-5"
        onClick={e => e.stopPropagation()}
      >
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-[#1a1c1c]">{isNew ? '상품 추가' : '상품 수정'}</h3>
          <button onClick={onClose} className="text-[#a3a3a3] text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* 사진 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">사진</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                disabled={uploadingImage || isNew}
                className="relative w-20 h-20 rounded-[10px] overflow-hidden border border-[#e0e0e0] bg-[#f9fafb] flex items-center justify-center hover:border-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {currentImageUrl ? (
                  <img src={currentImageUrl} alt="상품" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{product.emoji || '📦'}</span>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {!uploadingImage && !isNew && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-medium">변경</span>
                  </div>
                )}
              </button>
              <div className="flex-1">
                {isNew ? (
                  <p className="text-[11px] text-[#a3a3a3]">상품을 먼저 저장한 후 사진을 추가할 수 있어요.</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="text-[12px] px-3 py-1.5 rounded-[8px] bg-[#10b981] text-white font-semibold disabled:opacity-50"
                    >
                      {uploadingImage ? '업로드 중...' : currentImageUrl ? '사진 변경' : '사진 업로드'}
                    </button>
                    <p className="text-[10px] text-[#a3a3a3] mt-1">JPG · PNG · WebP · GIF / 10MB 이하</p>
                  </>
                )}
                {uploadError && <p className="text-[11px] text-[#b91c1c] mt-1">{uploadError}</p>}
              </div>
            </div>
          </div>

          {/* 이모지 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">이모지 (사진 없을 때 표시)</label>
            <input
              value={product.emoji || ''}
              onChange={e => onChange({ ...product, emoji: e.target.value })}
              className="w-20 border border-[#e0e0e0] rounded-[8px] px-3 py-2.5 text-center text-xl outline-none focus:border-[#10b981]"
            />
          </div>

          {/* 상품명 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">상품명 *</label>
            <input
              value={product.name || ''}
              onChange={e => onChange({ ...product, name: e.target.value })}
              placeholder="예: 국내산 계란 30구"
              className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">설명</label>
            <input
              value={product.description || ''}
              onChange={e => onChange({ ...product, description: e.target.value })}
              placeholder="예: 신선한 무항생제 계란"
              className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
            />
          </div>

          {/* 가격 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">판매가 (원) *</label>
              <input
                type="number"
                value={product.price || ''}
                onChange={e => onChange({ ...product, price: Number(e.target.value) })}
                placeholder="9800"
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">원래가 (원)</label>
              <input
                type="number"
                value={product.original_price || ''}
                onChange={e => onChange({ ...product, original_price: Number(e.target.value) || null })}
                placeholder="12000"
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
              />
            </div>
          </div>

          {/* 할인율 표시 */}
          {discount && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#fef2f2] rounded-[8px]">
              <span className="text-[12px] font-bold text-[#b91c1c]">{discount}% 할인</span>
              <span className="text-[11px] text-[#a3a3a3]">
                {product.original_price?.toLocaleString()}원 → {product.price?.toLocaleString()}원
              </span>
            </div>
          )}

          {/* 단위 + 카테고리 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">단위</label>
              <input
                value={product.unit || ''}
                onChange={e => onChange({ ...product, unit: e.target.value })}
                placeholder="개, 판, 봉..."
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">카테고리</label>
              <input
                value={product.subcategory || ''}
                onChange={e => onChange({ ...product, subcategory: e.target.value || null })}
                placeholder="식품, 음료..."
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
              />
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">태그 (선택)</label>
            <input
              value={product.tag || ''}
              onChange={e => onChange({ ...product, tag: e.target.value || null })}
              placeholder="예: 인기, 신상품, 한정"
              className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none focus:border-[#10b981]"
            />
          </div>

          {/* 토글 옵션 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={product.is_available !== false}
                onChange={e => onChange({ ...product, is_available: e.target.checked })}
                className="accent-emerald-500"
              />
              <span className="text-[13px] text-[#3c4a42]">판매중</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={product.is_popular || false}
                onChange={e => onChange({ ...product, is_popular: e.target.checked })}
                className="accent-emerald-500"
              />
              <span className="text-[13px] text-[#3c4a42]">인기상품</span>
            </label>
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full mt-6 py-3 rounded-[8px] text-[14px] font-bold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#10b981' }}
        >
          {saving ? '저장 중...' : isNew ? '상품 추가' : '저장'}
        </button>
      </div>
    </div>
  )
}
