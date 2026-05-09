'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalStorage } from '@/lib/utils'

interface Props {
  role: 'owner' | 'driver' | 'admin'
}

const ROLE_INFO: Record<string, { label: string; icon: string; bg: string; accent: string; redirectAfterLogout: string }> = {
  owner:  { label: '사장님',   icon: '👔', bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', accent: '#1d4ed8', redirectAfterLogout: '/login?role=owner' },
  driver: { label: '배달맨', icon: '🏍️', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', accent: '#b45309', redirectAfterLogout: '/login?role=driver' },
  admin:  { label: '관리자',   icon: '🛡️', bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', accent: '#6d28d9', redirectAfterLogout: '/login?role=admin' },
}

export function RoleProfile({ role }: Props) {
  const router = useRouter()
  const cfg = ROLE_INFO[role]
  const [nickname, setNickname] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setNickname(getLocalStorage('cosmart_nickname') ?? '')
    try {
      const raw = getLocalStorage('cosmart_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('cosmart_nickname')
    localStorage.removeItem('cosmart_user')
    window.location.href = cfg.redirectAfterLogout
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header
        className="sticky top-0 z-40 flex items-center px-5 h-[56px] border-b border-[#eee] md:hidden"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <h1 className="text-[18px] font-bold text-[#1a1c1c]">프로필</h1>
      </header>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-4 max-w-2xl mx-auto">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-[12px] p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-[28px]"
              style={{ background: cfg.bg }}
            >
              {cfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[18px] font-bold text-[#1a1c1c] truncate">{nickname || '—'}</p>
              <span
                className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.accent }}
              >
                {cfg.label} 계정
              </span>
            </div>
          </div>

          {/* 역할별 추가 정보 */}
          <div className="border-t border-[#f0f0f0] pt-3 space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-[#94a3b8]">계정 ID</span>
              <span className="text-[#1a1c1c] font-mono text-[11px] truncate ml-3 max-w-[55%]">{user?.id || '—'}</span>
            </div>
            {role === 'owner' && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#94a3b8]">담당 가게</span>
                <span className="text-[#1a1c1c] font-medium">{user?.store_id || '미배정'}</span>
              </div>
            )}
            <div className="flex justify-between text-[12px]">
              <span className="text-[#94a3b8]">역할</span>
              <span className="text-[#1a1c1c] font-medium">{cfg.label}</span>
            </div>
          </div>
        </div>

        {/* 빠른 액션 안내 */}
        <div className="bg-white rounded-[12px] p-5 shadow-sm">
          <p className="text-[13px] font-bold text-[#1a1c1c] mb-2">계정 관리</p>
          <p className="text-[12px] text-[#6c7a71] leading-relaxed">
            비밀번호 변경이나 계정 정보 수정이 필요하면 관리자에게 문의해 주세요.
            {role === 'owner' && ' 담당 가게가 잘못 배정된 경우에도 관리자에게 알려주세요.'}
          </p>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-[12px] p-5 shadow-sm">
          <p className="text-[13px] font-bold text-[#1a1c1c] mb-3">앱 정보</p>
          {[
            { label: '서비스명', value: '평창동 코사마트 상점가' },
            { label: '도메인',  value: '골목상점.kr' },
            { label: '버전',    value: 'v1.0.0' },
            { label: '운영',    value: '평창동 코사마트' },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              className="flex justify-between items-center py-2.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none' }}
            >
              <span className="text-[12px] text-[#3c4a42]">{label}</span>
              <span className="text-[12px] font-medium text-[#1a1c1c]">{value}</span>
            </div>
          ))}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-[12px] text-[14px] font-semibold text-[#ef4444] bg-white border border-[#fee2e2]"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
