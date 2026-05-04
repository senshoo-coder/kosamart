// 비밀번호는 ASCII printable 문자(0x21-0x7E)만 허용
// → 영문 대소문자, 숫자, 특수기호 OK
// → 한글, 공백, 기타 유니코드 차단

const ASCII_PASSWORD_REGEX = /^[\x21-\x7E]+$/

/**
 * 입력값에서 허용되지 않는 문자(한글·공백·유니코드 등)를 제거합니다.
 * onChange 핸들러에서 사용해 사용자가 한글 입력 시 자동으로 필터링됩니다.
 */
export function filterPasswordInput(value: string): string {
  return value.replace(/[^\x21-\x7E]/g, '')
}

/**
 * 서버 사이드 최종 검증용. 영문·숫자·특수기호만 포함하면 true.
 */
export function isValidPasswordFormat(value: string): boolean {
  if (!value) return false
  return ASCII_PASSWORD_REGEX.test(value)
}

/** 비밀번호 입력 안내 문구 (UI 표시용) */
export const PASSWORD_HELPER_TEXT = '영문·숫자·특수기호만 사용 가능 (한글 입력 불가)'
