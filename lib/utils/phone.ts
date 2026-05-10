// 전화번호 정규화·포맷·검증
// 저장: 숫자만 ("01012345678")
// 표시: "010-1234-5678"
// 비교: 항상 normalizePhone()을 거친 값끼리

/** 모든 비숫자 제거. +82로 시작하면 0으로 치환. */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return ''
  let digits = String(input).replace(/[^\d]/g, '')
  // +82 10... 형태를 010... 으로
  if (digits.startsWith('82') && digits.length >= 11) {
    digits = '0' + digits.slice(2)
  }
  return digits
}

/** 한국 휴대폰 번호 형식 검증 (010 시작 11자리). */
export function isValidPhone(normalized: string): boolean {
  return /^01[0-9]\d{7,8}$/.test(normalized)
}

/** 저장된 정규화 번호를 화면 표시용 "010-1234-5678" 포맷으로. */
export function formatPhone(stored: string | null | undefined): string {
  const n = normalizePhone(stored)
  if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`
  return n
}
