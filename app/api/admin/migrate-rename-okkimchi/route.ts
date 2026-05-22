import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

// 일회성: stores-config.json 의 가게명 + orders.store_name 에서 "옥김치" → "옥식당" 치환.
// 가게 ID(okkimchi-*)와 사장님 닉네임은 그대로 둠. 가게명 노출 텍스트만 변경.

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const FILE_URL = `${SUPA_URL}/storage/v1/object/authenticated/config/stores-config.json`
const UPLOAD_URL = `${SUPA_URL}/storage/v1/object/config/stores-config.json`

const FROM = '옥김치'
const TO = '옥식당'

export async function POST() {
  const cookieStore = await cookies()
  if (cookieStore.get('cosmart_role')?.value !== 'admin') {
    return NextResponse.json({ error: '관리자 전용' }, { status: 403 })
  }

  const changes: { where: string; from: string; to: string }[] = []

  // 1) stores-config.json 읽고 custom + overrides 의 name 치환
  let config: any = { overrides: {}, custom: [], deleted: [] }
  try {
    const res = await fetch(FILE_URL, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (res.ok) config = await res.json()
  } catch {}

  if (Array.isArray(config.custom)) {
    for (const s of config.custom) {
      if (typeof s.name === 'string' && s.name.includes(FROM)) {
        const newName = s.name.split(FROM).join(TO)
        changes.push({ where: `custom[id=${s.id}].name`, from: s.name, to: newName })
        s.name = newName
      }
    }
  }
  if (config.overrides && typeof config.overrides === 'object') {
    for (const [storeId, ov] of Object.entries<any>(config.overrides)) {
      if (ov && typeof ov.name === 'string' && ov.name.includes(FROM)) {
        const newName = ov.name.split(FROM).join(TO)
        changes.push({ where: `overrides[${storeId}].name`, from: ov.name, to: newName })
        ov.name = newName
      }
    }
  }

  // stores-config.json 업로드 (변경 있을 때만)
  if (changes.length > 0) {
    await fetch(UPLOAD_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SUPA_KEY}`,
        apikey: SUPA_KEY,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: JSON.stringify(config),
    })
  }

  // 2) orders.store_name 의 denormalized 값 일괄 치환
  let orderUpdatedCount = 0
  try {
    const supabase = await createAdminClient()
    const { data: matching } = await supabase
      .from('orders')
      .select('id, store_name')
      .ilike('store_name', `%${FROM}%`)
    if (matching && matching.length > 0) {
      for (const o of matching) {
        const newName = (o.store_name || '').split(FROM).join(TO)
        if (newName !== o.store_name) {
          const { error } = await supabase
            .from('orders')
            .update({ store_name: newName })
            .eq('id', o.id)
          if (!error) orderUpdatedCount++
        }
      }
    }
  } catch (e) {
    // DB 업데이트 실패해도 config 변경은 유지
  }

  return NextResponse.json({
    data: {
      stores_config_changed: changes.length,
      changes,
      orders_renamed: orderUpdatedCount,
    },
    error: null,
  })
}
