import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

const NAV = [
  { href: '/driver/deliveries', icon: 'local_shipping', label: '배달' },
  { href: '/driver/history',    icon: 'history',        label: '내역' },
  { href: '/driver/profile',    icon: 'person',         label: '프로필' },
]

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-[64px]">
      {children}
      <MobileBottomNav items={NAV} />
    </div>
  )
}
