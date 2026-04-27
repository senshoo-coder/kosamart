'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateDeviceUUID, getLocalStorage, setLocalStorage } from '@/lib/utils'
import Link from 'next/link'

const ROLES = [
  { key: 'customer', label: '고객',   icon: 'person',          accent: '#006c49', container: '#10b981', bg: '#d1fae5' },
  { key: 'owner',    label: '사장님', icon: 'storefront',       accent: '#0058be', container: '#2170e4', bg: '#dbeafe' },
  { key: 'driver',   label: '기사님', icon: 'directions_bike',  accent: '#855300', container: '#e29100', bg: '#fef3c7' },
  { key: 'admin',    label: '관리자', icon: 'shield',           accent: '#8B5CF6', container: '#C4B5FD', bg: '#ede9fe' },
]

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const initialRole = params.get('role') || 'customer'
  const redirect = params.get('redirect') || ''

  const [role, setRole] = useState(initialRole)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cfg = ROLES.find(r => r.key === role) ?? ROLES[0]

  useEffect(() => {
    const saved = getLocalStorage('cosmart_nickname')
    if (saved) setNickname(saved)
  }, [])

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
          expected_role: role,
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
    <main className="min-h-screen bg-[#f7f9fb] lg:grid lg:grid-cols-2">

      {/* 좌측: 브랜드 패널 (데스크탑) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#f2f4f6] relative overflow-hidden">
        <div className="z-10">
          <span className="text-2xl font-extrabold text-[#006c49] tracking-tight" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            평창동 상점가
          </span>
          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-[#191c1e]" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            모두를 위한<br/>
            <span style={{color: cfg.accent}}>커머스 플랫폼</span>의<br/>
            새로운 기준
          </h1>
          <p className="mt-6 text-[#3c4a42] text-lg leading-relaxed max-w-sm">
            고객부터 관리자까지, 각 역할에 최적화된 비즈니스 환경을 경험하세요.
          </p>
        </div>

        {/* 역할 아이콘 그리드 */}
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full" style={{background: `${cfg.accent}08`, filter: 'blur(80px)'}} />
        <div className="z-10 flex items-center gap-4">
          <div className="flex -space-x-3">
            {ROLES.map(r => (
              <div key={r.key} className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white" style={{background: r.bg}}>
                <span className="material-symbols-outlined text-[16px]" style={{color: r.accent, fontVariationSettings: "'FILL' 1"}}>{r.icon}</span>
              </div>
            ))}
          </div>
          <span className="text-sm font-medium text-[#3c4a42]">4가지 역할로 함께합니다</span>
        </div>
      </div>

      {/* 우측: 로그인 폼 */}
      <div className="flex flex-col justify-center min-h-screen lg:min-h-0 p-8 lg:p-16 bg-white lg:rounded-none" style={{boxShadow: 'none'}}>

        {/* 모바일 로고 */}
        <div className="lg:hidden mb-8">
          <span className="text-2xl font-extrabold text-[#006c49] tracking-tight" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            평창동 상점가
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#191c1e]" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>반갑습니다!</h2>
          <p className="mt-2 text-[#3c4a42]">이용하시려는 계정의 역할을 선택해주세요.</p>
        </div>

        {/* 역할 탭 */}
        <div className="flex p-1 bg-[#f2f4f6] rounded-lg mb-8">
          {ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => handleRoleChange(r.key)}
              className="flex-1 py-3 px-2 rounded-lg text-sm transition-all duration-200"
              style={role === r.key
                ? { background: '#fff', color: r.accent, fontWeight: 600, boxShadow: '0 1px 4px rgba(25,28,30,0.08)' }
                : { color: '#6c7a71', fontWeight: 500 }
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 역할 안내 */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-6" style={{background: cfg.bg}}>
          <span className="material-symbols-outlined text-[20px]" style={{color: cfg.accent, fontVariationSettings: "'FILL' 1"}}>{cfg.icon}</span>
          <div>
            <p className="text-[13px] font-semibold" style={{color: cfg.accent}}>{cfg.label} 로그인</p>
            <p className="text-[11px] text-[#3c4a42] mt-0.5">
              {role === 'customer' && '상점에서 상품을 주문하고 배송 현황을 확인하세요'}
              {role === 'owner' && '주문을 승인하고 가게를 관리하세요'}
              {role === 'driver' && '배달 목록을 확인하고 배송을 완료하세요'}
              {role === 'admin' && '시스템 전체를 관리하세요'}
            </p>
          </div>
        </div>

        {/* 닉네임 입력 */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">닉네임</label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7a71] group-focus-within:text-[#006c49] transition-colors text-[20px]">person</span>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="닉네임을 입력하세요"
              autoFocus
              className="w-full pl-12 pr-4 py-4 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] transition-all"
              style={{boxShadow: 'inset 0 0 0 1px rgba(187,202,191,0.2)'}}
              onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${cfg.accent}` }}
              onBlur={e => { e.currentTarget.style.background = '#f7f9fb'; e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(187,202,191,0.2)' }}
            />
          </div>
        </div>

        {/* 비밀번호 입력 */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">비밀번호</label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7a71] group-focus-within:text-[#006c49] transition-colors text-[20px]">lock</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호를 입력하세요"
              className="w-full pl-12 pr-12 py-4 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] transition-all"
              style={{boxShadow: 'inset 0 0 0 1px rgba(187,202,191,0.2)'}}
              onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${cfg.accent}` }}
              onBlur={e => { e.currentTarget.style.background = '#f7f9fb'; e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(187,202,191,0.2)' }}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7a71] hover:text-[#191c1e]">
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-[#ffdad6] rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#93000a]">error</span>
            <p className="text-[#93000a] text-sm font-medium">{error}</p>
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 text-white text-[16px] font-bold rounded-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: cfg.accent, boxShadow: `0 8px 20px -4px ${cfg.accent}30` }}
        >
          {loading ? (
            <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 로그인 중...</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>{cfg.icon}</span>{cfg.label} 로그인<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
          )}
        </button>

        {/* 비밀번호 찾기 */}
        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-xs text-[#6c7a71] hover:text-[#006c49] hover:underline">
            비밀번호를 잊으셨나요?
          </Link>
          <p className="text-[10px] text-[#9aa1a6] mt-1">
            닉네임은 비밀번호 재설정의 유일한 단서입니다 — 안전하게 보관해 주세요
          </p>
        </div>

        {/* 회원가입 */}
        {role === 'customer' && (
          <p className="mt-8 text-center text-sm text-[#3c4a42]">
            아직 계정이 없으신가요?{' '}
            <Link href="/register?role=customer" className="font-bold text-[#006c49] hover:underline underline-offset-4">
              회원가입
            </Link>
          </p>
        )}
        {role === 'owner' && (
          <p className="mt-8 text-center text-sm text-[#3c4a42]">
            입점 신청하시겠어요?{' '}
            <Link href="/register?role=owner" className="font-bold hover:underline underline-offset-4" style={{ color: cfg.accent }}>
              사장님 가입 신청
            </Link>
          </p>
        )}
        {role === 'driver' && (
          <p className="mt-8 text-center text-sm text-[#3c4a42]">
            배달기사로 합류하시겠어요?{' '}
            <Link href="/register?role=driver" className="font-bold hover:underline underline-offset-4" style={{ color: cfg.accent }}>
              기사 가입 신청
            </Link>
          </p>
        )}

        <p className="mt-8 text-center text-[10px] text-[#6c7a71]">
          © 2024 평창동 상점가. ALL RIGHTS RESERVED.
        </p>
      </div>

      {/* 배경 장식 */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-[0.03]">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full" style={{background: cfg.accent, filter: 'blur(120px)'}} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#0058be]" style={{filter: 'blur(120px)'}} />
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#006c49]/30 border-t-[#006c49] rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
