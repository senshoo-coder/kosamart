import { NextRequest } from 'next/server'
import { MANUAL_ADMIN_HTML } from '@/lib/content/manual-admin'

export async function GET(req: NextRequest) {
  const role = req.cookies.get('cosmart_role')?.value
  if (role !== 'admin') {
    // 관리자가 아니면 로그인 페이지로 (관리자 탭 + 로그인 후 복귀)
    return new Response(null, {
      status: 307,
      headers: { Location: '/login?role=admin&redirect=/manual-admin' },
    })
  }
  return new Response(MANUAL_ADMIN_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
