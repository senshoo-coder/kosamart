'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  icon: string
  label: string
}

interface MobileBottomNavProps {
  items: NavItem[]
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md rounded-t-2xl"
      style={{ boxShadow: '0 -4px 20px rgba(25,28,30,0.05)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[64px]">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 duration-200"
            >
              <span
                className="material-symbols-outlined text-[22px] leading-none"
                style={{
                  color: active ? '#006c49' : '#6c7a71',
                  fontVariationSettings: active ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                }}
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{
                  color: active ? '#006c49' : '#6c7a71',
                  fontWeight: active ? '700' : '500',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
