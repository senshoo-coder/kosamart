# 코사마트 사이트 리뷰 가이드

> **목적**: 다른 세션·다른 사람이 사이트 현재 상태를 확인하고 검토할 수 있도록 작성된 핸드오프 문서.
> **최종 업데이트**: 2026-05-31
> **운영 도메인**: https://골목상점.kr (Punycode: https://xn--bb0bw4xzve3ni.kr)

---

## 1. 서비스 개요

**코사마트 상점가** — 종로구 평창동 골목형 상점가 O2O 공동구매 플랫폼

- **사업 배경**: 종로구청 시범사업. 정부 판매 7% 할인 + 온누리상품권 사용 가능
- **운영 주체**: WH Partners (예정)
- **사용자 유형 4종**: 고객 / 사장님 / 배달맨 / 관리자
- **현재 입점 가게 9곳** (2026-05-31 기준):
  - 코사마트 평창점 (편의점·슈퍼)
  - 홈앤미트 (정육·축산)
  - 페리카나 (치킨·튀김)
  - 옥식당(반찬) (반찬·가정식)
  - 옥식당(도시락) (도시락·간편식)
  - 분식, 베이커리, 본죽, 프랭크버거 (입점예정 또는 운영중)
- **배달 협력**: 평창동 배달맨 (퀵택배, 02-395-4152)

---

## 2. 빠른 점검 URL

### 공개 페이지 (로그인 불필요)

| URL | 용도 |
|---|---|
| https://xn--bb0bw4xzve3ni.kr/ | 루트 (랜딩 → /login 자동 이동) |
| https://xn--bb0bw4xzve3ni.kr/login | 4역할 탭 로그인 |
| https://xn--bb0bw4xzve3ni.kr/forgot-password | 자가 비밀번호 재설정 |
| https://xn--bb0bw4xzve3ni.kr/register?role=customer | 고객 가입 |
| https://xn--bb0bw4xzve3ni.kr/manual.html | 공개 매뉴얼 (고객·사장님·배달맨) |
| https://xn--bb0bw4xzve3ni.kr/opengraph-image | 카톡/SNS 미리보기 카드 |
| https://xn--bb0bw4xzve3ni.kr/robots.txt | 크롤러 정책 |
| https://xn--bb0bw4xzve3ni.kr/sitemap.xml | 사이트맵 |

### 로그인 필요한 화면

각 역할 로그인 후 자동 진입:
- 고객 → `/market`
- 사장님 → `/owner/dashboard`
- 배달맨 → `/driver/deliveries`
- 관리자 → `/admin/dashboard`, `/manual-admin` (관리자 전용 매뉴얼)

### 헬스 체크 명령어 (한 번에 확인)

```bash
# 사이트 가용성
curl -s -o /dev/null -w "%{http_code}\n" https://xn--bb0bw4xzve3ni.kr/

# 보안 헤더 확인 (HSTS, X-Frame, CSP 등)
curl -sI https://xn--bb0bw4xzve3ni.kr/ | grep -iE "strict-transport|x-frame|x-content-type|referrer|permissions|content-security"

# 가게 목록 API
curl -s https://xn--bb0bw4xzve3ni.kr/api/market/stores | grep -oE '"name":"[^"]*"'

# OG 메타 (카톡 미리보기 텍스트)
curl -s https://xn--bb0bw4xzve3ni.kr/ | grep -oE '<title>[^<]*</title>|og:title[^>]*'
```

---

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16.2 (App Router, Turbopack) |
| 언어 | TypeScript, React 19 |
| 스타일 | Tailwind CSS 4 |
| DB | Supabase (Postgres + Storage + Edge) |
| 인증 | bcryptjs + httpOnly cookies |
| 알림 | Telegram Bot API (관리자·매장·배달팀방) |
| 호스팅 | Railway (main 푸시 시 자동 배포) |
| DNS | Cloudflare (무료) |
| 도메인 등록 | 후이즈 |

**저장소**: github.com/senshoo-coder/kosamart (main 브랜치)

---

## 4. 역할별 기능 체크리스트

### 고객 (Customer)
- [ ] 가입 (닉네임 + 비밀번호 6자 이상 + 전화번호 선택)
- [ ] 비밀번호 분실 → **닉네임+전화번호로 본인 직접 변경** (자가 재설정)
- [ ] 마켓 페이지: 8개 카테고리 칩(전체/슈퍼/정육/치킨/반찬/도시락/분식/베이커리), 가게 검색, 영업중·영업종료 상태 표시
- [ ] 가게 상세 → 상품 보기 → 장바구니 → 주문
- [ ] 주문 상태 추적 (입금대기 → 입금완료 → 배송준비 → 배달중 → 배달완료)
- [ ] 배달 실패 시 "배달 실패 (확인중)" 빨간 뱃지 노출 (재배달 안내)

### 사장님 (Owner)
- [ ] 가입 신청 → 관리자 승인 → 로그인 가능
- [ ] 대시보드: 오늘 신규 주문 / 입금 확인 대기 / **⚠ 배달실패 카운트** / 매출
- [ ] 주문 관리: pending→approved 흐름, 거절, 배달실패 시 🔄재배달/🛑종료
- [ ] 내 가게 관리: 영업정보, 상품 등록·수정·이미지·순서·품절
- [ ] **엑셀 일괄 상품 등록** (500개 한도, 미리보기 검증, 중복 자동 건너뜀)
- [ ] 상품 수정 모달에서 사진 바로 업로드
- [ ] 주문 상세에서 상태 변경 이력 (actor 역할 뱃지 표시)

### 배달맨 (Driver)
- [ ] 가입 신청 → 관리자 승인
- [ ] 수락 가능 / 내 배달 두 영역
- [ ] 픽업·배달 완료 처리 (메모·사진 첨부 가능)
- [ ] 이슈 보고 ⚠️ 버튼 → 4가지 사유 (수취인 부재/공동현관 비번 오류/주소 오류/기타). **기타 선택 시 세부 내용 필수**
- [ ] 재배달 받은 건에 **⚠이전 실패 사유**(분홍) + **📝사장님 메모**(청록) 노출
- [ ] 본인 배달건만 사진 업로드 가능 (driver_id 비교)

### 관리자 (Admin)
- [ ] 대시보드, 가게 관리, 사용자 관리, 주문 전체 조회, 배달 관리
- [ ] 신규 가입 승인 (사장님·배달맨)
- [ ] 가게 관리: 정적 가게 override + 커스텀 가게 추가 (image_height/position 조정)
- [ ] 주문 전체 보기 + 사장님과 동일한 권한으로 재배달/종료 처리
- [ ] 텔레그램 알림 자동 수신
- [ ] 매뉴얼 분리: `/manual-admin` (관리자 전용, 로그인 필수)
- [ ] auth_events 테이블에서 로그인 시도 감사 추적

---

## 5. 보안·개인정보 강화 사항 (모두 적용됨)

### 인증·세션
- bcryptjs 해시 비밀번호, httpOnly + Secure (prod) + SameSite=lax 쿠키
- 30일 세션
- 비밀번호 한글 입력 차단 (ASCII printable만)
- 자가 재설정: 닉네임+가입 전화번호 일치 시 즉시 변경
- **로그인 rate limit**: 닉네임/IP 단위 10분 8회 실패 → 15분 자동 차단
- **auth_events** 테이블에 모든 로그인 시도 기록 (성공/실패/차단/역할 미스매치/pending/suspended/자가 재설정)
- IP는 salt SHA-256 해시로 저장 (원본 비저장, AUTH_EVENT_IP_SALT 환경변수)

### HTTP 보안 헤더 (`next.config.ts`)
- HSTS: max-age=63072000 (2년), includeSubDomains, preload
- X-Frame-Options: DENY
- CSP: frame-ancestors 'none'
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: 카메라/마이크/위치/결제 거부

### 데이터·API
- 모든 사용자 입력값 텔레그램 메시지 전송 전 HTML 이스케이프 (인젝션·피싱 방지)
- 고객용 `/api/orders` 응답에서 내부 메모(`[재배달]` 줄) 자동 필터링, 배달맨 정보(`failed_reason`, `driver_memo`, `driver_id`, `delivery_photo_url`) 자동 제거
- 사장님은 본인 store_id에만 상품·이미지 CRUD (서버 검증)
- 배달맨은 본인에게 배정된 deliveryId만 사진 업로드 (driver_id 비교)
- 상태 변경 동시성 가드: approve/reject/confirm-payment/retry-delivery/close-failed 모두 `.eq('status', ...).select('id')` 사용 → 동시 클릭 시 한 명만 성공(409)
- 정지된 사용자 누출 차단: `/api/users`는 `status='active'`로 필터
- IP 추출: X-Forwarded-For의 right-most hop만 사용 (스푸핑 방지)
- 일회성 마이그레이션 엔드포인트는 사용 후 즉시 코드 삭제 (운영 표면 최소화)

### 감사 추적
- `order_status_logs.actor_role`/`note` 컬럼 → 주문 상태 누가 왜 바꿨는지 추적
- 관리자 주문 상세 화면에서 actor 역할 뱃지(🏪/⚙️/🚚) + 노트 표시
- 배달실패 상태 주문 삭제 시 "삭제" 텍스트 강제 입력으로 실수 방지

---

## 6. 검색엔진 등록 (SEO)

| 검색엔진 | 상태 |
|---|---|
| 네이버 서치어드바이저 | ✓ 소유확인 + 사이트맵 제출 + 웹페이지 수집 요청 완료 |
| 구글 서치콘솔 | ✓ 소유확인 + 사이트맵 제출 완료 |

**인덱싱 시작**: 약 2~4주 후 검색 결과 노출 시작 예정.

**확인**: 네이버에 `site:골목상점.kr` 또는 `site:xn--bb0bw4xzve3ni.kr` 검색.

---

## 7. 환경변수 (Railway)

| 변수명 | 용도 | 필수 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (서버 전용) | ✓ |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 | ✓ |
| `TELEGRAM_ADMIN_CHAT_ID` | 관리자방 chat ID | ✓ |
| `TELEGRAM_DRIVER_CHAT_ID` | 배달팀방 chat ID | ✓ |
| `AUTH_EVENT_IP_SALT` | IP 해시 salt | ⚠ 권장 (없으면 prod에서 ip_hash 미저장) |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | 네이버 소유확인 | ✓ |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 구글 소유확인 | (선택) |
| `NEXT_PUBLIC_SITE_URL` | https://xn--bb0bw4xzve3ni.kr | (선택) |

---

## 8. Supabase 스키마 요약

### 주요 테이블
- `users` — id, nickname, password_hash, role, status(active/pending/suspended), phone(정규화), store_id, device_uuid
- `orders` — order_number, customer_id, store_id, status, total_amount, delivery_address, owner_memo, rejected_reason, store_name(denormalized)
- `order_items` — order_id, product_id, product_name, unit_price, quantity, subtotal, item_memo
- `order_status_logs` — order_id, from_status, to_status, changed_by, actor_role, note ← **감사 추적용**
- `deliveries` — order_id, driver_id, status, picked_up_at, delivered_at, delivery_photo_url, driver_memo, failed_reason
- `auth_events` — event_type, nickname, user_id, role, ip_hash(SHA-256 salted), user_agent, detail ← **로그인 감사 로그**

### 동적 설정 (Supabase Storage)
- `config/stores-config.json` — 가게 명·가격·이미지·텔레그램 chat_id (custom + overrides + deleted)
- `config/products-{storeId}.json` — 가게별 상품 목록
- `config/images-{storeId}.json` — 가게·상품 이미지 메타

### 마이그레이션 (모두 적용 완료)
- 001 init schema, 002 RLS policies, 003 pg_cron_net
- 004 seed, 005 auth upgrade, 006 store separation
- 007 store images, 008 store settings, 009 pickup flow
- 010 delivery_failed status, 011 market order nullable
- 012 PII auto purge (90일 후 익명화)
- 013 item memo, 014 status log actor_role, 015 auth_events
- 016 telegram_notifications RLS 활성화 (2026-07-12, Supabase Security Advisor 대응)

> ⚠️ **레포 ↔ 실제 DB 드리프트 주의**: 007/008에서 만든 `store_images`·`store_settings`
> 테이블은 운영 DB에 실제로는 존재하지 않는다(이후 삭제됐거나 미적용). 가게 설정·이미지는
> Supabase Storage JSON(`config/*.json`)으로 이관됨. 2026-07-12 pg_class 조회 기준
> public 스키마 RLS 미적용 테이블은 telegram_notifications 하나뿐이었고, 016으로 잠금 완료.
> 실제 스키마 확인은 `pg_class`/`pg_policies` 조회 권장(마이그레이션 파일만 믿지 말 것).

---

## 9. 코드 위치 (검토 시 참고)

| 영역 | 경로 |
|---|---|
| 라우팅·인증 가드 | `proxy.ts`, `app/(auth)/` |
| 보안 헤더 | `next.config.ts` |
| API: 인증 | `app/api/auth/route.ts`, `password-reset/route.ts`, `password-reset-request/route.ts` |
| API: 주문 | `app/api/orders/`, `app/api/orders/[id]/{approve,reject,confirm-payment,pickup-complete,retry-delivery,close-failed}/route.ts` |
| API: 배달 | `app/api/deliveries/`, `[id]/{pickup,complete,fail,assign}/route.ts`, `upload-photo/route.ts` |
| API: 가게·상품 | `app/api/admin/stores-config/`, `app/api/store/{info,products,products/bulk,products/template,images}/route.ts` |
| 헬퍼 | `lib/auth/{owner-store,rate-limit}.ts`, `lib/audit/{order-status-log,auth-events}.ts`, `lib/telegram/messages.ts`, `lib/utils/{password,phone}.ts` |
| 매뉴얼 | `public/manual.html` (공개), `lib/content/manual-admin.ts` (관리자 전용) |
| 메타·SEO | `app/layout.tsx`, `app/opengraph-image.tsx`, `app/robots.ts`, `app/sitemap.ts` |

---

## 10. 알려진 한계·후속 권장사항

처리 완료된 항목은 위 §5에 기재됨. 다음은 **외부 의존성·정책 결정 필요해 보류된 항목**:

### 🟧 권장 (외부 결제·서비스 필요)
- **SMS OTP 자가 비밀번호 재설정**: 현재 닉네임+전화번호 일치로 변경. SMS OTP 추가하려면 Coolsms/NHN Cloud SENS 가입·결제. 비용 ≈ 건당 ₩10~15
- **phone 컬럼 암호화**: `users.phone`, `orders.customer_phone` 평문 저장. pgcrypto column-level encryption 또는 Supabase Vault. 키 관리 정책 결정 필요

### 🟨 권장 (확장 시점에)
- **Rate limiter Redis 화**: 현재 in-memory (Railway 1 instance 가정). 인스턴스 확장 시 Upstash Redis 등 외부 저장소 필요
- **CSRF 토큰**: 현재 SameSite=lax 쿠키만으로 보호. POST JSON에는 충분하지만 더 강력한 보호 원하면 토큰 도입

### 🟦 선택 사항
- 비로그인 사용자가 `/market` 접근 시 로그인 강제 → SEO·신규 가입 전환에 손해. 비로그인 둘러보기 허용 검토
- 카테고리 칩에 "햄버거/패스트푸드" 추가 (프랭크버거 입점)

---

## 11. 운영 노하우

### 카톡 링크 미리보기 캐시
- 카톡은 한 번 본 링크 미리보기를 며칠~몇 주 캐시
- 강제 갱신: https://developers.kakao.com/tool/clear/og 에서 URL 초기화
- 한글 도메인(`골목상점.kr`)은 카톡이 인식 못 함. **Punycode(`xn--bb0bw4xzve3ni.kr`) 사용 권장**
- 우회: `?v=2` 같은 더미 쿼리 붙이면 새 URL로 인식 → 새 미리보기

### 일회성 마이그레이션 패턴
- `/api/admin/migrate-*` 엔드포인트로 만들고 관리자 페이지 버튼에 연결
- 사용 후 **반드시** 엔드포인트 + 버튼 코드 삭제 (영구 표면 방지)
- 과거 적용 완료: butcher-categories (5/10), normalize-phones (5/10), rename-okkimchi (5/31) — 모두 삭제 완료

### 도메인·인증서
- 자동 갱신 ON 확인 (후이즈 마이페이지)
- SSL Let's Encrypt 자동 (Railway가 처리)
- KT ISP 사용자가 도메인 변경 직후 접속 안 될 때 → PC DNS를 1.1.1.1로 변경 안내

### 텔레그램 봇
- 매장방 chat_id는 가게 설정에서 입력 (관리자가 매장 사장님 안내)
- 봇이 그룹에 초대되어 있어야 메시지 전송 가능
- 사용자 입력값은 자동 escape되어 인젝션 안전

---

## 12. 자주 묻는 검토 질문

**Q. 시연·테스트용 계정 받을 수 있나요?**
A. 데모 모드(NODE_ENV !== production)에서만 `테스트고객/사장님/배달맨/관리자` (비번 `demo1234`) 사용 가능. 운영 환경(골목상점.kr)은 실계정 필요.

**Q. 코드를 처음 보는데 어디부터 읽으면 되나요?**
1. `proxy.ts` — 역할 기반 라우팅 가드
2. `app/api/auth/route.ts` — 로그인 흐름
3. `app/api/orders/route.ts` — 주문 조회 (역할별 필터링 로직 잘 보이는 곳)
4. `lib/types/index.ts` — 데이터 타입 한 번에 파악
5. `app/(owner)/owner/orders/[id]/page.tsx` — 가장 복잡한 화면

**Q. 보안 점검은 어떻게 하나요?**
1. 위 §5 체크리스트 항목별로 확인
2. `next.config.ts` 헤더 6개 모두 있는지
3. 텔레그램 메시지 빌더(`lib/telegram/messages.ts`)에 `e()` 또는 `escapeHtml()` 일관 적용
4. 권한 검증(`getOwnerStoreId()`) 사용처: `app/api/orders/[id]/`, `app/api/store/images/`, `app/api/store/products/bulk/`
5. Supabase 콘솔 → Tables → `auth_events`에서 최근 실패·차단 패턴 확인

**Q. 배포는 어떻게?**
main 브랜치 push → Railway 자동 빌드·배포 (보통 2~4분). 환경변수만 별도 Railway 콘솔에서 관리.

---

## 13. 연락처·참고 자료

- **소스 저장소**: github.com/senshoo-coder/kosamart
- **배포 플랫폼**: Railway (kosamart 프로젝트)
- **DB**: Supabase (KOSAMART 프로젝트)
- **종로구청 시범사업 연계** — 보고서·인쇄물용 도메인은 `골목상점.kr` 사용

추가 문의·자료: `docs/HANDOFF.md`, `docs/DOMAIN_SETUP.md`, 프로젝트 루트의 `CLAUDE.md`/`AGENTS.md` 참조.
