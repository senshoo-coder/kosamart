'use client'
import { useState, useEffect } from 'react'

export interface DBProduct {
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

const cache: Record<string, { data: DBProduct[]; ts: number }> = {}
const CACHE_TTL = 30_000 // 30초

export function useStoreProducts(storeId: string | undefined) {
  const [products, setProducts] = useState<DBProduct[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!storeId) return

    // 캐시 체크
    const cached = cache[storeId]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setProducts(cached.data)
      setLoaded(true)
      return
    }

    let cancelled = false
    fetch(`/api/store/products?store_id=${storeId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json.data && json.data.length > 0) {
          const sorted = [...json.data].sort((a: DBProduct, b: DBProduct) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          cache[storeId] = { data: sorted, ts: Date.now() }
          setProducts(sorted)
        }
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => { cancelled = true }
  }, [storeId])

  return { products, loaded }
}
