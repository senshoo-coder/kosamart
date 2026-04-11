'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { STORES } from '@/lib/market-data'

const STORES_LIST = STORES.map(s => ({ id: s.id, name: s.name, emoji: s.emoji }))

const TOP_NAV = [
  { href: '/admin/dashboard', icon: 'dashboard',      label: '대시보드' },
  { href: '/admin/users',     icon: 'group',           label: '가입자 관리' },
]

const BOTTOM_NAV = [
  { href: '/admin/drivers',   icon: 'directions_bike', label: '배달기사' },
  { href: '/admin/delivery',  icon: 'local_shipping',  label: '배달 관리' },
  { href: '/admin/products',  icon: 'sell',            label: '공구 상품' },
  { href: '/admin/analytics', icon: 'bar_chart',       label: '전체 분석' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const isStoreManagePath = pathname.startsWith('/admin/stores')
  const isOrdersPath = pathname.startsWith('/admin/orders') || pathname.includes('/orders')

  const [storesOpen, setStoresOpen] = useState(isStoreManagePath)
  const [ordersOpen, setOrdersOpen] = useState(isOrdersPath)

  // 경로 변경 시 해당 섹션 자동 열기
  useEffect(() => {
    if (isStoreManagePath) setStoresOpen(true)
    if (isOrdersPath) setOrdersOpen(true)
  }, [pathname, isStoreManagePath, isOrdersPath])

  function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
    const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href + '/') && !pathname.includes('/manage') && !pathname.includes('/orders'))
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-[13px]',
          active
            ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
            : 'text-[#3c4a42] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
        )}
      >
        <span className="material-symbols-outlined text-[18px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
        <span>{label}</span>
        {active && <span className="ml-auto w-1.5 h-1.5 bg-[#8B5CF6] rounded-full" />}
      </Link>
    )
  }

  return (
    <aside className="w-60 min-h-screen flex-shrink-0 flex flex-col py-6 px-3 bg-white border-r border-[#eceef0] overflow-y-auto" style={{ boxShadow: '4px 0 24px rgba(25,28,30,0.03)' }}>
      {/* 로고 */}
      <div className="flex items-center gap-3 px-3 mb-8 flex-shrink-0">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#C4B5FD]">
          <span className="material-symbols-outlined text-[18px] text-[#8B5CF6]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        </div>
        <div>
          <p className="font-bold text-[#191c1e] text-sm leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>평창동 상점가</p>
          <p className="text-[11px] text-[#8B5CF6] font-semibold">관리자 모드</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {/* 상단 메뉴 */}
        {TOP_NAV.map(item => <NavLink key={item.href} {...item} />)}

        {/* ── 상점가 가게 (expandable) ── */}
        <div className="mt-1">
          <button
            onClick={() => setStoresOpen(v => !v)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-[13px]',
              isStoreManagePath
                ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                : 'text-[#3c4a42] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
            )}
          >
            <span className="material-symbols-outlined text-[18px]" style={isStoreManagePath ? { fontVariationSettings: "'FILL' 1" } : {}}>storefront</span>
            <span className="flex-1 text-left">상점가 가게</span>
            <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: storesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              expand_more
            </span>
          </button>

          {storesOpen && (
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l-2 border-[#ede9fe] pl-3">
              {/* 전체 보기 */}
              <Link
                href="/admin/stores"
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] transition-colors',
                  pathname === '/admin/stores'
                    ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                    : 'text-[#6c7a71] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
                )}
              >
                <span className="material-symbols-outlined text-[14px]">list</span>
                전체 목록
              </Link>
              {/* 가게별 관리 */}
              {STORES_LIST.map(store => {
                const active = pathname === `/admin/stores/${store.id}/manage` || pathname.startsWith(`/admin/stores/${store.id}/manage`)
                return (
                  <Link
                    key={store.id}
                    href={`/admin/stores/${store.id}/manage`}
                    className={cn(
                      'flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] transition-colors',
                      active
                        ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                        : 'text-[#6c7a71] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
                    )}
                  >
                    <span className="text-sm leading-none">{store.emoji}</span>
                    <span className="truncate">{store.name}</span>
                    {active && <span className="ml-auto w-1 h-1 bg-[#8B5CF6] rounded-full flex-shrink-0" />}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* 배달기사 */}
        <NavLink href="/admin/drivers" icon="directions_bike" label="배달기사" />

        {/* ── 주문 현황 (expandable) ── */}
        <div className="mt-1">
          <button
            onClick={() => setOrdersOpen(v => !v)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-[13px]',
              (pathname === '/admin/orders' || pathname.includes('/orders'))
                ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                : 'text-[#3c4a42] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
            )}
          >
            <span className="material-symbols-outlined text-[18px]" style={(pathname === '/admin/orders' || pathname.includes('/orders')) ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
            <span className="flex-1 text-left">주문 현황</span>
            <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: ordersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              expand_more
            </span>
          </button>

          {ordersOpen && (
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l-2 border-[#ede9fe] pl-3">
              {/* 전체 주문 */}
              <Link
                href="/admin/orders"
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] transition-colors',
                  pathname === '/admin/orders'
                    ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                    : 'text-[#6c7a71] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
                )}
              >
                <span className="material-symbols-outlined text-[14px]">list</span>
                전체 주문
              </Link>
              {/* 가게별 주문 */}
              {STORES_LIST.map(store => {
                const active = pathname === `/admin/stores/${store.id}/orders` || pathname.startsWith(`/admin/stores/${store.id}/orders`)
                return (
                  <Link
                    key={store.id}
                    href={`/admin/stores/${store.id}/orders`}
                    className={cn(
                      'flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] transition-colors',
                      active
                        ? 'bg-[#ede9fe] text-[#8B5CF6] font-semibold'
                        : 'text-[#6c7a71] hover:bg-[#f2f4f6] hover:text-[#191c1e]'
                    )}
                  >
                    <span className="text-sm leading-none">{store.emoji}</span>
                    <span className="truncate">{store.name}</span>
                    {active && <span className="ml-auto w-1 h-1 bg-[#8B5CF6] rounded-full flex-shrink-0" />}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 메뉴 */}
        {BOTTOM_NAV.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      <div className="px-3 text-[11px] text-[#6c7a71] mt-4 font-medium flex-shrink-0">평창동 상점가</div>
    </aside>
  )
}
