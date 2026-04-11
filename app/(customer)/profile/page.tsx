'use client'
import { useState, useEffect } from 'react'
import { getLocalStorage, setLocalStorage } from '@/lib/utils'

export default function CustomerProfilePage() {
  const [nickname, setNickname] = useState('')
  const [deviceUuid, setDeviceUuid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNickname(getLocalStorage('cosmart_nickname') ?? '')
    setDeviceUuid(getLocalStorage('cosmart_device_uuid') ?? '')
  }, [])

  async function handleSave() {
    if (!nickname.trim()) return
    setSaving(true)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, device_uuid: deviceUuid, role: 'customer' }),
    })
    const json = await res.json()
    if (json.data) {
      setLocalStorage('cosmart_nickname', json.data.nickname)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('cosmart_nickname')
    localStorage.removeItem('cosmart_device_uuid')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 flex items-center px-5 h-[56px] border-b border-[#eee]"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
      >
        <h1 className="text-[18px] font-bold text-[#1a1c1c]">프로필</h1>
      </header>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-[8px] p-5 shadow-sm">
          {/* 아바타 + 이름 */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-[28px]"
              style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
            >
              👤
            </div>
            <div>
              <p className="text-[17px] font-bold text-[#1a1c1c]">{nickname || '—'}</p>
              <p className="text-[12px] text-[#3c4a42] mt-0.5">코사마트 회원</p>
            </div>
          </div>

          {/* 닉네임 입력 */}
          <label className="block text-[12px] text-[#3c4a42] font-medium mb-1.5">닉네임 (카카오 이름)</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="홍길동"
            className="w-full border border-[#e2e8f0] rounded-[12px] px-4 py-3 text-[14px] text-[#1a1c1c] placeholder-[#94a3b8] outline-none focus:border-[#10b981] transition-colors"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 w-full py-3 rounded-[12px] text-[14px] font-semibold text-white transition-opacity"
            style={{ background: '#10b981', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '저장 중...' : saved ? '✅ 저장 완료!' : '닉네임 저장'}
          </button>
        </div>

        {/* 기기 정보 */}
        <div className="bg-white rounded-[8px] p-5 shadow-sm">
          <p className="text-[13px] font-bold text-[#1a1c1c] mb-3">기기 정보</p>
          <div className="border-b border-[#eee] pb-3 mb-3">
            <p className="text-[11px] text-[#3c4a42] mb-1">기기 UUID</p>
            <p className="text-[12px] text-[#1a1c1c] font-mono truncate">{deviceUuid || '—'}</p>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            이 기기 고유 ID로 주문이 관리됩니다. 기기를 변경하면 주문 내역이 연결되지 않습니다.
          </p>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-[8px] p-5 shadow-sm">
          <p className="text-[13px] font-bold text-[#1a1c1c] mb-3">앱 정보</p>
          {[
            { label: '서비스명', value: '평창동 코사마트 상점가' },
            { label: '버전', value: 'v1.0.0' },
            { label: '운영', value: '평창동 코사마트' },
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

        {/* 스태프 로그인 */}
        <div className="bg-white rounded-[8px] p-4">
          <p className="text-[11px] text-[#a3a3a3] mb-3 font-medium">스태프 전용</p>
          <div className="flex gap-2">
            {[
              { label: '👔 사장님', role: 'owner' },
              { label: '🏍️ 기사님', role: 'driver' },
              { label: '🛡️ 관리자', role: 'admin' },
            ].map(({ label, role }) => (
              <a
                key={role}
                href={`/login?role=${role}`}
                className="flex-1 py-2 text-center text-[12px] text-[#3c4a42] rounded-[8px] border border-[#e8e8e8] hover:border-[#10b981] hover:text-[#10b981] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
