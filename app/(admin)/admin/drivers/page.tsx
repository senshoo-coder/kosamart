'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface Driver {
  id: string
  nickname: string
  status: string
  phone: string | null
  created_at: string
  // 배달 통계
  total_deliveries?: number
  active_deliveries?: number
  completed_deliveries?: number
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46', label: '활성' },
  pending:   { bg: '#fef3c7', text: '#b45309', label: '승인대기' },
  suspended: { bg: '#fee2e2', text: '#b91c1c', label: '정지' },
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deliveryStats, setDeliveryStats] = useState<Record<string, { total: number; active: number; completed: number }>>({})

  // 새 배달맨 추가 모달
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nickname: '', password: '', phone: '' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const loadDrivers = useCallback(async () => {
    setLoading(true)
    try {
      const params = tab !== 'all' ? `?role=driver&status=${tab}` : '?role=driver'
      const res = await fetch(`/api/admin/users${params}`)
      const json = await res.json()
      setDrivers(json.data ?? [])

      // 배달 통계 로드
      const statsRes = await fetch('/api/admin/driver-stats')
      const statsJson = await statsRes.json()
      if (statsJson.data) {
        setDeliveryStats(statsJson.data)
      }
    } catch {}
    setLoading(false)
  }, [tab])

  useEffect(() => { loadDrivers() }, [loadDrivers])

  async function handleAction(driverId: string, action: 'approve' | 'suspend' | 'activate') {
    setActionLoading(driverId)
    try {
      const actionMap: Record<string, string> = { activate: 'approve' }
      await fetch(`/api/admin/users/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionMap[action] || action }),
      })
      loadDrivers()
    } catch {}
    setActionLoading(null)
  }

  async function handleCreate() {
    if (!form.nickname.trim() || !form.password) {
      setCreateError('닉네임과 비밀번호를 입력해주세요')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'driver' }),
      })
      const json = await res.json()
      if (json.error) {
        setCreateError(json.error)
      } else {
        setShowCreate(false)
        setForm({ nickname: '', password: '', phone: '' })
        loadDrivers()
      }
    } catch {
      setCreateError('등록 실패')
    }
    setCreateLoading(false)
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return '오늘'
    if (days < 30) return `${days}일 전`
    return `${Math.floor(days / 30)}개월 전`
  }

  const activeCount = drivers.filter(d => d.status === 'active').length
  const pendingCount = drivers.filter(d => d.status === 'pending').length

  return (
    <div className="p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">배달맨 관리</h1>
          <p className="text-[12px] text-[#a3a3a3] mt-0.5">
            활성 {activeCount}명{pendingCount > 0 ? ` · 승인대기 ${pendingCount}명` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDrivers} className="h-[36px] px-4 rounded-[10px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8]">
            새로고침
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="h-[36px] px-4 rounded-[10px] bg-[#6d28d9] text-white text-[12px] font-semibold"
          >
            + 배달맨 추가
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">전체 배달맨</p>
          <p className="text-[20px] font-bold text-[#1a1c1c]">{drivers.length}명</p>
        </div>
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">활성</p>
          <p className="text-[20px] font-bold text-[#065f46]">{activeCount}명</p>
        </div>
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">오늘 배달</p>
          <p className="text-[20px] font-bold text-[#6d28d9]">
            {Object.values(deliveryStats).reduce((sum, s) => sum + s.active, 0)}건
          </p>
        </div>
        <div className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-[11px] text-[#a3a3a3] mb-1">총 완료</p>
          <p className="text-[20px] font-bold text-[#10b981]">
            {Object.values(deliveryStats).reduce((sum, s) => sum + s.completed, 0)}건
          </p>
        </div>
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: '전체' },
          { key: 'active' as const, label: '활성' },
          { key: 'pending' as const, label: '승인대기' },
          { key: 'suspended' as const, label: '정지' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors"
            style={tab === t.key
              ? { background: '#6d28d9', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 배달맨 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#6d28d9]/30 border-t-[#6d28d9] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 데스크탑 */}
          <div className="bg-white rounded-[8px] overflow-hidden hidden md:block" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f5f5f5]">
                  {['배달맨', '연락처', '상태', '진행중 배달', '완료 배달', '가입일', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#a3a3a3] text-[13px]">배달맨가 없습니다</td></tr>
                ) : drivers.map(driver => {
                  const stats = deliveryStats[driver.id] || { total: 0, active: 0, completed: 0 }
                  const st = STATUS_STYLE[driver.status] || STATUS_STYLE.active
                  return (
                    <tr key={driver.id} className="border-b border-[#f9f9f9] hover:bg-[#f9f9f9]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#ede9fe] flex items-center justify-center text-sm">🚴</div>
                          <p className="text-[13px] font-semibold text-[#1a1c1c]">{driver.nickname}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{driver.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: st.bg, color: st.text }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold text-[#6d28d9]">{stats.active}건</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-[#10b981]">{stats.completed}건</td>
                      <td className="px-4 py-3 text-[11px] text-[#a3a3a3]">{timeAgo(driver.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {driver.status === 'pending' && (
                            <Button size="sm" onClick={() => handleAction(driver.id, 'approve')} loading={actionLoading === driver.id}>
                              승인
                            </Button>
                          )}
                          {driver.status === 'active' && (
                            <Button size="sm" variant="danger" onClick={() => handleAction(driver.id, 'suspend')} loading={actionLoading === driver.id}>
                              정지
                            </Button>
                          )}
                          {driver.status === 'suspended' && (
                            <Button size="sm" onClick={() => handleAction(driver.id, 'activate')} loading={actionLoading === driver.id}>
                              활성화
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 */}
          <div className="md:hidden space-y-3">
            {drivers.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="text-4xl">🚴</span>
                <p className="text-[14px] font-semibold text-[#1a1c1c]">배달맨가 없습니다</p>
              </div>
            ) : drivers.map(driver => {
              const stats = deliveryStats[driver.id] || { total: 0, active: 0, completed: 0 }
              const st = STATUS_STYLE[driver.status] || STATUS_STYLE.active
              return (
                <div key={driver.id} className="bg-white rounded-[8px] p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#ede9fe] flex items-center justify-center text-lg">🚴</div>
                      <div>
                        <p className="text-[14px] font-bold text-[#1a1c1c]">{driver.nickname}</p>
                        <p className="text-[11px] text-[#a3a3a3]">{driver.phone || '연락처 없음'} · {timeAgo(driver.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: st.bg, color: st.text }}>
                      {st.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#f9f9f9] rounded-[6px] p-2 text-center">
                      <p className="text-[10px] text-[#a3a3a3]">전체</p>
                      <p className="text-[14px] font-bold text-[#1a1c1c]">{stats.total}</p>
                    </div>
                    <div className="bg-[#f9f9f9] rounded-[6px] p-2 text-center">
                      <p className="text-[10px] text-[#a3a3a3]">진행중</p>
                      <p className="text-[14px] font-bold text-[#6d28d9]">{stats.active}</p>
                    </div>
                    <div className="bg-[#f9f9f9] rounded-[6px] p-2 text-center">
                      <p className="text-[10px] text-[#a3a3a3]">완료</p>
                      <p className="text-[14px] font-bold text-[#10b981]">{stats.completed}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {driver.status === 'pending' && (
                      <Button className="flex-1" size="sm" onClick={() => handleAction(driver.id, 'approve')} loading={actionLoading === driver.id}>
                        승인
                      </Button>
                    )}
                    {driver.status === 'active' && (
                      <Button className="flex-1" size="sm" variant="danger" onClick={() => handleAction(driver.id, 'suspend')} loading={actionLoading === driver.id}>
                        정지
                      </Button>
                    )}
                    {driver.status === 'suspended' && (
                      <Button className="flex-1" size="sm" onClick={() => handleAction(driver.id, 'activate')} loading={actionLoading === driver.id}>
                        활성화
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 배달맨 추가 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-[16px] p-6 mx-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[#1a1c1c] mb-4">배달맨 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1 block">닉네임 *</label>
                <input
                  value={form.nickname}
                  onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:border-[#6d28d9]"
                  placeholder="배달맨 닉네임"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1 block">비밀번호 *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:border-[#6d28d9]"
                  placeholder="6자리 이상"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#a3a3a3] mb-1 block">연락처</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:border-[#6d28d9]"
                  placeholder="010-1234-5678"
                />
              </div>
              {createError && <p className="text-[12px] text-[#b91c1c]">{createError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-[8px] text-[13px] font-semibold border border-[#e0e0e0] text-[#3c4a42]">
                취소
              </button>
              <Button className="flex-1" onClick={handleCreate} loading={createLoading}>
                추가
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
