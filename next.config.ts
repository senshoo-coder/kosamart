import type { NextConfig } from "next";

const securityHeaders = [
  // HTTPS 강제 (2년 + 서브도메인 + preload)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // 외부 사이트에서 iframe으로 우리 앱 embed 차단 (clickjacking 방지)
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // MIME 스니핑 차단
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referer는 동일 origin 외엔 path 노출 안 함 (외부 리프레러 누출 최소화)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 위치/카메라/마이크/결제 등 권한 기본 차단
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
