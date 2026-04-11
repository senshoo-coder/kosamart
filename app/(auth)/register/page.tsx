'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateDeviceUUID, getLocalStorage, setLocalStorage } from '@/lib/utils'
import Link from 'next/link'

const ROLES = [
  { value: 'customer', label: '고객',     icon: '🛍️', desc: '공구 주문 및 배달 서비스 이용' },
  { value: 'owner',    label: '마트 관리자', icon: '👔', desc: '주문 관리 및 배달 운영 (관리자 승인 필요)' },
  { value: 'driver',   label: '배달기사',  icon: '🏍️', desc: '배달 업무 수행 (관리자 승인 필요)' },
]

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const defaultRole = params.get('role') || 'customer'

  const [role, setRole] = useState(defaultRole)
  const [nickname, setNickname] = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function handleRegister() {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다'); return }

    setLoading(true); setError('')

    try {
      const device_uuid = getLocalStorage('cosmart_device_uuid') || generateDeviceUUID()
      setLocalStorage('cosmart_device_uuid', device_uuid)

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), password, role, phone: phone.trim() || undefined, device_uuid }),
      })
      const data = await res.json()

      if (!res.ok) { setError(data.error || '회원가입 실패'); setLoading(false); return }

      if (data.data?.pending) {
        setSuccess('회원가입 신청이 완료되었습니다!\n관리자 승인 후 로그인 가능합니다.')
        return
      }

      // 고객 — 즉시 로그인 상태
      if (data.data) {
        setLocalStorage('cosmart_nickname', nickname.trim())
        setLocalStorage('cosmart_device_uuid', device_uuid)
        setLocalStorage('cosmart_user', JSON.stringify(data.data))
      }
      router.push('/shop')
    } catch {
      setError('서버 오류가 발생했습니다')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center card-3d rounded-2xl p-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-lg font-700 text-white mb-2">신청 완료</h2>
          <p className="text-sm text-slate-400 whitespace-pre-line mb-6">{success}</p>
          <Link href="/login" className="block">
            <Button className="w-full">로그인 페이지로</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl text-3xl mb-4 card-3d">📝</div>
          <h1 className="text-xl font-800 text-white">회원가입</h1>
          <p className="text-slate-400 text-sm mt-1">코사마트 상점가</p>
        </div>

        <div className="card-3d rounded-2xl p-6 space-y-5">
          {/* 역할 선택 */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-600">역할 선택</p>
            <div className="space-y-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    role === r.value
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/5 glass hover:border-white/10'
                  }`}
                >
                  <span className="text-xl">{r.icon}</span>
                  <div>
                    <p className="text-sm font-600 text-white">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                  {role === r.value && <span className="ml-auto text-emerald-400 text-sm">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 입력 필드 */}
          <Input
            label="닉네임"
            placeholder="사용할 닉네임 (로그인 ID)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
          <Input
            label="전화번호 (선택)"
            placeholder="010-0000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="6자 이상"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button className="w-full py-3.5 text-base" onClick={handleRegister} loading={loading}>
            {role === 'customer' ? '가입하고 쇼핑하기 🛒' : '가입 신청하기'}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <span className="text-xs text-slate-500">이미 계정이 있으신가요? </span>
          <Link href={`/login?role=${role}`} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            로그인
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </main>
    }>
      <RegisterForm />
    </Suspense>
  )
}
