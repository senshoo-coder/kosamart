'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/dashboard', icon: 'dashboard',      label: '대시보드' },
  { href: '/admin/users',     icon: 'group',           label: '가입자 관리' },
  { href: '/admin/stores',    icon: 'storefront',      label: '상점가 가게' },
  { href: '/admin/drivers',   icon: 'directions_bike', label: '배달기사' },
  { href: '/admin/orders',    icon: 'receipt_long',    label: '주문 현황' },
  { href: '/admin/delivery',  icon: 'local_shipping',  label: '배달 관리' },
  { href: '/admin/products',  icon: 'sell',            label: '공구 상품' },
  { href: '/admin/analytics', icon: 'bar_chart',       label: '전체 분석' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen flex-shrink-0 flex flex-col py-6 px-3 bg-[#ffffff] border-r border-[#eceef0]" style={{boxShadow: '4px 0 24px rgba(25,28,30,0.03)'}}>
      {/* 로고 */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#C4B5FD]">
          <span className="material-symbols-outlined text-[18px] text-[#8B5CF6]" style={{fontVariationSettings: "'FILL' 1"}}>shield</span>
        </div>
        <div>
          <p className="font-bold text-[#191c1e] text-sm leading-tight" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>평창동 상점가</p>
          <p className="text-[11px] text-[#8B5CF6] font-semibold">관리자 모드</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-[13px]',
                active
                  ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                  : 'text-[#3c4a42] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
              )}
            >
              <span className="material-symbols-outlined text-[18px]" style={active ? {fontVariationSettings: "'FILL' 1"} : {}}>{item.icon}</span>
              <span>{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 bg-[#8B5CF6] rounded-full" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 text-[11px] text-[#6c7a71] mt-4 font-medium">평창동 상점가</div>
    </aside>
  )
}
