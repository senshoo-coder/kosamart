'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/owner/dashboard', icon: '📊', label: '대시보드' },
  { href: '/owner/orders',    icon: '📋', label: '주문 관리' },
  { href: '/owner/store',     icon: '🏪', label: '내 가게' },
  { href: '/owner/analytics', icon: '📈', label: '매출 분석' },
]

export function OwnerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen flex-shrink-0 flex flex-col py-6 px-3 bg-white border-r border-[#eee]">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg bg-[#f0fdf4]">🛒</div>
        <div>
          <p className="font-bold text-[#1a1c1c] text-sm leading-tight">코사마트</p>
          <p className="text-[11px] text-[#10b981] font-medium">사장님 모드</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-150 text-[13px]',
                active
                  ? 'bg-[#f0fdf4] text-[#10b981] font-semibold'
                  : 'text-[#3c4a42] hover:bg-[#f9f9f9] hover:text-[#1a1c1c]'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 bg-[#10b981] rounded-full" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 text-[11px] text-[#a3a3a3] mt-4">평창동 코사마트</div>
    </aside>
  )
}
