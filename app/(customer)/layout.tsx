import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MarketCartProvider } from '@/lib/cart/MarketCartContext'

const NAV_ITEMS = [
  { href: '/market',  icon: 'home',        label: '홈' },
  { href: '/shop',    icon: 'diversity_3',  label: '공구' },
  { href: '/orders',  icon: 'local_mall',  label: '주문' },
  { href: '/profile', icon: 'person',      label: '프로필' },
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
