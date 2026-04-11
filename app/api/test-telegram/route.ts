import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const debug = {
    has_bot_token: !!token,
    has_admin_chat_id: !!chatId,
    has_supabase_url: !!supabaseUrl,
    has_service_key: !!serviceKey,
    is_demo_mode: !supabaseUrl || !supabaseUrl.startsWith('https'),
  }

  if (!token || !chatId) {
    return NextResponse.json({ ok: false, debug, error: '환경변수 없음' })
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '[코사마트] 텔레그램 연동 테스트 성공!' }),
    })
    const data = await res.json()
    return NextResponse.json({ ok: res.ok, debug, telegram_response: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, debug, error: e.message })
  }
}
