import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MarketCartProvider } from '@/lib/cart/MarketCartContext'

const NAV_ITEMS = [
  { href: '/market',  icon: '🏪', label: '상점가' },
  { href: '/shop',    icon: '🛒', label: '공동구매' },
  { href: '/orders',  icon: '📋', label: '주문내역' },
  { href: '/profile', icon: '👤', label: '프로필' },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-[64px]">
      <MarketCartProvider>
        {children}
      </MarketCartProvider>
      <MobileBottomNav items={NAV_ITEMS} />
    </div>
  )
}
