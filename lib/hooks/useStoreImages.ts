'use client'
import { useState, useEffect } from 'react'

interface StoreImageMap {
  [key: string]: string // 'store' or product_id -> image_url
}

const cache: Record<string, { data: StoreImageMap; ts: number }> = {}
const CACHE_TTL = 30_000 // 30초

export function useStoreImages(storeId: string | undefined) {
  const [images, setImages] = useState<StoreImageMap>(() => {
    if (!storeId) return {}
    const cached = cache[storeId]
    return cached && Date.now() - cached.ts < CACHE_TTL ? cached.data : {}
  })

  useEffect(() => {
    if (!storeId) return

    const cached = cache[storeId]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setImages(cached.data)
      return
    }

    let cancelled = false
    fetch(`/api/store/images?store_id=${storeId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json.data) {
          const map: StoreImageMap = {}
          json.data.forEach((img: any) => {
            const key = img.target_type === 'store' ? 'store' : img.target_id
            if (key) map[key] = img.image_url
          })
          cache[storeId] = { data: map, ts: Date.now() }
          setImages(map)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [storeId])

  return images
}

// Fetch all store images at once (for market listing)
export function useAllStoreImages(storeIds: string[]) {
  const [allImages, setAllImages] = useState<Record<string, StoreImageMap>>({})

  useEffect(() => {
    if (!storeIds.length) return
    Promise.all(
      storeIds.map(id => {
        const cached = cache[id]
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          return Promise.resolve({ id, images: cached.data })
        }
        return fetch(`/api/store/images?store_id=${id}`)
          .then(r => r.json())
          .then(json => {
            const map: StoreImageMap = {}
            json.data?.forEach((img: any) => {
              const key = img.target_type === 'store' ? 'store' : img.target_id
              if (key) map[key] = img.image_url
            })
            cache[id] = { data: map, ts: Date.now() }
            return { id, images: map }
          })
          .catch(() => ({ id, images: {} as StoreImageMap }))
      })
    ).then(results => {
      const map: Record<string, StoreImageMap> = {}
      results.forEach(r => { map[r.id] = r.images })
      setAllImages(map)
    })
  }, [storeIds.join(',')])

  return allImages
}
