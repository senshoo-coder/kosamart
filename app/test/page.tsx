'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  {
    role: 'customer',
    label: '고객 (테스트고객)',
    icon: '🛍️',
    desc: '공구 상품 보기 · 주문하기 · 내 주문 확인',
    dest: '/shop',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    badge: '비밀번호 없음',
    badgeColor: 'text-emerald-400 bg-emerald-500/10',
    pages: [
      { path: '/shop', label: '🛒 공구 홈 (상품 목록)' },
      { path: '/orders', label: '📋 내 주문 목록' },
      { path: '/profile', label: '⚙️ 설정' },
    ],
  },
  {
    role: 'owner',
    label: '사장님 (관리자)',
    icon: '👔',
    desc: '주문 승인/거절 · 상품 관리 · 배달 현황 · 매출 분석',
    dest: '/owner/dashboard',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-500/30',
    badge: 'PW: cosmart2024!',
    badgeColor: 'text-blue-400 bg-blue-500/10',
    pages: [
      { path: '/owner/dashboard', label: '📊 대시보드' },
      { path: '/owner/orders', label: '📋 주문 관리' },
      { path: '/owner/products', label: '🏷️ 상품 관리' },
      { path: '/owner/delivery', label: '🚚 배달 관리' },
      { path: '/owner/analytics', label: '📈 매출 분석' },
    ],
  },
  {
    role: 'driver',
    label: '배달기사',
    icon: '🏍️',
    desc: '배달 목록 확인 · 픽업/완료/이슈 처리',
    dest: '/driver/deliveries',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    badge: 'PW: driver2024!',
    badgeColor: 'text-amber-400 bg-amber-500/10',
    pages: [
      { path: '/driver/deliveries', label: '📦 배달 목록' },
      { path: '/driver/history', label: '✅ 완료 내역' },
    ],
  },
]

export default function TestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleLogin(role: string, dest: string) {
    setLoading(role)
    const res = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const json = await res.json()
    if (json.data) {
      localStorage.setItem('cosmart_nickname', json.data.nickname)
      localStorage.setItem('cosmart_device_uuid', json.data.device_uuid)
      localStorage.setItem('cosmart_user', JSON.stringify(json.data))
    }
    router.push(dest)
    setLoading(null)
  }

  return (
    <div className="gradient-bg min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs text-amber-400 font-600">DEMO MODE</span>
          </div>
          <h1 className="text-2xl font-700 text-white mb-2">🛒 코사마트 테스트</h1>
          <p className="text-sm text-slate-400">Supabase 연결 없이 목(mock) 데이터로 UI를 테스트합니다</p>
        </div>

        {/* 역할 카드 */}
        <div className="space-y-4">
          {ROLES.map(({ role, label, icon, desc, dest, gradient, border, badge, badgeColor, pages }) => (
            <div key={role} className={`card-3d rounded-2xl p-5 bg-gradient-to-br ${gradient} border ${border}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <p className="font-700 text-white">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-600 ${badgeColor}`}>{badge}</span>
              </div>

              {/* 바로가기 페이지 목록 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {pages.map(p => (
                  <button
                    key={p.path}
                    onClick={() => handleLogin(role, p.path)}
                    disabled={loading === role}
                    className="text-xs px-3 py-1.5 glass rounded-lg text-slate-300 hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleLogin(role, dest)}
                disabled={!!loading}
                className={`w-full py-3 rounded-xl font-700 text-sm transition-all ${
                  loading === role
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:brightness-110 active:scale-98'
                } bg-white/10 border border-white/15 text-white`}
              >
                {loading === role ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    로그인 중...
                  </span>
                ) : (
                  `${icon} ${label}으로 시작하기`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* 데모 데이터 안내 */}
        <div className="mt-6 glass rounded-2xl p-4">
          <p className="text-xs text-slate-500 font-600 mb-2">📦 포함된 목(mock) 데이터</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <span>• 진행 중 공구 1개 (반찬·신선식품)</span>
            <span>• 상품 6종 (시금치, 당근, 굴비 등)</span>
            <span>• 주문 4건 (대기/승인/배달중/완료)</span>
            <span>• 배달 2건 (배정됨/픽업완료)</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          실제 운영 시에는 <span className="text-slate-400">.env.local</span>에 Supabase 정보를 입력하세요
        </p>
      </div>
    </div>
  )
}
