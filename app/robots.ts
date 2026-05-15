import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://xn--bb0bw4xzve3ni.kr'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/market', '/manual.html'],
        disallow: [
          '/admin',
          '/owner',
          '/driver',
          '/api',
          '/concept-login',
          '/test',
          '/forgot-password',
        ],
      },
      // 네이버 검색은 Yeti 봇 사용 — 명시적으로 허용
      {
        userAgent: 'Yeti',
        allow: ['/', '/login', '/register', '/market', '/manual.html'],
        disallow: ['/admin', '/owner', '/driver', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
