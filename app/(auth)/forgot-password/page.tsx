'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [nickname, setNickname] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), contact: contact.trim(), note: note.trim() }),
      })
      const json = await res.json()
      if (json.data?.ok) {
        setDone(true)
      } else {
        setError(json.error || '요청 처리에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요')
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
            닉네임으로 비밀번호 재설정을 요청합니다.<br />
            관리자가 확인 후 안내해 드려요.
          </p>
        </div>

        {done ? (
          <div className="space-y-5">
            <div className="bg-[#d1fae5] border border-[#10b981]/30 rounded-lg p-4">
              <p className="text-[#065f46] text-sm font-semibold mb-1">✅ 요청이 접수되었습니다</p>
              <p className="text-[#065f46] text-xs">
                관리자가 본인 확인 후 비밀번호를 재설정해 드립니다.<br />
                보통 영업일 기준 1일 이내 회신됩니다.
              </p>
            </div>
            <Link href="/login" className="block w-full py-3 text-center bg-[#006c49] text-white rounded-lg font-semibold hover:bg-[#005239] transition-colors">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">
                닉네임 <span className="text-[#dc2626]">*</span>
              </label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="가입 시 사용한 닉네임"
                autoFocus
                className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">
                연락처 (선택)
              </label>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="010-XXXX-XXXX 또는 카톡 ID"
                className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors"
              />
              <p className="text-[11px] text-[#6c7a71] mt-1">관리자가 답변 보낼 수단</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">
                추가 메모 (선택)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="가게명·역할 등 본인 확인에 도움될 정보"
                rows={3}
                className="w-full px-4 py-3 bg-[#f7f9fb] rounded-lg outline-none text-[#191c1e] placeholder-[#6c7a71] border border-[#e5e7eb] focus:border-[#006c49] transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="bg-[#ffdad6] rounded-lg px-4 py-3 text-[#93000a] text-sm font-medium">
                {error}
              </div>
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
      </div>
    </main>
  )
}
