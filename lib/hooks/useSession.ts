'use client'
import { useState, useEffect } from 'react'
import { getLocalStorage } from '@/lib/utils'
import type { SessionUser } from '@/lib/types'

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getLocalStorage('cosmart_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem('cosmart_user')
    setUser(null)
  }

  return { user, loading, logout, setUser }
}
