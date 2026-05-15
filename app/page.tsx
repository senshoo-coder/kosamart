'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 루트 페이지: 검색엔진 봇이 메타 태그를 읽을 수 있도록 HTML을 렌더한 뒤
// 일반 사용자만 /login으로 이동시킵니다.
export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fb] p-6 text-center">
      <h1 className="text-2xl font-bold text-[#1a1c1c] mb-2">코사마트 상점가</h1>
      <p className="text-[14px] text-[#6c7a71] mb-8">평창동 골목상점 공동구매 플랫폼</p>
      <p className="text-[13px] text-[#a3a3a3]">잠시만 기다려 주세요…</p>
      <noscript>
        <p className="mt-4 text-[13px] text-[#1d4ed8]">
          <a href="/login">로그인 화면으로 이동</a>
        </p>
      </noscript>
    </main>
  )
}
