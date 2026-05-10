'use client'
import { useState } from 'react'
import Link from 'next/link'
import { filterPasswordInput, PASSWORD_HELPER_TEXT } from '@/lib/utils/password'

type Mode = 'self' | 'admin'

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>('self')

  // 자가 재설정 (B방식)
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // 관리자 요청 (대체)
  const [adminContact, setAdminContact] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'self' | 'admin' | null>(null)
  const [error, setError] = useState('')

  async function handleSelfReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nickname.trim()) return setError('닉네임을 입력해주세요')
    if (!phone.trim()) return setError('가입 시 등록한 전화번호를 입력해주세요')
    if (newPw.length < 6) return setError('새 비밀번호는 6자 이상이어야 합니다')
    if (newPw !== confirmPw) return setError('비밀번호 확인이 일치하지 않습니다')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), phone: phone.trim(), new_password: newPw }),
      })
      const json = await res.json()
      if (json.data?.ok) {
        setDone('self')
      } else {
        setError(json.error || '비밀번호 변경에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    }
    setLoading(false)
  }

  async function handleAdminRequest(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nickname.trim()) return setError('닉네임을 입력해주세요')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), contact: adminContact.trim(), note: adminNote.trim() }),
      })
      const json = await res.json()
      if (json.data?.ok) {
        setDone('admin')
      } else {
        setError(json.error || '요청 처리에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-[#191c1e]">비밀번호 찾기</h1>
          <p className="text-sm text-[#6c7a71] mt-2">
            가입 시 등록한 전화번호로 직접 변경하거나,<br />
            관리자에게 요청할 수 있어요.
          </p>
        </div>

        {done === 'self' ? (
          <div className="space-y-5">
            <div className="bg-[#d1fae5] border border-[#10b981]/30 rounded-lg p-4">
              <p className="text-[#065f46] text-sm font-semibold mb-1">✅ 비밀번호가 변경되었습니다</p>
              <p className="text-[#065f46] text-xs">새 비밀번호로 로그인해 주세요.</p>
            </div>
            <Link href="/login" className="block w-full py-3 text-center bg-[#006c49] text-white rounded-lg font-semibold hover:bg-[#005239] transition-colors">
              로그인하기
            </Link>
          </div>
        ) : done === 'admin' ? (
          <div className="space-y-5">
            <div className="bg-[#d1fae5] border border-[#10b981]/30 rounded-lg p-4">
              <p className="text-[#065f46] text-sm font-semibold mb-1">✅ 요청이 접수되었습니다</p>
              <p className="text-[#065f46] text-xs">관리자가 본인 확인 후 회신해 드립니다 (영업일 기준 1일 이내).</p>
            </div>
            <Link href="/login" className="block w-full py-3 text-center bg-[#006c49] text-white rounded-lg font-semibold hover:bg-[#005239] transition-colors">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            {/* 모드 탭 */}
            <div className="grid grid-cols-2 gap-1 bg-[#f1f3f5] rounded-lg p-1 mb-5">
              <button
                onClick={() => { setMode('self'); setError('') }}
                className={`py-2.5 rounded-md text-sm font-semibold transition-all ${mode === 'self' ? 'bg-white text-[#006c49] shadow-sm' : 'text-[#6c7a71]'}`}
              >
                전화로 직접 변경
              </button>
              <button
                onClick={() => { setMode('admin'); setError('') }}
                className={`py-2.5 rounded-md text-sm font-semibold transition-all ${mode === 'admin' ? 'bg-white text-[#006c49] shadow-sm' : 'text-[#6c7a71]'}`}
              >
                관리자에 요청
              </button>
            </div>

            {mode === 'self' ? (
              <form onSubmit={handleSelfReset} className="space-y-4">
                <div className="bg-[#eff6ff] border border-[#3b82f6]/30 rounded-lg px-4 py-3 text-[12.5px] leading-relaxed text-[#1e40af]">
                  <p className="font-bold mb-1">💡 빠른 방법</p>
                  <p>가입 시 등록한 닉네임과 전화번호가 일치하면 즉시 새 비밀번호로 변경됩니다. 전화번호 미등록 사용자는 우측 탭(관리자에 요청)을 이용해 주세요.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">닉네임 <span className="text-[#dc2626]">*</span></label>
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="가입 시 사용한 닉네임"
                    autoFocus
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">전화번호 <span className="text-[#dc2626]">*</span></label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    inputMode="tel"
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
                  />
                  <p className="text-[11px] text-[#6c7a71] mt-1">하이픈(-) 있어도 없어도 OK</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">새 비밀번호 <span className="text-[#dc2626]">*</span></label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(filterPasswordInput(e.target.value))}
                    placeholder="6자 이상"
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
                  />
                  <p className="text-[11px] text-[#6c7a71] mt-1">{PASSWORD_HELPER_TEXT}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">새 비밀번호 확인 <span className="text-[#dc2626]">*</span></label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(filterPasswordInput(e.target.value))}
                    placeholder="다시 입력"
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-[#ffdad6] rounded-lg px-4 py-3 text-[#93000a] text-sm font-medium">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#006c49] text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#005239] transition-colors"
                >
                  {loading ? '변경 중...' : '새 비밀번호로 변경'}
                </button>

                <Link href="/login" className="block text-center text-sm text-[#006c49] hover:underline">
                  ← 로그인 화면으로
                </Link>
              </form>
            ) : (
              <form onSubmit={handleAdminRequest} className="space-y-4">
                <div className="bg-[#fff8e1] border border-[#fbbf24]/30 rounded-lg px-4 py-3 text-[12.5px] leading-relaxed text-[#7c4a03]">
                  <p className="font-bold mb-1">💡 안내</p>
                  <p>전화번호 미등록·변경된 경우 이 경로로 요청하세요. 관리자가 본인 확인 후 직접 회신해 드립니다.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">닉네임 <span className="text-[#dc2626]">*</span></label>
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="가입 시 사용한 닉네임"
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">연락처 (선택)</label>
                  <input
                    value={adminContact}
                    onChange={e => setAdminContact(e.target.value)}
                    placeholder="010-XXXX-XXXX 또는 카톡 ID"
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
                  />
                  <p className="text-[11px] text-[#6c7a71] mt-1">관리자가 답변 보낼 수단</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">추가 메모 (선택)</label>
                  <textarea
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder="가게명·역할 등 본인 확인에 도움될 정보"
                    rows={3}
                    className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-[#ffdad6] rounded-lg px-4 py-3 text-[#93000a] text-sm font-medium">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || !nickname.trim()}
                  className="w-full py-3 bg-[#006c49] text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#005239] transition-colors"
                >
                  {loading ? '요청 중...' : '재설정 요청하기'}
                </button>

                <Link href="/login" className="block text-center text-sm text-[#006c49] hover:underline">
                  ← 로그인 화면으로
                </Link>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  )
}
