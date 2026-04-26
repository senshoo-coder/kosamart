'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConceptLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/concept-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.ok) {
        // 인증 성공 → 컨셉 페이퍼로 이동
        window.location.href = '/concept'
      } else {
        setError(json.error || '비밀번호가 올바르지 않습니다')
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해 주세요')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 50%, #52b788 100%)',
      padding: 20,
      fontFamily: '-apple-system, "Segoe UI", "Malgun Gothic", sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 36,
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1c1c', marginBottom: 4 }}>
            코사마트 컨셉 페이퍼
          </h1>
          <p style={{ fontSize: 13, color: '#666' }}>
            열람 권한이 필요한 문서입니다
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3c4a42', marginBottom: 6 }}>
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 10,
              outline: 'none',
              marginBottom: 12,
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#2d6a4f'}
            onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
          />

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 14,
              fontWeight: 700,
              color: 'white',
              background: loading || !password ? '#9ca3af' : '#2d6a4f',
              border: 'none',
              borderRadius: 10,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '확인 중…' : '열람하기'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 18 }}>
          비밀번호를 잊으셨다면 발행자에게 문의해 주세요
        </p>
      </div>
    </div>
  )
}
