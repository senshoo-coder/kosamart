import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '코사마트 상점가 | 평창동 공동구매',
  description: '평창동 코사마트 상점가 O2O 공동구매 플랫폼',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f7f9fb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Regular.woff" rel="preload" as="font" type="font/woff" crossOrigin="anonymous" />
        <style>{`
          @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Regular.woff') format('woff');
            font-weight: 400; font-style: normal;
          }
          @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Medium.woff') format('woff');
            font-weight: 500; font-style: normal;
          }
          @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-SemiBold.woff') format('woff');
            font-weight: 600; font-style: normal;
          }
          @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Bold.woff') format('woff');
            font-weight: 700; font-style: normal;
          }
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
      </head>
      <body className="min-h-full bg-[#f7f9fb] text-[#191c1e]">
        {children}
      </body>
    </html>
  )
}
