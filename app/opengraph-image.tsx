import { ImageResponse } from 'next/og'

// Next.js가 자동으로 이 파일을 /opengraph-image 로 매핑하고 og:image 메타에 연결.
// 1200×630 — 카톡·페이스북·트위터 표준 비율.

export const runtime = 'edge'
export const alt = '코사마트 상점가 — 평창동 공동구매 플랫폼'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 50%, #081c15 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '40px',
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#1b4332',
            background: '#ffd60a',
            borderRadius: 999,
            padding: '14px 44px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            letterSpacing: -1,
          }}
        >
          <span>🎁</span>
          <span>정부 판매 7% 할인</span>
        </div>
        <div
          style={{
            fontSize: 70,
            fontWeight: 700,
            color: '#d8f3dc',
            marginBottom: 8,
            display: 'flex',
            letterSpacing: -2,
          }}
        >
          온누리상품권 사용 가능한
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            marginBottom: 8,
            display: 'flex',
            letterSpacing: -2,
          }}
        >
          평창동 골목형 상점가
        </div>
        <div
          style={{
            fontSize: 70,
            fontWeight: 700,
            color: '#b7e4c7',
            marginBottom: 22,
            display: 'flex',
            letterSpacing: -2,
          }}
        >
          O2O 판매 플랫폼
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 20,
            padding: '14px 44px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            letterSpacing: -1,
          }}
        >
          <span>🔗</span>
          <span>골목상점.kr</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
