'use client'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

const MOBILE_NAV = [
  { href: '/admin/dashboard', icon: 'dashboard',       label: 'Dash' },
  { href: '/admin/stores',    icon: 'storefront',      label: 'Stores' },
  { href: '/admin/orders',    icon: 'receipt_long',    label: 'Orders' },
  { href: '/admin/drivers',   icon: 'directions_bike', label: 'Drivers' },
  { href: '/admin/profile',   icon: 'person',          label: 'Me' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('cosmart_nickname')
    localStorage.removeItem('cosmart_user')
    router.push('/login?role=admin')
  }

  return (
    <div className="min-h-screen flex bg-[#f9f9f9]">
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-h-screen">
        <div
          className="h-[56px] flex items-center justify-between px-5 flex-shrink-0 border-b border-[#eee]"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-[#1a1c1c]">관리자 모드</span>
            <span className="text-[11px] bg-[#ede9fe] text-[#6d28d9] px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="h-[32px] px-3 rounded-[8px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium border border-[#e8e8e8] hover:bg-[#e8e8e8]"
          >
            로그아웃
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[64px] md:pb-0">
          {children}
        </div>
      </main>

      <div className="md:hidden">
        <MobileBottomNav items={MOBILE_NAV} />
      </div>
    </div>
  )
}
