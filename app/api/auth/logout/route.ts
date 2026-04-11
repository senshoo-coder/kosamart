import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('cosmart_user_id')
  cookieStore.delete('cosmart_role')
  return NextResponse.json({ ok: true })
}
