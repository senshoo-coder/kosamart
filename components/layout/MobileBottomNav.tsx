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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#f5f5f5]"
      style={{ boxShadow: '0px -4px 12px 0px rgba(0,0,0,0.04)' }}
    >
      <div className="flex h-[64px]">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[20px] leading-none">{item.icon}</span>
              <span
                className="text-[11px]"
                style={{
                  color: active ? '#10b981' : '#a3a3a3',
                  fontWeight: active ? '600' : '400',
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
