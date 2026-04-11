import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  redirect('/login')
  return (
    <main className="min-h-screen gradient-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 items-center justify-center rounded-2xl text-4xl mb-4 card-3d">
            🛒
          </div>
          <h1 className="text-2xl font-800 text-white">코사마트 상점가</h1>
          <p className="text-slate-400 text-sm mt-1">평창동 O2O 공동구매 플랫폼</p>
        </div>

        {/* 역할 선택 */}
        <div className="space-y-3">
          <Link href="/shop">
            <div className="card-3d rounded-2xl p-5 hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  🛍️
                </div>
                <div>
                  <p className="font-700 text-white">공구 참여하기</p>
                  <p className="text-xs text-slate-400 mt-0.5">이번 주 특가 상품 주문</p>
                </div>
                <span className="ml-auto text-emerald-400 text-lg">›</span>
              </div>
            </div>
          </Link>

          <Link href="/login?role=owner">
            <div className="card-3d rounded-2xl p-5 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.06))' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  👔
                </div>
                <div>
                  <p className="font-700 text-white">사장님 관리자</p>
                  <p className="text-xs text-slate-400 mt-0.5">주문 승인 · 상품 관리</p>
                </div>
                <span className="ml-auto text-blue-400 text-lg">›</span>
              </div>
            </div>
          </Link>

          <Link href="/login?role=driver">
            <div className="card-3d rounded-2xl p-5 hover:border-amber-500/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  🏍️
                </div>
                <div>
                  <p className="font-700 text-white">배송기사</p>
                  <p className="text-xs text-slate-400 mt-0.5">배달 목록 · 완료 처리</p>
                </div>
                <span className="ml-auto text-amber-400 text-lg">›</span>
              </div>
            </div>
          </Link>
        </div>

        {/* 데모 테스트 버튼 */}
        <div className="mt-6">
          <Link href="/test">
            <div className="glass rounded-2xl p-4 text-center hover:bg-white/5 transition-all cursor-pointer border border-amber-500/20">
              <span className="text-amber-400 font-600 text-sm">⚡ 데모 모드로 바로 테스트</span>
              <p className="text-xs text-slate-500 mt-0.5">Supabase 없이 목(mock) 데이터로 UI 확인</p>
            </div>
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          앱 설치 없이 웹브라우저에서 바로 이용
        </p>
      </div>
    </main>
  )
}
