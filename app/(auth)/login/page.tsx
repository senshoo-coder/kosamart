'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateDeviceUUID, getLocalStorage, setLocalStorage } from '@/lib/utils'
import Link from 'next/link'

const ROLES = [
  { key: 'customer', label: '고객',   emoji: '🛍️', accent: '#10b981', badgeBg: '#ecfdf5', badgeBorder: '#d1fae5' },
  { key: 'owner',    label: '사장님', emoji: '👔', accent: '#3b82f6', badgeBg: '#eff6ff', badgeBorder: '#bfdbfe' },
  { key: 'driver',   label: '기사님', emoji: '🏍️', accent: '#f59e0b', badgeBg: '#fffbeb', badgeBorder: '#fde68a' },
  { key: 'admin',    label: '관리자', emoji: '🛡️', accent: '#8b5cf6', badgeBg: '#faf5ff', badgeBorder: '#e9d5ff' },
]

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const initialRole = params.get('role') || 'customer'
  const redirect = params.get('redirect') || ''

  const [role, setRole] = useState(initialRole)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cfg = ROLES.find(r => r.key === role) ?? ROLES[0]

  useEffect(() => {
    const saved = getLocalStorage('cosmart_nickname')
    if (saved) setNickname(saved)
  }, [])

  // 역할 바꾸면 에러 초기화
  function handleRoleChange(r: string) {
    setRole(r)
    setError('')
  }

  async function handleLogin() {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return }
    if (!password) { setError('비밀번호를 입력해주세요'); return }
    setLoading(true); setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          password,
          device_uuid: getLocalStorage('cosmart_device_uuid') || generateDeviceUUID(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '로그인 실패'); setLoading(false); return }

      setLocalStorage('cosmart_nickname', nickname.trim())
      setLocalStorage('cosmart_device_uuid', data.data.device_uuid)
      setLocalStorage('cosmart_user', JSON.stringify(data.data))

      const destMap: Record<string, string> = {
        owner: '/owner/dashboard',
        driver: '/driver/deliveries',
        admin: '/admin/dashboard',
      }
      router.push(redirect || destMap[data.data.role] || '/market')
    } catch {
      setError('서버 오류가 발생했습니다')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 상단 로고 */}
      <div className="flex items-center gap-2 px-6 pt-12 pb-6">
        <span className="text-2xl">🚚</span>
        <span className="font-extrabold text-[24px] text-[#191c1e] tracking-[-0.75px]">Cosamart</span>
      </div>

      {/* 역할 전환 탭 */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-4 gap-2 p-1.5 bg-[#f2f4f6] rounded-[16px]">
          {ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => handleRoleChange(r.key)}
              className="flex flex-col items-center gap-1 py-3 rounded-[12px] transition-all"
              style={role === r.key
                ? { background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', color: r.accent }
                : { color: '#a3a3a3' }
              }
            >
              <span className="text-[20px] leading-none">{r.emoji}</span>
              <span className="text-[11px] font-semibold">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 폼 영역 */}
      <div className="flex-1 px-6 flex flex-col">
        {/* 역할 안내 */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[12px] mb-6 border"
          style={{ background: cfg.badgeBg, borderColor: cfg.badgeBorder }}
        >
          <span className="text-lg">{cfg.emoji}</span>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: cfg.accent }}>
              {cfg.label} 로그인
            </p>
            <p className="text-[11px] text-[#3c4a42] mt-0.5">
              {role === 'customer' && '상점에서 상품을 주문하고 배송 현황을 확인하세요'}
              {role === 'owner' && '주문을 승인하고 가게를 관리하세요'}
              {role === 'driver' && '배달 목록을 확인하고 배송을 완료하세요'}
              {role === 'admin' && '시스템 전체를 관리하세요'}
            </p>
          </div>
        </div>

        {/* 닉네임 */}
        <div className="mb-4">
          <label className="block text-[11px] text-[#3c4a42] tracking-[0.6px] uppercase mb-2.5 font-medium">
            카카오 닉네임
          </label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="닉네임을 입력하세요"
            autoFocus
            className="w-full h-[56px] bg-[#f2f4f6] rounded-[12px] px-5 text-[16px] text-[#1a1c1c] placeholder-[#94a3b8] outline-none transition-all"
            style={{ boxShadow: '0 0 0 1px rgba(187,202,191,0.3)' }}
            onFocus={e => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.boxShadow = `0 0 0 2px ${cfg.accent}40`
            }}
            onBlur={e => {
              e.currentTarget.style.background = '#f2f4f6'
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(187,202,191,0.3)'
            }}
          />
        </div>

        {/* 비밀번호 */}
        <div className="mb-4">
          <label className="block text-[11px] text-[#3c4a42] tracking-[0.6px] uppercase mb-2.5 font-medium">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호를 입력하세요"
            className="w-full h-[56px] bg-[#f2f4f6] rounded-[12px] px-5 text-[16px] text-[#1a1c1c] placeholder-[#94a3b8] outline-none transition-all"
            style={{ boxShadow: '0 0 0 1px rgba(187,202,191,0.3)' }}
            onFocus={e => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.boxShadow = `0 0 0 2px ${cfg.accent}40`
            }}
            onBlur={e => {
              e.currentTarget.style.background = '#f2f4f6'
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(187,202,191,0.3)'
            }}
          />
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-[12px] px-4 py-3 mb-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-[56px] text-white text-[17px] font-semibold rounded-[12px] transition-opacity disabled:opacity-60 mb-4"
          style={{
            background: cfg.accent,
            boxShadow: `0 8px 20px -4px ${cfg.accent}40`,
          }}
        >
          {loading ? '로그인 중...' : `${cfg.emoji} ${cfg.label} 로그인`}
        </button>

        {/* 회원가입 (고객만) */}
        {role === 'customer' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#f0f0f0]" />
              <span className="text-[12px] text-[#a3a3a3]">또는</span>
              <div className="flex-1 h-px bg-[#f0f0f0]" />
            </div>
            <Link
              href="/register?role=customer"
              className="w-full h-[52px] flex items-center justify-center text-[15px] font-medium rounded-[12px] border border-[#e8e8e8] text-[#3c4a42]"
            >
              회원가입
            </Link>
          </>
        )}
      </div>

      {/* 푸터 */}
      <div className="px-6 py-8 text-center">
        <p className="text-[10px] text-[#94a3b8] tracking-[-0.5px]">
          © 2024 COSAMART CORP. ALL RIGHTS RESERVED.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
