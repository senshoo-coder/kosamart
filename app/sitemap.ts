import type { MetadataRoute } from 'next'
import { STORES } from '@/lib/market-data'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://xn--bb0bw4xzve3ni.kr'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,                priority: 1.0, changeFrequency: 'daily',   lastModified: now },
    { url: `${SITE_URL}/market`,          priority: 0.9, changeFrequency: 'daily',   lastModified: now },
    { url: `${SITE_URL}/manual.html`,     priority: 0.5, changeFrequency: 'monthly', lastModified: now },
    { url: `${SITE_URL}/login`,           priority: 0.3, changeFrequency: 'yearly',  lastModified: now },
    { url: `${SITE_URL}/register`,        priority: 0.3, changeFrequency: 'yearly',  lastModified: now },
    { url: `${SITE_URL}/market/privacy`,  priority: 0.2, changeFrequency: 'yearly',  lastModified: now },
  ]

  // 정적으로 알려진 가게 페이지들. 동적으로 추가된 가게는 운영 중 supabase 조회로 확장 가능.
  const storePaths: MetadataRoute.Sitemap = STORES.map(s => ({
    url: `${SITE_URL}/market/${s.id}`,
    priority: 0.7,
    changeFrequency: 'weekly' as const,
    lastModified: now,
  }))

  return [...staticPaths, ...storePaths]
}
