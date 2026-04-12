'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { STORES } from '@/lib/market-data'

interface StoreOption { id: string; name: string; emoji: string }

interface UserRow {
  id: string
  nickname: string
  role: string
  status: string
  phone?: string
  store_id?: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = { customer: '고객', owner: '사장님', driver: '배달기사', admin: '최고관리자' }
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46' },
  pending:   { bg: '#fef3c7', text: '#b45309' },
  suspended: { bg: '#fee2e2', text: '#b91c1c' },
}
const STATUS_LABELS: Record<string, string> = { active: '활성', pending: '승인대기', suspended: '정지' }

const TABS = [
  { key: 'pending',   label: '승인 대기', icon: '⏳' },
  { key: 'active',    label: '활성',      icon: '✅' },
  { key: 'suspended', label: '정지',      icon: '🚫' },
  { key: 'all',       label: '전체',      icon: '👥' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nickname: '', password: '', phone: '', role: 'owner', store_id: '' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [storeModal, setStoreModal] = useState<UserRow | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>(STORES.map(s => ({ id: s.id, name: s.name, emoji: s.emoji })))
  const [assignLoading, setAssignLoading] = useState(false)
  const [editModal, setEditModal] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({ nickname: '', phone: '', role: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const params = tab !== 'all' ? `?status=${tab}` : ''
    const res = await fetch(`/api/admin/users${params}`)
    const json = await res.json()
    setUsers(json.data ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    fetch('/api/market/stores').then(r => r.json()).then(({ data }) => {
      if (Array.isArray(data)) setStoreOptions(data.map((s: any) => ({ id: s.id, name: s.name, emoji: s.emoji || '🏪' })))
    }).catch(() => {})
  }, [])

  async function handleEditSave() {
    if (!editModal) return
    setEditError('')
    if (!editForm.nickname.trim()) { setEditError('닉네임을 입력하세요'); return }
    setEditLoading(true)
    const res = await fetch(`/api/admin/users/${editModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_info', ...editForm }),
    })
    const json = await res.json()
    if (!res.ok) { setEditError(json.error || '수정 실패'); setEditLoading(false); return }
    setEditModal(null)
    await loadUsers()
    setEditLoading(false)
  }

  async function handleAssignStore() {
    if (!storeModal) return
    setAssignLoading(true)
    await fetch(`/api/admin/users/${storeModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign_store', store_id: selectedStoreId }),
    })
    setStoreModal(null)
    setSelectedStoreId('')
    await loadUsers()
    setAssignLoading(false)
  }

  async function doAction(userId: string, action: string) {
    setActionLoading(userId + action)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    await loadUsers()
    setActionLoading(null)
  }

  async function handleCreate() {
    setCreateError('')
    if (!form.nickname.trim() || !form.password) { setCreateError('닉네임과 비밀번호를 입력하세요'); return }
    if (form.role === 'owner' && !form.store_id) { setCreateError('사장님 계정은 담당 가게를 선택하세요'); return }
    setCreateLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        store_id: form.role === 'owner' ? form.store_id : undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setCreateError(json.error || '생성 실패'); setCreateLoading(false); return }
    setShowCreate(false)
    setForm({ nickname: '', password: '', phone: '', role: 'owner', store_id: '' })
    await loadUsers()
    setCreateLoading(false)
  }

  async function handleResetPassword() {
    if (!resetTarget || !newPassword || newPassword.length < 6) return
    setActionLoading(resetTarget.id + 'reset')
    const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password', password: newPassword }),
    })
    if (res.ok) { setResetTarget(null); setNewPassword('') }
    setActionLoading(null)
  }

  const pendingCount = users.filter(u => u.status === 'pending').length

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c]">유저 관리</h1>
          <p className="text-[12px] text-[#a3a3a3]">회원 승인 및 계정 관리</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-[40px] px-4 rounded-[12px] bg-[#6d28d9] text-white text-[13px] font-semibold"
        >
          + 계정 생성
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-colors"
            style={tab === t.key
              ? { background: '#6d28d9', color: '#fff' }
              : { background: '#e8e8e8', color: '#1a1c1c' }
            }
          >
            {t.icon} {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-[#b45309] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 유저 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#6d28d9]/30 border-t-[#6d28d9] rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-[8px] p-12 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-4xl mb-3">👥</p>
          <p className="text-[#a3a3a3] text-[13px]">해당 유저가 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-[8px] overflow-x-auto" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[#f5f5f5]">
                {['닉네임', '역할', '담당가게', '상태', '연락처', '가입일', '액션'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] text-[#a3a3a3] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9f9f9]">
              {users.map(user => {
                const ss = STATUS_STYLE[user.status] ?? { bg: '#f2f4f6', text: '#3c4a42' }
                const store = STORES.find(s => s.id === user.store_id)
                return (
                  <tr key={user.id} className="hover:bg-[#f9f9f9] transition-colors">
                    <td className="px-4 py-3 text-[13px] text-[#1a1c1c] font-semibold">{user.nickname}</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{ROLE_LABELS[user.role] ?? user.role}</td>
                    <td className="px-4 py-3 text-[12px] text-[#3c4a42]">{store?.name ?? (user.store_id || '—')}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: ss.bg, color: ss.text }}>
                        {STATUS_LABELS[user.status] ?? user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#a3a3a3]">{user.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#a3a3a3]">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.status === 'pending' && (
                          <>
                            <button onClick={() => doAction(user.id, 'approve')} disabled={!!actionLoading}
                              className="text-[11px] px-3 py-1.5 rounded-[8px] bg-[#d1fae5] text-[#065f46] font-medium disabled:opacity-50">
                              {actionLoading === user.id + 'approve' ? '…' : '승인'}
                            </button>
                            <button onClick={() => doAction(user.id, 'reject')} disabled={!!actionLoading}
                              className="text-[11px] px-3 py-1.5 rounded-[8px] bg-[#fee2e2] text-[#b91c1c] font-medium disabled:opacity-50">
                              {actionLoading === user.id + 'reject' ? '…' : '거절'}
                            </button>
                          </>
                        )}
                        {user.status === 'active' && user.role !== 'admin' && (
                          <button onClick={() => doAction(user.id, 'suspend')} disabled={!!actionLoading}
                            className="text-[11px] px-3 py-1.5 rounded-[8px] bg-[#fee2e2] text-[#b91c1c] font-medium disabled:opacity-50">
                            {actionLoading === user.id + 'suspend' ? '…' : '정지'}
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button onClick={() => doAction(user.id, 'approve')} disabled={!!actionLoading}
                            className="text-[11px] px-3 py-1.5 rounded-[8px] bg-[#d1fae5] text-[#065f46] font-medium disabled:opacity-50">
                            {actionLoading === user.id + 'approve' ? '…' : '활성화'}
                          </button>
                        )}
                        <button
                          onClick={() => { setEditModal(user); setEditForm({ nickname: user.nickname, phone: user.phone || '', role: user.role }); setEditError('') }}
                          className="text-[11px] px-3 py-1.5 rounded-[8px] bg-[#eff6ff] text-[#1d4ed8] font-medium border border-[#dbeafe]">
                          ✏️ 수정
                        </button>
                        {user.role === 'owner' && (
                          <button
                            onClick={() => { setStoreModal(user); setSelectedStoreId(user.store_id || '') }}
                            className="text-[11px] px-3 py-1.5 rounded-[8px] font-medium border"
                            style={{ background: user.store_id ? '#ede9fe' : '#fef3c7', color: user.store_id ? '#6d28d9' : '#b45309', borderColor: user.store_id ? '#ddd6fe' : '#fde68a' }}
                          >
                            {user.store_id ? '🏪 가게변경' : '⚠️ 가게미배정'}
                          </button>
                        )}
                        <button onClick={() => { setResetTarget(user); setNewPassword('') }}
                          className="text-[11px] px-3 py-1.5 rounded-[8px] bg-[#f2f4f6] text-[#3c4a42] font-medium border border-[#e8e8e8]">
                          PW초기화
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 계정 생성 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6 space-y-4">
            <h3 className="text-[16px] font-bold text-[#1a1c1c]">계정 직접 생성</h3>
            <Input label="닉네임" value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
            <Input label="비밀번호 (6자 이상)" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <Input label="전화번호 (선택)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <div>
              <p className="text-[11px] text-[#3c4a42] tracking-[0.5px] uppercase mb-2 font-medium">역할</p>
              <div className="flex gap-2">
                {(['owner', 'driver', 'customer', 'admin'] as const).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r, store_id: '' }))}
                    className="flex-1 py-2 rounded-[10px] text-[12px] font-medium transition-colors"
                    style={form.role === r
                      ? { background: '#6d28d9', color: '#fff' }
                      : { background: '#f2f4f6', color: '#1a1c1c' }
                    }>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            {form.role === 'owner' && (
              <div>
                <p className="text-[11px] text-[#3c4a42] tracking-[0.5px] uppercase mb-2 font-medium">담당 가게</p>
                <div className="grid grid-cols-2 gap-2">
                  {STORES.map(s => (
                    <button key={s.id} onClick={() => setForm(f => ({ ...f, store_id: s.id }))}
                      className="py-2 px-3 rounded-[10px] text-[12px] font-medium text-left transition-colors"
                      style={form.store_id === s.id
                        ? { background: '#10b981', color: '#fff' }
                        : { background: '#f2f4f6', color: '#1a1c1c' }
                      }>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {createError && <p className="text-[#b91c1c] text-[12px]">{createError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>취소</Button>
              <Button className="flex-1" onClick={handleCreate} loading={createLoading}>생성</Button>
            </div>
          </div>
        </div>
      )}

      {/* 유저 정보 수정 모달 */}
      {editModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6 space-y-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#1a1c1c]">유저 정보 수정</h3>
              <p className="text-[11px] text-[#a3a3a3] mt-0.5 font-mono">{editModal.id.slice(0, 8)}…</p>
            </div>
            <Input label="닉네임" value={editForm.nickname} onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))} />
            <Input label="전화번호 (선택)" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
            <div>
              <p className="text-[11px] text-[#3c4a42] tracking-[0.5px] uppercase mb-2 font-medium">역할</p>
              <div className="flex gap-2">
                {(['customer', 'owner', 'driver', 'admin'] as const).map(r => (
                  <button key={r} onClick={() => setEditForm(f => ({ ...f, role: r }))}
                    className="flex-1 py-2 rounded-[10px] text-[11px] font-medium transition-colors"
                    style={editForm.role === r
                      ? { background: '#6d28d9', color: '#fff' }
                      : { background: '#f2f4f6', color: '#1a1c1c' }
                    }>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            {editError && <p className="text-[#b91c1c] text-[12px]">{editError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditModal(null)}>취소</Button>
              <Button className="flex-1" loading={editLoading} onClick={handleEditSave}>저장</Button>
            </div>
          </div>
        </div>
      )}

      {/* 담당가게 설정 모달 */}
      {storeModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setStoreModal(null) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6 space-y-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#1a1c1c]">담당 가게 설정</h3>
              <p className="text-[12px] text-[#a3a3a3] mt-0.5">{storeModal.nickname} 사장님</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => setSelectedStoreId('')}
                className="py-2 px-3 rounded-[10px] text-[12px] font-medium text-left transition-colors col-span-2"
                style={selectedStoreId === '' ? { background: '#fee2e2', color: '#b91c1c' } : { background: '#f2f4f6', color: '#6b7280' }}
              >
                🚫 미배정
              </button>
              {storeOptions.map(s => (
                <button key={s.id} onClick={() => setSelectedStoreId(s.id)}
                  className="py-2 px-3 rounded-[10px] text-[12px] font-medium text-left transition-colors"
                  style={selectedStoreId === s.id
                    ? { background: '#6d28d9', color: '#fff' }
                    : { background: '#f2f4f6', color: '#1a1c1c' }
                  }>
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStoreModal(null)}>취소</Button>
              <Button className="flex-1" loading={assignLoading} onClick={handleAssignStore}>저장</Button>
            </div>
          </div>
        </div>
      )}

      {/* PW초기화 모달 */}
      {resetTarget && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setResetTarget(null) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6 space-y-4">
            <h3 className="text-[16px] font-bold text-[#1a1c1c]">비밀번호 초기화</h3>
            <p className="text-[13px] text-[#3c4a42]"><span className="font-semibold text-[#1a1c1c]">{resetTarget.nickname}</span> 계정</p>
            <Input label="새 비밀번호 (6자 이상)" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResetPassword()} />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setResetTarget(null)}>취소</Button>
              <Button className="flex-1" loading={actionLoading === resetTarget.id + 'reset'} onClick={handleResetPassword}>변경</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
