'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
import type { Product, GroupBuy } from '@/lib/types'

const EMOJIS: Record<string, string> = {
  '참나물 무침': '🥬', '궁중 떡볶이': '🍱', '시금치 나물': '🌿',
  '볶음밥 세트': '🍚', '도라지 무침': '🥗', '순두부 찌개': '🍲',
  '[미식연구소] 젓가락돈까스 500g': '🍖', '[후쿠오카함바그] 함박 스테이크 400g': '🥩',
  '[서문시장] 왕 땅콩빵 300g': '🥜', '[푸드령] 두바이 쫀득 쿠키 65g': '🍪',
}

export default function ProductsPage() {
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([])
  const [selectedGb, setSelectedGb] = useState<string>('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: '팩', stock_limit: '' })

  useEffect(() => {
    fetch('/api/group-buys')
      .then(r => r.json())
      .then(d => {
        setGroupBuys(d.data || [])
        if (d.data?.[0]) { setSelectedGb(d.data[0].id); loadProducts(d.data[0].id) }
        setLoading(false)
      })
  }, [])

  function loadProducts(gbId: string) {
    fetch(`/api/products?group_buy_id=${gbId}`)
      .then(r => r.json())
      .then(d => setProducts(d.data || []))
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)
    const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'
    const method = editProduct ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, group_buy_id: selectedGb, price: parseInt(form.price) }),
    })
    loadProducts(selectedGb)
    setShowAddModal(false)
    setEditProduct(null)
    setForm({ name: '', description: '', price: '', unit: '팩', stock_limit: '' })
    setSaving(false)
  }

  async function toggleAvailable(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !product.is_available }),
    })
    loadProducts(selectedGb)
  }

  function openEdit(product: Product) {
    setEditProduct(product)
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      unit: product.unit,
      stock_limit: product.stock_limit ? String(product.stock_limit) : '',
    })
    setShowAddModal(true)
  }

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-[#1a1c1c]">상품 관리</h1>
        <button
          onClick={() => { setEditProduct(null); setForm({ name: '', description: '', price: '', unit: '팩', stock_limit: '' }); setShowAddModal(true) }}
          className="h-[40px] px-4 rounded-[12px] bg-[#10b981] text-white text-[13px] font-semibold"
        >
          + 상품 추가
        </button>
      </div>

      {/* 공구 선택 칩 */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {loading ? (
          <div className="w-6 h-6 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
        ) : groupBuys.map(gb => (
          <button
            key={gb.id}
            onClick={() => { setSelectedGb(gb.id); loadProducts(gb.id) }}
            className="flex-shrink-0 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors"
            style={selectedGb === gb.id
              ? { background: '#10b981', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {gb.title}
          </button>
        ))}
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map(product => (
          <div
            key={product.id}
            className="bg-white rounded-[8px] p-4 transition-opacity"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', opacity: product.is_available ? 1 : 0.45 }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{EMOJIS[product.name] || '🛒'}</span>
              {/* 활성화 토글 */}
              <button
                onClick={() => toggleAvailable(product)}
                className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: product.is_available ? '#10b981' : '#e8e8e8' }}
              >
                <div
                  className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                  style={{ right: product.is_available ? '2px' : 'auto', left: product.is_available ? 'auto' : '2px' }}
                />
              </button>
            </div>
            <p className="font-semibold text-[#1a1c1c] text-[13px] mb-1 truncate">{product.name}</p>
            {product.description && (
              <p className="text-[11px] text-[#a3a3a3] mb-2 line-clamp-2">{product.description}</p>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-bold text-[#10b981]">{formatPrice(product.price)}</span>
              <span className="text-[11px] text-[#a3a3a3]">/{product.unit}</span>
            </div>
            {product.stock_limit && (
              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#a3a3a3]">재고</span>
                  <span className="text-[#1a1c1c] font-medium">{product.stock_limit}개</span>
                </div>
                <div className="w-full bg-[#f2f4f6] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#10b981]" style={{ width: '70%' }} />
                </div>
              </div>
            )}
            <button
              onClick={() => openEdit(product)}
              className="w-full h-[34px] rounded-[8px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium hover:bg-[#e8e8e8] transition-colors"
            >
              ✏️ 수정
            </button>
          </div>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="flex flex-col items-center py-16 gap-2">
          <span className="text-4xl">🏷️</span>
          <p className="text-[14px] font-semibold text-[#1a1c1c]">상품이 없습니다</p>
          <p className="text-[12px] text-[#a3a3a3]">상품을 추가해보세요</p>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-[16px] p-6">
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-5">{editProduct ? '상품 수정' : '상품 추가'}</h3>
            <div className="space-y-4">
              <Input label="상품명 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 참나물 무침" />
              <Textarea label="설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="짧은 설명" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="단가 (원) *" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="6500" />
                <Input label="단위" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="팩" />
              </div>
              <Input label="재고 수량 (비워두면 무제한)" type="number" value={form.stock_limit} onChange={e => setForm(f => ({ ...f, stock_limit: e.target.value }))} placeholder="30" />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>취소</Button>
              <Button className="flex-1" onClick={handleSave} loading={saving}>저장</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
