import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MarketCartProvider } from '@/lib/cart/MarketCartContext'

const NAV_ITEMS = [
  { href: '/market',  icon: 'home',        label: 'Home' },
  { href: '/shop',    icon: 'diversity_3',  label: 'Groups' },
  { href: '/orders',  icon: 'local_mall',  label: 'Orders' },
  { href: '/profile', icon: 'person',      label: 'Profile' },
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
