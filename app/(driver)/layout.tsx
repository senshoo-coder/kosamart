import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

const NAV = [
  { href: '/driver/deliveries', icon: 'local_shipping', label: 'Deliver' },
  { href: '/driver/history',    icon: 'history',        label: 'History' },
  { href: '/driver/profile',    icon: 'person',         label: 'Me' },
]

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-[64px]">
      {children}
      <MobileBottomNav items={NAV} />
    </div>
  )
}
