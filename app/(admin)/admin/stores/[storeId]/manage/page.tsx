'use client'
import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { STORES, type Store } from '@/lib/market-data'

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

const ACCENT = '#8B5CF6'
const ACCENT_DARK = '#6d28d9'

export default function AdminStoreManagePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)

  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<DBProduct[]>([])
  const [images, setImages] = useState<ImageMap>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<{ type: string; id: string | null }>({ type: 'store', id: null })

  const [editingProduct, setEditingProduct] = useState<Partial<DBProduct> | null>(null)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [imageHeight, setImageHeight] = useState(192)
  const [imagePosition, setImagePosition] = useState('center')
  const [savingImgSettings, setSavingImgSettings] = useState(false)

  async function saveImageSettings(height: number, position: string) {
    setSavingImgSettings(true)
    await fetch('/api/admin/stores-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: storeId, image_height: height, image_position: position }),
    }).catch(() => {})
    setSavingImgSettings(false)
  }

  useEffect(() => {
    // 동적 가게 정보 우선, 없으면 정적 fallback
    fetch('/api/market/stores')
      .then(r => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          const found = data.find((s: any) => s.id === storeId)
          if (found) {
            setStore(found as Store)
            if (found.image_height) setImageHeight(found.image_height)
            if (found.image_position) setImagePosition(found.image_position)
          }
        }
      })
      .catch(() => {
        const found = STORES.find(s => s.id === storeId)
        if (found) setStore(found)
      })
    loadProducts(storeId)
    loadImages(storeId)
    setLoading(false)
  }, [storeId])

  async function loadProducts(sid: string) {
    try {
      const res = await fetch(`/api/store/products?store_id=${sid}`)
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        setProducts(json.data)
      } else {
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
      const res = await fetch(`/api/store/products?id=${productId}`, { method: 'DELETE' })
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
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${ACCENT}30`, borderTopColor: ACCENT }} />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="p-5">
        <Link href="/admin/stores" className="inline-flex items-center gap-1 text-[13px] text-[#a3a3a3] hover:text-[#1a1c1c] mb-4">
          ← 가게 목록
        </Link>
        <div className="bg-white rounded-[8px] p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <span className="text-4xl block mb-3">🏪</span>
          <p className="text-[14px] font-semibold text-[#1a1c1c] mb-1">가게를 찾을 수 없습니다</p>
          <p className="text-[12px] text-[#a3a3a3]">storeId: {storeId}</p>
        </div>
      </div>
    )
  }

  const availableProducts = products.filter(p => p.is_available)
  const unavailableProducts = products.filter(p => !p.is_available)
  const storeName = store.name
  const storeEmoji = store.emoji

  function calcDiscount(price: number, original: number | null) {
    if (!original || original <= price) return null
    return Math.round(((original - price) / original) * 100)
  }

  return (
    <div className="p-5 space-y-5">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* 헤더 */}
      <div>
        <Link href="/admin/stores" className="inline-flex items-center gap-1 text-[13px] text-[#a3a3a3] hover:text-[#1a1c1c] mb-3">
          ← 가게 목록
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#1a1c1c]">가게 관리 — {storeName}</h1>
            <p className="text-[12px] text-[#a3a3a3] mt-0.5">가게 정보 및 상품 관리 (관리자)</p>
          </div>
          <button
            onClick={openAddProduct}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white"
            style={{ background: ACCENT }}
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
            height: imageHeight,
            background: images['store'] ? undefined : `linear-gradient(160deg, ${ACCENT}60, ${ACCENT}20, #1a1c1c)`,
          }}
        >
          {images['store'] ? (
            <img
              src={images['store']}
              alt={storeName}
              className="w-full h-full object-fill"
              style={{ objectPosition: imagePosition }}
            />
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

        {/* 이미지 최적화 컨트롤 */}
        {images['store'] && (
          <div className="px-5 py-3 flex flex-wrap items-center gap-5 border-b border-[#f0f0f0]">
            {/* 높이 */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#a3a3a3] font-medium w-8">높이</span>
              <div className="flex gap-1">
                {([128, 192, 256, 320] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => { setImageHeight(h); saveImageSettings(h, imagePosition) }}
                    className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all"
                    style={imageHeight === h
                      ? { background: ACCENT, color: '#fff' }
                      : { background: '#f0f0f0', color: '#666' }}
                  >
                    {h === 128 ? 'S' : h === 192 ? 'M' : h === 256 ? 'L' : 'XL'}
                  </button>
                ))}
              </div>
            </div>

            {/* 초점 위치 */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#a3a3a3] font-medium w-8">위치</span>
              <div className="grid grid-cols-3 gap-0.5">
                {([
                  ['top left', '↖'], ['top', '↑'], ['top right', '↗'],
                  ['left', '←'],    ['center', '＋'], ['right', '→'],
                  ['bottom left', '↙'], ['bottom', '↓'], ['bottom right', '↘'],
                ] as [string, string][]).map(([pos, icon]) => (
                  <button
                    key={pos}
                    onClick={() => { setImagePosition(pos); saveImageSettings(imageHeight, pos) }}
                    className="w-6 h-6 rounded-[4px] text-[11px] flex items-center justify-center transition-all"
                    style={imagePosition === pos
                      ? { background: ACCENT, color: '#fff' }
                      : { background: '#f0f0f0', color: '#888' }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {savingImgSettings && (
              <span className="text-[11px] text-[#a3a3a3]">저장 중…</span>
            )}
          </div>
        )}

        {/* 가게 정보 */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-[#1a1c1c]">{storeName}</h2>
                {store.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: ACCENT + '20', color: ACCENT }}>
                    {store.badge}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#a3a3a3]">{store.category}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${store.isOpen ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
              {store.isOpen ? '영업중' : '영업종료'}
            </div>
          </div>

          <p className="text-[13px] text-[#3c4a42] mb-4">{store.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[11px] text-[#a3a3a3] mb-1">영업시간</p>
              <p className="text-[13px] font-semibold text-[#1a1c1c]">{store.hours || '—'}</p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[11px] text-[#a3a3a3] mb-1">최소 주문</p>
              <p className="text-[13px] font-semibold text-[#1a1c1c]">{store.minOrder.toLocaleString()}원</p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[11px] text-[#a3a3a3] mb-1">배달비</p>
              <p className="text-[13px] font-semibold text-[#1a1c1c]">{store.deliveryFee === 0 ? '무료' : `${store.deliveryFee.toLocaleString()}원`}</p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[11px] text-[#a3a3a3] mb-1">판매 상품</p>
              <p className="text-[13px] font-semibold text-[#1a1c1c]">{products.length}개</p>
            </div>
          </div>
        </div>
      </div>

      {/* 판매중 상품 */}
      <div className="bg-white rounded-[8px] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 border-b border-[#f5f5f5]">
          <h3 className="text-[14px] font-bold text-[#1a1c1c]">판매 상품 ({availableProducts.length}개 판매중)</h3>
          <p className="text-[11px] text-[#a3a3a3] mt-0.5">상품을 탭하여 수정하세요</p>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {availableProducts.map(product => (
            <ProductRow
              key={product.id}
              product={product}
              imageUrl={images[product.id] || product.image_url || undefined}
              uploading={uploading === product.id}
              onUpload={() => triggerUpload('product', product.id)}
              onEdit={() => openEditProduct(product)}
              onToggle={() => toggleAvailability(product)}
              onDelete={() => setDeleteConfirm(product.id)}
              calcDiscount={calcDiscount}
              accentColor={ACCENT}
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
            {unavailableProducts.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                imageUrl={images[product.id] || product.image_url || undefined}
                uploading={uploading === product.id}
                onUpload={() => triggerUpload('product', product.id)}
                onEdit={() => openEditProduct(product)}
                onToggle={() => toggleAvailability(product)}
                onDelete={() => setDeleteConfirm(product.id)}
                calcDiscount={calcDiscount}
                accentColor={ACCENT}
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
          accentColor={ACCENT}
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

function ProductRow({
  product,
  imageUrl,
  uploading,
  onUpload,
  onEdit,
  onToggle,
  onDelete,
  calcDiscount,
  accentColor,
  disabled,
}: {
  product: DBProduct
  imageUrl?: string
  uploading: boolean
  onUpload: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  calcDiscount: (price: number, original: number | null) => number | null
  accentColor: string
  disabled?: boolean
}) {
  const discount = calcDiscount(product.price, product.original_price)

  return (
    <div className={`px-5 py-3 flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
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
            <p className="text-[13px] font-bold" style={{ color: accentColor }}>{product.price.toLocaleString()}원</p>
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

function ProductModal({
  product,
  isNew,
  saving,
  onChange,
  onSave,
  onClose,
  calcDiscount,
  accentColor,
}: {
  product: Partial<DBProduct>
  isNew: boolean
  saving: boolean
  onChange: (p: Partial<DBProduct>) => void
  onSave: () => void
  onClose: () => void
  calcDiscount: (price: number, original: number | null) => number | null
  accentColor: string
}) {
  const discount = calcDiscount(product.price || 0, product.original_price || null)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[16px] sm:rounded-[16px] bg-white p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-[#1a1c1c]">{isNew ? '상품 추가' : '상품 수정'}</h3>
          <button onClick={onClose} className="text-[#a3a3a3] text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* 이모지 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">이모지</label>
            <input
              value={product.emoji || ''}
              onChange={e => onChange({ ...product, emoji: e.target.value })}
              className="w-20 border border-[#e0e0e0] rounded-[8px] px-3 py-2.5 text-center text-xl outline-none"
              style={{ ['--tw-ring-color' as string]: accentColor }}
              onFocus={e => (e.target.style.borderColor = accentColor)}
              onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
            />
          </div>

          {/* 상품명 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">상품명 *</label>
            <input
              value={product.name || ''}
              onChange={e => onChange({ ...product, name: e.target.value })}
              placeholder="예: 국내산 계란 30구"
              className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
              onFocus={e => (e.target.style.borderColor = accentColor)}
              onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">설명</label>
            <input
              value={product.description || ''}
              onChange={e => onChange({ ...product, description: e.target.value })}
              placeholder="예: 신선한 무항생제 계란"
              className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
              onFocus={e => (e.target.style.borderColor = accentColor)}
              onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
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
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
              />
            </div>
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">원래가 (원)</label>
              <input
                type="number"
                value={product.original_price || ''}
                onChange={e => onChange({ ...product, original_price: Number(e.target.value) || null })}
                placeholder="12000"
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
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
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
              />
            </div>
            <div>
              <label className="text-[12px] text-[#a3a3a3] mb-1.5 block font-medium">카테고리</label>
              <input
                value={product.subcategory || ''}
                onChange={e => onChange({ ...product, subcategory: e.target.value || null })}
                placeholder="식품, 음료..."
                className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
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
              className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] text-[#1a1c1c] placeholder-[#c0c0c0] outline-none"
              onFocus={e => (e.target.style.borderColor = accentColor)}
              onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
            />
          </div>

          {/* 토글 옵션 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={product.is_available !== false}
                onChange={e => onChange({ ...product, is_available: e.target.checked })}
                style={{ accentColor }}
              />
              <span className="text-[13px] text-[#3c4a42]">판매중</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={product.is_popular || false}
                onChange={e => onChange({ ...product, is_popular: e.target.checked })}
                style={{ accentColor }}
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
          style={{ background: saving ? ACCENT_DARK : ACCENT }}
        >
          {saving ? '저장 중...' : isNew ? '상품 추가' : '저장'}
        </button>
      </div>
    </div>
  )
}
