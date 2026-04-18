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
    <div className="min-h-[100dvh]" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <MarketCartProvider>
        {children}
        <footer className="px-5 py-4 text-center border-t border-[#f0f0f0] mt-4">
          <p className="text-[11px] text-[#c0c0c0]">
            코사마트 상점가 &nbsp;·&nbsp;{' '}
            <a href="/market/privacy" className="underline hover:text-[#10b981] transition-colors">
              개인정보처리방침
            </a>
          </p>
        </footer>
      </MarketCartProvider>
      <MobileBottomNav items={NAV_ITEMS} />
    </div>
  )
}
