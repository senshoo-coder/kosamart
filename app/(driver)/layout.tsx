import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

const NAV = [
  { href: '/driver/deliveries', icon: '📦', label: '배달 목록' },
  { href: '/driver/history',    icon: '✅', label: '완료 내역' },
]

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-[64px]">
      {children}
      <MobileBottomNav items={NAV} />
    </div>
  )
}
