import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 금액 포맷 (₩12,500)
export function formatPrice(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`
}

// 날짜 포맷 (2026.03.22)
export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy.MM.dd', { locale: ko })
}

// 날짜+시간 (2026.03.22 09:15)
export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy.MM.dd HH:mm', { locale: ko })
}

// 상대 시간 (3분 전)
export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko })
}

// 주문번호 생성 (GB260322-001)
export function generateOrderNumber(): string {
  const now = new Date()
  const datePart = format(now, 'yyMMdd')
  const rand = Math.floor(Math.random() * 900) + 100
  return `GB${datePart}-${rand}`
}

// 기기 UUID 생성
export function generateDeviceUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// localStorage 안전 접근
export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

export function setLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

// 마감 시간까지 남은 시간 (D-1, 2시간 30분 등)
export function getDeadlineText(deadline: string): string {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()

  if (diff < 0) return '마감됨'
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}분 후 마감`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}시간 후 마감`
  }
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  return `D-${days}`
}

// 색상 스타일 반환
export function getStatusStyle(color: string): { bg: string; text: string; border: string } {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    gray:   { bg: 'bg-[#f1f5f9]',  text: 'text-[#475569]', border: 'border-[#e2e8f0]' },
    blue:   { bg: 'bg-[#dbeafe]',  text: 'text-[#1d4ed8]', border: 'border-[#bfdbfe]' },
    green:  { bg: 'bg-[#d1fae5]',  text: 'text-[#065f46]', border: 'border-[#a7f3d0]' },
    yellow: { bg: 'bg-[#fef3c7]',  text: 'text-[#b45309]', border: 'border-[#fde68a]' },
    red:    { bg: 'bg-[#fee2e2]',  text: 'text-[#b91c1c]', border: 'border-[#fecaca]' },
    orange: { bg: 'bg-[#ffedd5]',  text: 'text-[#c2410c]', border: 'border-[#fed7aa]' },
    purple: { bg: 'bg-[#ede9fe]',  text: 'text-[#6d28d9]', border: 'border-[#ddd6fe]' },
  }
  return styles[color] ?? styles.gray
}
