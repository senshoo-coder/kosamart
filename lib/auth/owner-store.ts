import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

const DEMO_OWNER_STORES: Record<string, string> = {
  'demo-owner-001': 'central-super',
  'demo-owner-002': 'banchan',
  'demo-owner-003': 'butcher',
  'demo-owner-004': 'bonjuk',
  'demo-owner-005': 'chicken',
  'demo-owner-006': 'bakery',
}

export async function getOwnerStoreId(): Promise<string | null> {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  const userId = cookieStore.get('cosmart_user_id')?.value
  if (role !== 'owner' || !userId) return null
  if (DEMO_OWNER_STORES[userId]) return DEMO_OWNER_STORES[userId]
  try {
    const supabase = await createAdminClient()
    const { data } = await supabase.from('users').select('store_id').eq('id', userId).single()
    return data?.store_id ?? null
  } catch { return null }
}
