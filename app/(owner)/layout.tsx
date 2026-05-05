'use client'
import { useRouter } from 'next/navigation'
import { OwnerSidebar } from '@/components/layout/OwnerSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

const MOBILE_NAV = [
  { href: '/owner/dashboard', icon: 'dashboard',   label: 'Dash' },
  { href: '/owner/orders',    icon: 'receipt_long', label: 'Orders' },
  { href: '/owner/store',     icon: 'storefront',   label: 'Store' },
  { href: '/owner/analytics', icon: 'bar_chart',    label: 'Stats' },
  { href: '/owner/profile',   icon: 'person',       label: 'Me' },
]

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('cosmart_nickname')
    localStorage.removeItem('cosmart_user')
    router.push('/login?role=owner')
  }

  return (
    <div className="min-h-screen flex bg-[#f9f9f9]">
      {/* 데스크탑 사이드바 */}
      <div className="hidden md:flex">
        <OwnerSidebar />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-screen">
        {/* 상단 바 */}
        <div
          className="h-[56px] flex items-center justify-between px-5 flex-shrink-0 border-b border-[#eee]"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
        >
          <span className="text-[15px] font-bold text-[#1a1c1c]">사장님 모드</span>
          <button
            onClick={handleLogout}
            className="h-[32px] px-3 rounded-[8px] bg-[#f2f4f6] text-[#3c4a42] text-[12px] font-medium hover:bg-[#e8e8e8] transition-colors"
          >
            로그아웃
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[64px] md:pb-0">
          {children}
        </div>
      </main>

      {/* 모바일 하단 탭 */}
      <div className="md:hidden">
        <MobileBottomNav items={MOBILE_NAV} />
      </div>
    </div>
  )
}
