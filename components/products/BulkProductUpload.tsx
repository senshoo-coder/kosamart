'use client'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

interface ParsedRow {
  rowNum: number
  name: string
  price: number | null
  unit: string
  subcategory: string
  description: string
  emoji: string
  original_price: number | null
  is_popular: boolean
  ok: boolean
  reason?: string
}

interface BulkResult {
  added_count: number
  skipped_count: number
  error_count: number
  added: string[]
  skipped: { name: string; reason: string }[]
  errors: { row: number; name: string; reason: string }[]
  final_product_count: number
}

const HEADER_MAP: Record<string, keyof Omit<ParsedRow, 'rowNum' | 'ok' | 'reason'>> = {
  '상품명': 'name',
  '가격': 'price',
  '단위': 'unit',
  '카테고리': 'subcategory',
  '설명': 'description',
  '이모지': 'emoji',
  '정가': 'original_price',
  '인기상품': 'is_popular',
}

function validateRow(row: any, rowNum: number): ParsedRow {
  const name = String(row['상품명'] ?? '').trim()
  const priceRaw = row['가격']
  const price = typeof priceRaw === 'number' ? priceRaw : Number(String(priceRaw ?? '').replace(/[^\d.-]/g, ''))
  const originalPriceRaw = row['정가']
  const originalPriceNum = originalPriceRaw === '' || originalPriceRaw == null
    ? null
    : (typeof originalPriceRaw === 'number' ? originalPriceRaw : Number(String(originalPriceRaw).replace(/[^\d.-]/g, '')))

  const popularRaw = String(row['인기상품'] ?? '').trim().toUpperCase()
  const isPopular = popularRaw === 'Y' || popularRaw === 'YES' || popularRaw === 'TRUE' || popularRaw === '1'

  const result: ParsedRow = {
    rowNum,
    name,
    price: Number.isFinite(price) ? price : null,
    unit: String(row['단위'] ?? '').trim() || '개',
    subcategory: String(row['카테고리'] ?? '').trim(),
    description: String(row['설명'] ?? '').trim(),
    emoji: String(row['이모지'] ?? '').trim() || '📦',
    original_price: originalPriceNum != null && Number.isFinite(originalPriceNum) ? originalPriceNum : null,
    is_popular: isPopular,
    ok: true,
  }

  if (!name) { result.ok = false; result.reason = '상품명 누락'; return result }
  if (name.length > 100) { result.ok = false; result.reason = '상품명 100자 초과'; return result }
  if (result.price == null || result.price < 0) { result.ok = false; result.reason = '가격이 잘못됨'; return result }
  if (originalPriceRaw !== '' && originalPriceRaw != null && (originalPriceNum == null || !Number.isFinite(originalPriceNum) || originalPriceNum < 0)) {
    result.ok = false; result.reason = '정가가 잘못됨'; return result
  }
  return result
}

export default function BulkProductUpload({
  storeId,
  accentColor,
  onSuccess,
}: {
  storeId: string
  accentColor: string
  onSuccess?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setRows([])
    setFileName('')
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function close() {
    setOpen(false)
    setTimeout(reset, 200)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheetName = wb.SheetNames.find(n => n !== '작성 안내') || wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (json.length === 0) {
        setError('파일에 데이터가 없습니다.')
        return
      }
      // 헤더 검증
      const headers = Object.keys(json[0])
      if (!headers.includes('상품명') || !headers.includes('가격')) {
        setError('상품명/가격 컬럼이 보이지 않습니다. 템플릿을 다운로드해서 사용해주세요.')
        return
      }
      const parsed = json.map((row, i) => validateRow(row, i + 2))
      setRows(parsed)
      if (parsed.length > 500) {
        setError('한 번에 최대 500개까지만 등록할 수 있습니다. 행을 줄여주세요.')
      }
    } catch (err: any) {
      setError(`파일을 읽지 못했습니다: ${err?.message || ''}`)
    }
  }

  async function handleSubmit() {
    if (submitting) return
    const valid = rows.filter(r => r.ok)
    if (valid.length === 0) {
      setError('등록 가능한 행이 없습니다.')
      return
    }
    if (rows.length > 500) {
      setError('한 번에 최대 500개까지만 등록할 수 있습니다.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/store/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          products: valid.map(r => ({
            name: r.name,
            price: r.price,
            unit: r.unit,
            subcategory: r.subcategory || null,
            description: r.description,
            emoji: r.emoji,
            original_price: r.original_price,
            is_popular: r.is_popular,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || '업로드 실패')
      } else {
        setResult(json.data as BulkResult)
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      setError(`업로드 중 오류: ${err?.message || ''}`)
    }
    setSubmitting(false)
  }

  const okCount = rows.filter(r => r.ok).length
  const errCount = rows.length - okCount

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold border"
        style={{ borderColor: accentColor, color: accentColor, background: '#fff' }}
        title="엑셀로 여러 상품 한 번에 등록"
      >
        📥 엑셀 일괄 등록
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" onClick={close}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[16px] bg-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-[#f0f0f0] flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#1a1c1c]">엑셀 일괄 상품 등록</h3>
              <button onClick={close} className="text-[#a3a3a3] text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {!result && (
                <>
                  {/* 안내 */}
                  <div className="rounded-[8px] bg-[#f9fafb] p-3 text-[12px] text-[#3c4a42] leading-relaxed">
                    <p className="font-semibold text-[#1a1c1c] mb-1">사용 방법</p>
                    <p>1. 아래 <b>템플릿 다운로드</b> 버튼으로 엑셀 파일을 받으세요.</p>
                    <p>2. 두 번째 행부터 상품을 입력하세요. (헤더는 그대로 두세요)</p>
                    <p>3. 저장한 파일을 업로드 → 미리보기 확인 → 등록 버튼.</p>
                    <p className="mt-1 text-[#b91c1c]">※ 같은 이름의 기존 상품은 자동으로 건너뜁니다 (안전).</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/api/store/products/template"
                      className="flex-1 min-w-[140px] text-center px-3 py-2.5 rounded-[8px] text-[13px] font-semibold border border-[#e0e0e0] text-[#3c4a42] bg-white hover:bg-[#f5f5f5]"
                    >
                      📄 템플릿 다운로드
                    </a>
                    <label
                      className="flex-1 min-w-[140px] text-center px-3 py-2.5 rounded-[8px] text-[13px] font-semibold text-white cursor-pointer"
                      style={{ background: accentColor }}
                    >
                      📂 파일 선택
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFile}
                      />
                    </label>
                  </div>

                  {fileName && (
                    <div className="text-[12px] text-[#3c4a42]">
                      선택된 파일: <span className="font-semibold">{fileName}</span>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-[8px] bg-[#fef2f2] border border-[#fecaca] p-3 text-[13px] text-[#b91c1c]">
                      {error}
                    </div>
                  )}

                  {rows.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 text-[12px]">
                        <span className="px-2.5 py-1 rounded-full bg-[#d1fae5] text-[#065f46] font-semibold">
                          ✓ {okCount}개 등록 가능
                        </span>
                        {errCount > 0 && (
                          <span className="px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#b91c1c] font-semibold">
                            ✗ {errCount}개 오류
                          </span>
                        )}
                        <span className="text-[#a3a3a3]">총 {rows.length}행</span>
                      </div>

                      <div className="rounded-[8px] border border-[#e0e0e0] overflow-hidden">
                        <div className="max-h-[280px] overflow-y-auto">
                          <table className="w-full text-[12px]">
                            <thead className="bg-[#f9fafb] sticky top-0">
                              <tr className="text-left text-[#a3a3a3]">
                                <th className="px-2 py-2 w-10">행</th>
                                <th className="px-2 py-2 w-8"></th>
                                <th className="px-2 py-2">상품명</th>
                                <th className="px-2 py-2 w-20 text-right">가격</th>
                                <th className="px-2 py-2 w-20">카테고리</th>
                                <th className="px-2 py-2">메모</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(r => (
                                <tr key={r.rowNum} className={`border-t border-[#f0f0f0] ${r.ok ? '' : 'bg-[#fef2f2]'}`}>
                                  <td className="px-2 py-1.5 text-[#a3a3a3]">{r.rowNum}</td>
                                  <td className="px-2 py-1.5">{r.ok ? '✅' : '❌'}</td>
                                  <td className="px-2 py-1.5 text-[#1a1c1c]">
                                    <span className="mr-1">{r.emoji}</span>
                                    {r.name || <span className="text-[#a3a3a3]">(빈 값)</span>}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-[#1a1c1c]">
                                    {r.price != null ? `${r.price.toLocaleString()}원` : '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-[#3c4a42]">{r.subcategory || '-'}</td>
                                  <td className="px-2 py-1.5 text-[#b91c1c]">{r.reason || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={submitting || okCount === 0 || rows.length > 500}
                        className="w-full py-3 rounded-[8px] text-[14px] font-bold text-white disabled:opacity-50"
                        style={{ background: accentColor }}
                      >
                        {submitting ? '등록 중...' : `${okCount}개 상품 등록하기`}
                      </button>
                    </>
                  )}
                </>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="rounded-[8px] bg-[#d1fae5] border border-[#86efac] p-4 text-center">
                    <p className="text-[18px] font-bold text-[#065f46]">
                      ✅ {result.added_count}개 상품이 등록되었습니다
                    </p>
                    <p className="text-[12px] text-[#065f46] mt-1">
                      현재 가게 총 상품 수: {result.final_product_count}개
                    </p>
                  </div>

                  {result.skipped_count > 0 && (
                    <div className="rounded-[8px] bg-[#fffbeb] border border-[#fde68a] p-3">
                      <p className="text-[13px] font-semibold text-[#92400e] mb-1">
                        ⏭ {result.skipped_count}개 건너뜀 (이미 존재 또는 중복)
                      </p>
                      <ul className="text-[12px] text-[#78350f] space-y-0.5 max-h-[120px] overflow-y-auto">
                        {result.skipped.map((s, i) => (
                          <li key={i}>• {s.name} — {s.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.error_count > 0 && (
                    <div className="rounded-[8px] bg-[#fef2f2] border border-[#fecaca] p-3">
                      <p className="text-[13px] font-semibold text-[#b91c1c] mb-1">
                        ❌ {result.error_count}개 오류
                      </p>
                      <ul className="text-[12px] text-[#7f1d1d] space-y-0.5 max-h-[120px] overflow-y-auto">
                        {result.errors.map((e, i) => (
                          <li key={i}>• {e.row}행 ({e.name}): {e.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={close}
                    className="w-full py-3 rounded-[8px] text-[14px] font-bold text-white"
                    style={{ background: accentColor }}
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
