# 코사마트 (Kosamart) — 개발 인수인계 문서

> **이 문서를 새 Claude Code 세션 첫 메시지로 통째로 붙여넣으면 풀 컨텍스트로 작업 가능.**
> 작성일: 2026-04-26 · 최종 배포 커밋: `96e88b6`

---

## 0. 30초 요약

코사마트는 **종로구청에 제출한 "평창동 골목상권 AI·디지털 전환 및 온누리 연계 활성화 사업"의 실제 구현체**.
- 동네 단위(평창동·구기동·신영동·홍지동·부암동) 마이크로 마켓플레이스
- 4-Role: 고객 / 사장님 / 배달기사 / 관리자
- **수수료 0%**, 점포별 직접 결제(계좌이체) — 플랫폼은 결제금 미경유 (법적 리스크 회피 핵심 원칙)
- Next.js 16 + Supabase + Railway 배포
- 운영 도메인:
  - 메인 (예정): `https://골목상점.kr` (Punycode: `xn--bb0bw4xzve3ni.kr`)
  - 백업/원본: `https://kosamart-production.up.railway.app`

---

## 1. 프로젝트 정체성

### 사업 배경 (2025.12.26 종로구청 제출 계획서)
- **사업명**: 평창동 골목상권 디지털 전환 및 온누리상품권 연계 활성화 사업
- **추진 동기**: 배민 등 대형 배달앱 수수료(20% 또는 건당 5천원) 부담으로 동네 소상공인 수익성 악화 → 동네 주도 자체 배달·결제 체계 구축
- **시범 지역**: 종로구 평창동·구기동·신영동·홍지동·부암동
- **목표 점포 수**: 1년차 15~25곳
- **요청 예산**: 1차년도 1.6억 원
  - 플랫폼 개발 6,000만 / 운영 3,000만 / 인력 3,600만 / 배달 2,400만 / 홍보 1,000만

### 5대 핵심 목표 (사업계획서 기준)
1. **온누리상품권 기반 온라인 상점가 플랫폼** (소비자 10% 할인, 점주 카드수수료 절감)
2. **배달 플랫폼 구조 개선** (배민 대비 절반 이하 수수료, 상점가 공동 배달)
3. **상점가 공동 포인트 제도** (락인: 카드 2% → 앱 포인트 1%)
4. **평창동 → 종로 전체 → 자매결연 도시 확장 모델**
5. **상권 이미지 개선·지역 홍보** ("수입김치 Zero" 등)

### 핵심 차별화 표 (반드시 유지해야 할 정체성)
| 항목 | 배민 | 코사마트 |
|---|---|---|
| 수수료 | 20% / 건당 5천원 | 최대 10% 이하 |
| 카드수수료 | 2~3% | 온누리시 0%, 또는 앱 포인트 1% |
| 소비자 혜택 | 없음 | 온누리 10% + 포인트 1% |
| 결제 흐름 | 플랫폼 → 점포 | 고객 → 점포 직접 |

---

## 2. 기술 스택 / 아키텍처

### 스택
- **Frontend**: Next.js 16.2.1 (Turbopack), React 19, TypeScript, Tailwind CSS, PWA
- **Backend**: Next.js Route Handlers (API Routes)
- **DB / Storage**: Supabase Postgres + Supabase Storage
- **Auth**: 자체 (bcrypt + httpOnly Secure 쿠키, 데모 모드 fallback)
- **Hosting**: Railway (auto-deploy on `main` push)
- **알림**: Telegram Bot API + Supabase pg_cron/pg_net 트리거
- **인증 보호**: WEBHOOK_SECRET 헤더 검증

### 중요 컨벤션 (프로젝트 AGENTS.md / CLAUDE.md)
> "This is NOT the Next.js you know" — Next.js 16에서 `middleware.ts` → `proxy.ts` 등 변경됨. 작업 전 반드시 `node_modules/next/dist/docs/` 확인.

특히:
- **`proxy.ts`** 사용 (`middleware.ts` 아님 — Next.js 16에서 둘 다 있으면 빌드 실패)
- 라우트 핸들러에서 리다이렉트 시 **상대 경로 `Location` 헤더** 사용 (Railway 프록시 뒤에서 `request.url`이 `localhost:8080`으로 잡힘)
- `output: 'standalone'` 모드 — `fs.readFileSync`로 외부 파일 읽기 시 배포에 누락 가능, **TS 모듈로 인라인** 권장

### Auth 구조
```
쿠키 (httpOnly, Secure in prod, SameSite=lax)
├── cosmart_user_id   — 사용자 ID
└── cosmart_role      — customer | owner | driver | admin

데모 사용자 (localStorage):
└── cosmart_user      — { store_id 등 추가 정보 }

컨셉 페이퍼 별도 인증:
└── concept_access    — 'granted' (7일)
```

### 주요 디렉터리 구조
```
app/
├── (admin)/admin/             # 관리자 모드
│   ├── dashboard/
│   ├── products/              # 공구 상품 관리
│   ├── stores/[storeId]/manage/  # 가게별 상품 관리
│   └── users/
├── (owner)/owner/             # 사장님 모드
│   ├── dashboard/
│   ├── orders/
│   └── store/                 # 본인 가게 관리
├── (driver)/driver/           # 배달기사 모드
│   └── deliveries/
├── (customer)/                # 고객 모드
│   ├── market/[storeId]/
│   └── shop/
├── api/                       # 모든 API 라우트
│   ├── auth/
│   ├── orders/[id]/{approve, reject, confirm-payment, pickup-complete}/
│   ├── deliveries/[id]/{assign, pickup, complete, fail}/
│   ├── store/{products, info, images}/
│   ├── products/{[id]/}/      # 공구 상품
│   ├── group-buys/
│   ├── webhooks/order-status/
│   └── concept-auth/          # 컨셉 페이퍼 비밀번호
├── concept/route.ts           # 컨셉 페이퍼 (인증 게이트)
└── concept-login/page.tsx

lib/
├── supabase/server.ts
├── auth/owner-store.ts        # 사장님 store_id 헬퍼
├── content/concept-paper.ts   # 컨셉 페이퍼 HTML 인라인
├── hooks/useStoreProducts.ts
├── telegram/messages.ts
├── market-data.ts             # 정적 가게/상품 fallback
└── types/index.ts

public/manual.html             # 4-Role 매뉴얼 (공개)
proxy.ts                       # Next.js 16 미들웨어
supabase/migrations/           # 001~013 SQL 마이그레이션
```

---

## 3. 현재 구현 상태 (Built)

### ✅ 완성된 기능
- **인증/권한**: 4-Role 로그인, 데모 계정 fallback, 가게별 owner 자동 매핑
- **고객**: 회원가입, 가게 둘러보기, 다중 가게 통합 장바구니, 점포별 자동 분리, 배달/픽업 선택, 5개 동 주소 선택, 희망 시간대, 주문 추적
- **사장님**:
  - 대시보드 (오늘 주문/매출/입금대기/배달중 — 클릭시 해당 목록 이동)
  - 주문 입금확인·승인·거절 (가게 경계 검증)
  - 가게 정보 편집 (영업시간·휴무·계좌·텔레그램 ChatID)
  - 상품 CRUD + ▲▼ 순서 변경
  - 이미지 업로드 (10MB / JPEG·PNG·WebP·GIF)
- **배달기사**: 대기 배달 수락 (선착순), 픽업·완료·실패 처리, 사진 첨부, 완료 내역
- **관리자**:
  - 전체 주문/배달 대시보드
  - 가게 생성·수정·삭제, 텔레그램 ChatID
  - 사용자 관리 (계정 생성·비번 재설정·정지)
  - 공구 상품 운영 + ▲▼ 순서 변경
  - 가게별 상품 관리 + ▲▼ 순서 변경
- **결제**: 계좌이체 안내 모달 (실제 결제는 고객→가게 직접)
- **알림**: 텔레그램 봇 (관리자 그룹 + 가게 그룹 + 기사 그룹)
- **상태 흐름**:
  - 배달: pending → paid → approved → delivering → delivered
  - 픽업: pending → paid → approved → picked_up_by_customer
  - 취소: rejected (사유 필수)
  - 실패: delivery_failed (사유 필수)
- **보안**:
  - 모든 API에 역할 검증
  - 사장님은 본인 store_id만 접근 (서버 검증)
  - WEBHOOK_SECRET 헤더 검증
  - httpOnly·Secure 쿠키
  - 가격·재고 음수 차단
  - 파일 업로드 크기/MIME 제한
  - PII 자동 파기 (pg_cron, migration 012)
- **문서**: `/manual.html` (공개, 4-Role 매뉴얼), `/concept` (비밀번호 보호 컨셉 페이퍼)

### 운영 정보
- **배포 URL**:
  - 메인 (예정): `https://골목상점.kr` — Punycode `xn--bb0bw4xzve3ni.kr`. 등록·DNS 연결 완료 후 활성화
  - 백업/원본: `https://kosamart-production.up.railway.app` (Railway 기본 도메인, 영구 유지)
- **컨셉 페이퍼**: `/concept` (비밀번호 `kosamart2026`, env `CONCEPT_PAGE_PASSWORD`로 변경)
- **매뉴얼**: `/manual.html`
- **Repo**: `senshoo-coder/kosamart`
- **데모 계정** (모든 비밀번호 `demo1234`):
  - `테스트고객` / `사장님` (central-super) / `반찬사장님` (banchan) / `정육사장님` (butcher) / `본죽사장님` (bonjuk) / `치킨사장님` (chicken) / `빵집사장님` (bakery) / `배달기사` / `관리자`
- **운영 가게 (현재 정적 데이터)**: 종합슈퍼·반찬가게·정육점·본죽·치킨·빵집

---

## 4. 갭 분석 (사업계획서 vs 구현)

### ★★★ 최우선 (사업 정체성 차별화 핵심)
1. **온누리상품권/디지털 온누리 결제 연동**
   - 현재: 계좌이체만
   - 필요: 결제 수단으로 "디지털 온누리상품권" 추가, 사용 시 10% 할인 적용 표기
   - 실제 API 연동은 한국간편결제진흥원/NH농협 등 협력 필요 — 단계적으로 (1) UI/안내 → (2) 사용자 인증 → (3) 실제 연동
2. **상점가 공동 포인트 제도** (락인 시스템)
   - 카드 결제 시 2% → 앱 포인트 1% 적립으로 전환
   - 데이터 모델: `point_ledger` 테이블 (user_id, store_id, amount, type, order_id, created_at)
   - 적립/사용/조회 API + UI

### ★★ 중요
3. **거리 기반 배달비 정찰제** (현재 가게별 고정값)
   - 주소 기반 거리 계산 (Kakao Map API 등)
   - 배달비 자동 산정
4. **실시간 배달 위치 추적** (지도 표시)
   - 기사 앱에서 위치 송출
   - 고객 화면에서 지도 위 마커
5. **모바일 네이티브 앱** (Android/iOS)
   - 현재 PWA → React Native 또는 Capacitor 검토

### ★ 차별화 강화 (AI 영역)
6. **상황 인지형 추천**: 날씨·시간·이동 패턴 기반 (OpenAI/Claude API)
7. **다이내믹 프로모션**: 재고·고객 성향 분석 기반 타임어택 쿠폰 자동 생성
8. **생성형 AI 주문**: "매운 거 2만원 안쪽" 자연어 → 장바구니 자동 구성
9. **보이스 오더**: 음성 입력 → 주문
10. **스마트 묶음 배달**: 라이더 동선 + 조리완료 시간 3차원 분석
11. **수요 예측 라이더 사전 배치**: 과거 데이터 기반

### 비기능 (운영 측면)
12. **자체 결제 정산 리포트**: 사장님이 일/주/월 정산 자동 다운로드
13. **프로모션 매니저**: 관리자가 캠페인 설정
14. **공구 캘린더**: 관리자 운영 효율화
15. **다국어 지원** (외국인 주민 — 평창동 외국인 비중 높음)
16. **사회적협동조합 전환 준비** (사업 안정화 후)

---

## 5. 추천 우선순위 (다음 세션 시작 지점)

**Phase A — 사업계획서 정합성 강화 (1~2주)**
1. 컨셉 페이퍼를 사업계획서 톤에 맞게 갱신 (5대 목표·예산·로드맵 명시)
2. 결제 안내 UI에 **온누리상품권 결제 가능 (안내 절차)** 섹션 추가 (실제 연동 전이라도)
3. `point_ledger` 데이터 모델 설계 + 사장님 화면에 "포인트 적립률" 토글 추가
4. 사장님/관리자 매출 정산 리포트 페이지 (월별 합계·온누리/카드 구분)

**Phase B — 운영 인프라 (2~4주)**
5. 거리 기반 배달비 정찰제 (Kakao Map Geocoding)
6. 실시간 배달 추적 (Supabase Realtime + 기사 위치 송출)
7. 다국어(한·영) i18n 도입

**Phase C — AI 차별화 (4~8주)**
8. 추천 시스템 (단순 룰 → ML)
9. 생성형 AI 주문 (Claude API 활용)
10. 묶음 배달 최적화

**Phase D — 확장성 (안정화 후)**
11. React Native 앱 래핑
12. 종로구 다른 동/상권으로 데이터 모델 일반화
13. 사회적협동조합 운영 모드 추가

---

## 6. 알려진 이슈 / 주의사항

- **Next.js 16의 standalone 경고**: `next start does not work with output: standalone` — 동작 영향 없으나, 깔끔하게 정리하려면 `next.config.js`에서 `output: 'standalone'` 제거 검토
- **proxy.ts vs middleware.ts**: Next.js 16은 `proxy.ts`만 사용. 둘 다 있으면 빌드 실패
- **Railway 프록시 뒤 redirect**: `NextResponse.redirect(new URL('/path', request.url))` 사용 시 `localhost:8080`으로 잘못 풀림 → **상대 경로 `Location` 헤더** 권장
- **standalone 빌드와 fs**: `fs.readFileSync`로 외부 파일 읽으면 배포에 미포함 → TS 모듈로 인라인
- **데모 데이터와 DB 데이터 혼재**: `lib/market-data.ts`의 정적 fallback과 Supabase Storage 동적 데이터가 공존. 새 가게 추가 시 양쪽 동기화 주의
- **Cookie 위조 가능성**: 현재 쿠키는 서명되지 않음. 사장님/기사 권한이 필요한 모든 API는 서버에서 store_id/role을 별도 검증해야 함 (대부분 적용됨)

---

## 7. 즉시 작업 가능한 시드 프롬프트

새 세션에서 이렇게 시작하면 됨:

```
이전 Claude Code 세션에서 코사마트(kosamart) 마켓플레이스를 만들고 있어.
종로구청 제출용 "평창동 골목상권 디지털 전환" 사업계획서의 구현체야.

docs/HANDOFF.md를 먼저 읽고 컨텍스트를 파악해줘.
그 다음에 [원하는 작업]을 진행해.

주요 정보:
- Repo: senshoo-coder/kosamart
- 운영: https://골목상점.kr (예정) / https://kosamart-production.up.railway.app (백업)
- main 브랜치 push 시 Railway 자동 배포
- 데모 비번: demo1234 (모든 데모 계정)
- 컨셉 페이퍼 비번: kosamart2026 (env CONCEPT_PAGE_PASSWORD)
```

---

## 8. 참고 자료 (이 저장소 내)

- `public/manual.html` — 4-Role 사용자 매뉴얼 (공개)
- `app/concept/route.ts` + `lib/content/concept-paper.ts` — 컨셉 페이퍼 (비밀번호 보호)
- `AGENTS.md` / `CLAUDE.md` — Next.js 16 작업 시 주의사항
- `supabase/migrations/` — DB 스키마 변경 이력
- `lib/types/index.ts` — TypeScript 도메인 타입

원본 사업계획서 PDF는 별도 보관 (저장소에 미포함). 핵심 내용은 본 문서 §1·§4에 요약됨.
