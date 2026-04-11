'use client'
import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'

export interface MarketCartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  unit: string
  emoji: string
  image_url?: string
  store_id: string
  store_name: string
}

interface MarketCartContextValue {
  items: MarketCartItem[]
  addItem: (item: Omit<MarketCartItem, 'quantity'>) => void
  updateQuantity: (productId: string, storeId: string, quantity: number) => void
  removeItem: (productId: string, storeId: string) => void
  clearStore: (storeId: string) => void
  clearAll: () => void
  storeGroups: Record<string, MarketCartItem[]>
  totalItems: number
  totalAmount: number
  getStoreItemCount: (storeId: string) => number
  getStoreTotal: (storeId: string) => number
}

const MarketCartContext = createContext<MarketCartContextValue | null>(null)

const STORAGE_KEY = 'cosmart_market_cart'

export function MarketCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MarketCartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // localStorage에서 초기화
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {}
    setLoaded(true)
  }, [])

  // localStorage에 동기화
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, loaded])

  const addItem = useCallback((item: Omit<MarketCartItem, 'quantity'>) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product_id === item.product_id && i.store_id === item.store_id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
        return next
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, storeId: string, quantity: number) => {
    setItems(prev => {
      if (quantity <= 0) return prev.filter(i => !(i.product_id === productId && i.store_id === storeId))
      return prev.map(i =>
        i.product_id === productId && i.store_id === storeId ? { ...i, quantity } : i
      )
    })
  }, [])

  const removeItem = useCallback((productId: string, storeId: string) => {
    setItems(prev => prev.filter(i => !(i.product_id === productId && i.store_id === storeId)))
  }, [])

  const clearStore = useCallback((storeId: string) => {
    setItems(prev => prev.filter(i => i.store_id !== storeId))
  }, [])

  const clearAll = useCallback(() => setItems([]), [])

  const storeGroups = useMemo(() => {
    const groups: Record<string, MarketCartItem[]> = {}
    items.forEach(i => {
      if (!groups[i.store_id]) groups[i.store_id] = []
      groups[i.store_id].push(i)
    })
    return groups
  }, [items])

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const totalAmount = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.quantity, 0), [items])

  const getStoreItemCount = useCallback((storeId: string) =>
    items.filter(i => i.store_id === storeId).reduce((s, i) => s + i.quantity, 0)
  , [items])

  const getStoreTotal = useCallback((storeId: string) =>
    items.filter(i => i.store_id === storeId).reduce((s, i) => s + i.unit_price * i.quantity, 0)
  , [items])

  const value = useMemo(() => ({
    items, addItem, updateQuantity, removeItem, clearStore, clearAll,
    storeGroups, totalItems, totalAmount, getStoreItemCount, getStoreTotal,
  }), [items, addItem, updateQuantity, removeItem, clearStore, clearAll, storeGroups, totalItems, totalAmount, getStoreItemCount, getStoreTotal])

  return <MarketCartContext.Provider value={value}>{children}</MarketCartContext.Provider>
}

export function useMarketCart() {
  const ctx = useContext(MarketCartContext)
  if (!ctx) throw new Error('useMarketCart must be used within MarketCartProvider')
  return ctx
}
