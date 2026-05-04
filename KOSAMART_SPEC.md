# 코사마트 상점가 (Kosamart) — 전체 스키마 및 개발 명세

> 최종 업데이트: 2026-04-12

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [배포 환경](#3-배포-환경)
4. [환경 변수](#4-환경-변수)
5. [디렉토리 구조](#5-디렉토리-구조)
6. [라우트 구조](#6-라우트-구조)
7. [API 엔드포인트](#7-api-엔드포인트)
8. [데이터베이스 스키마](#8-데이터베이스-스키마)
9. [Supabase Storage 구조](#9-supabase-storage-구조)
10. [인증 및 계정 체계](#10-인증-및-계정-체계)
11. [텔레그램 알림 체계](#11-텔레그램-알림-체계)
12. [TypeScript 타입 정의](#12-typescript-타입-정의)
13. [주문 상태 흐름](#13-주문-상태-흐름)
14. [배달 상태 흐름](#14-배달-상태-흐름)
15. [데모 모드](#15-데모-모드)
16. [주요 라이브러리 유틸리티](#16-주요-라이브러리-유틸리티)

---

## 1. 프로젝트 개요

코사마트 상점가는 아파트 단지 내 O2O 공동구매·상점가 주문·배달 관리 플랫폼이다.

| 기능 영역 | 설명 |
|-----------|------|
| 공동구매 (Group Buy) | 이벤트 단위 공동구매, 주문 접수·관리 |
| 상점가 (Marketplace) | 개별 상점 상품 주문 (픽업/배달 선택) |
| 배달 관리 | 기사 배달 수락·픽업·완료·실패 처리 |
| 관리자 대시보드 | 전체 주문·배달·사용자·매출 통합 관리 |
| 사장님 모드 | 자기 매장 주문 확인·상품·운영시간 관리 |

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, TypeScript) |
| 스타일 | Tailwind CSS v4 |
| 데이터베이스 | Supabase (PostgreSQL + pgvector + pg_net + pg_cron) |
| 인증 | 커스텀 닉네임+비밀번호 (bcryptjs), httpOnly 쿠키 |
| 스토리지 | Supabase Storage (이미지, JSON 설정 파일) |
| 알림 | Telegram Bot API (HTML 파싱 모드) |
| 상태관리 | Zustand (장바구니), React useState |
| 배포 | Railway (GitHub 자동 배포) |

**주요 패키지 의존성:**

```
bcryptjs         — 비밀번호 해싱
date-fns         — 날짜 포맷
lucide-react     — 아이콘
nanoid           — 짧은 ID 생성
react-hook-form  — 폼 관리
swr              — 서버 데이터 fetch/캐싱
zod              — 스키마 검증
zustand          — 클라이언트 상태관리
```

---

## 3. 배포 환경

| 항목 | 값 |
|------|----|
| 호스팅 | Railway |
| 레포지토리 | https://github.com/senshoo-coder/kosamart |
| 브랜치 | main (push 시 자동 배포) |
| 배포 URL (메인) | https://골목상점.kr — Punycode `xn--bb0bw4xzve3ni.kr`, 등록·DNS 설정 후 활성화 |
| 배포 URL (백업) | https://kosamart-production.up.railway.app |
| Supabase 프로젝트 | https://fvklcspgzwtqjvcbkdhu.supabase.co |

---

## 4. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://fvklcspgzwtqjvcbkdhu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Telegram
TELEGRAM_BOT_TOKEN=8682228480:AAHD7Aamc6l8z2R04nnu00avAdPE176JlG0
TELEGRAM_ADMIN_CHAT_ID=-5232711770       # 관리방 (관리자+관리팀)
TELEGRAM_DRIVER_CHAT_ID=-5159319491      # 배달방 (관리자+관리팀+배달기사)
```

> 가게방 chat_id는 Supabase Storage `stores-config.json`의 각 매장 `telegram_chat_id` 필드에 저장.

---

## 5. 디렉토리 구조

```
kosamart/
├── app/
│   ├── (auth)/          — 로그인·회원가입
│   ├── (customer)/      — 고객 화면
│   ├── (owner)/         — 사장님 모드
│   ├── (admin)/         — 관리자 모드
│   ├── (driver)/        — 배달기사 화면
│   └── api/             — API 라우트
├── components/
│   ├── ui/              — 공통 UI 컴포넌트 (button, badge, card 등)
│   └── layout/          — 사이드바·하단 네비게이션
├── lib/
│   ├── supabase/        — 서버·클라이언트 Supabase 클라이언트
│   ├── telegram/        — 텔레그램 메시지 발송 유틸
│   ├── cart/            — 장바구니 Context (Zustand)
│   ├── hooks/           — 공통 React 훅
│   ├── utils/           — 포맷·UUID·로컬스토리지 유틸
│   ├── market-data.ts   — 상점 정적 데이터
│   └── demo-data.ts     — 데모용 목(Mock) 데이터
├── supabase/
│   └── migrations/      — SQL 마이그레이션 파일 (001~008)
└── public/              — 정적 파일
```

---

## 6. 라우트 구조

### 고객 (`/`)

| 경로 | 설명 |
|------|------|
| `/` | 홈 (로그인으로 리디렉트) |
| `/login` | 로그인 (role 파라미터 지원) |
| `/register` | 회원가입 |
| `/shop` | 공동구매 상품 목록 |
| `/market` | 상점가 목록 |
| `/market/[storeId]` | 개별 상점 상품 목록 |
| `/market/cart` | 장바구니·주문 |
| `/orders` | 내 주문 내역 |
| `/delivery` | 배달 추적 |
| `/profile` | 내 프로필 |

### 사장님 (`/owner`)

| 경로 | 설명 |
|------|------|
| `/owner/dashboard` | 매장 대시보드 |
| `/owner/orders` | 주문 목록·승인·거절 |
| `/owner/orders/[id]` | 주문 상세 |
| `/owner/store` | 매장 정보·상품·운영시간 설정 |
| `/owner/analytics` | 매출 분석 |

### 관리자 (`/admin`)

| 경로 | 설명 |
|------|------|
| `/admin/dashboard` | 전체 대시보드 |
| `/admin/orders` | 전체 주문 관리 |
| `/admin/delivery` | 배달 현황 |
| `/admin/products` | 공동구매 상품 관리 |
| `/admin/drivers` | 배달기사 관리·통계 |
| `/admin/users` | 사용자 관리·승인 |
| `/admin/stores` | 상점 목록·설정 |
| `/admin/stores/[storeId]` | 개별 상점 상세 |
| `/admin/analytics` | 플랫폼 전체 분석 |

### 배달기사 (`/driver`)

| 경로 | 설명 |
|------|------|
| `/driver/deliveries` | 배달 목록 (수락·픽업·완료) |
| `/driver/history` | 배달 완료 내역 |

---

## 7. API 엔드포인트

### 인증

#### `POST /api/auth`
로그인

**Request**
```json
{ "nickname": "관리자", "password": "demo1234", "device_uuid": "uuid-optional" }
```
**Response**
```json
{
  "data": { "id": "uuid", "nickname": "관리자", "device_uuid": "...", "role": "admin", "store_id": null },
  "error": null
}
```
- 데모 계정 → 코드 내 하드코딩 배열에서 확인
- 실제 계정 → Supabase `users` 테이블 + bcrypt 비교
- 성공 시 쿠키 설정: `cosmart_user_id`, `cosmart_role` (httpOnly, 30일)

#### `POST /api/auth/register`
회원가입

**Request**
```json
{ "nickname": "홍길동", "password": "pass123", "role": "customer", "phone": "010-0000-0000" }
```
- 고객: 즉시 `active`
- 사장님·기사: `pending` (관리자 승인 필요)

#### `POST /api/auth/logout`
쿠키 삭제

#### `POST /api/auth/demo`
데모 로그인 (자격증명 불필요)

**Request**
```json
{ "role": "customer" }
```

---

### 공동구매 주문

#### `GET /api/orders`
주문 목록

| 파라미터 | 설명 |
|----------|------|
| `device_uuid` | 고객 본인 주문 필터 |
| `status` | 상태 필터 (콤마 구분) |
| `store_id` | 매장 필터 (관리자) |
| `limit` | 최대 건수 (기본 50) |

**Response** → orders + order_items + customer + delivery + status_logs

#### `POST /api/orders`
주문 생성 (공동구매)

**Request**
```json
{
  "group_buy_id": "uuid",
  "device_uuid": "...",
  "nickname": "홍길동",
  "delivery_address": "101동 201호",
  "delivery_memo": "문 앞에",
  "items": [{ "product_id": "uuid", "quantity": 2 }]
}
```
→ `orders` + `order_items` + `deliveries` 레코드 자동 생성
→ 텔레그램 관리방 알림

#### `POST /api/orders/[id]/approve`
주문 승인 (pending → approved)

**Request**
```json
{ "owner_memo": "단골 고객" }
```
→ 텔레그램 관리방·배달방 알림 (픽업 시 배달방 제외)

#### `POST /api/orders/[id]/reject`
주문 취소/거절 (→ cancelled)

**Request**
```json
{ "rejected_reason": "재고 소진" }
```
→ 텔레그램 관리방 알림

#### `POST /api/orders/[id]/confirm-payment`
입금 확인 (pending → paid)
→ 텔레그램 관리방 알림 (상품 상세 포함)

#### `GET /api/orders/stats`
대시보드 통계

**Response**
```json
{ "todayOrders": 5, "pendingCount": 2, "paidCount": 1, "deliveringCount": 1, "todayRevenue": 120000 }
```

---

### 배달

#### `GET /api/deliveries`
배달 목록

| 파라미터 | 설명 |
|----------|------|
| `driver_uuid` | 기사 본인 배달만 |
| `status` | 상태 필터 (콤마 구분) |
| `limit` | 최대 건수 (기본 50) |

- `pending` 상태는 `order.status = 'approved'`인 것만 반환
- `delivery_address = '매장 픽업'`인 주문은 배달 목록에서 제외

#### `POST /api/deliveries/[id]/assign`
배달 수락 (pending → assigned)

**Request**
```json
{ "driver_uuid": "uuid" }
```

#### `POST /api/deliveries/[id]/pickup`
픽업 완료 (assigned → picked_up, order → delivering)
→ 텔레그램 관리방 알림

#### `POST /api/deliveries/[id]/complete`
배달 완료 (→ delivered, order → delivered)

**Request**
```json
{ "driver_memo": "현관 앞 배달", "driver_photo_url": "https://..." }
```
→ 텔레그램 관리방 알림

#### `POST /api/deliveries/[id]/fail`
배달 실패 (→ failed, order → delivery_failed)

**Request**
```json
{ "failed_reason": "수취인 부재" }
```
→ 텔레그램 관리방 알림

#### `POST /api/deliveries/upload-photo`
배달 완료 사진 업로드 (multipart/form-data)

---

### 상점가 (Marketplace)

#### `POST /api/market/orders`
상점가 주문 생성

**Request**
```json
{
  "store_id": "chicken",
  "store_name": "페리카나 치킨",
  "device_uuid": "...",
  "nickname": "홍길동",
  "pickup_type": "pickup",
  "delivery_address": "매장 픽업",
  "delivery_memo": "희망시간 13:00 / 소스 많이",
  "customer_phone": "010-0000-0000",
  "items": [{ "product_name": "후라이드", "unit_price": 18000, "quantity": 1, "subtotal": 18000 }],
  "total_amount": 18000
}
```
→ 텔레그램 관리방 + 해당 가게방 동시 알림

#### `GET /api/market/stores`
상점 목록 (정적 데이터 + Supabase Storage 설정 병합)

#### `GET /api/store/products`
상점 상품 목록

| 파라미터 | 설명 |
|----------|------|
| `store_id` | 매장 ID (필수, `__all__` 가능) |

#### `POST /api/store/products`
상품 추가

#### `PATCH /api/store/products`
상품 수정

#### `DELETE /api/store/products`
상품 삭제

#### `PATCH /api/store/info`
매장 정보 수정 (사장님·관리자)

**Request**
```json
{
  "store_id": "chicken",
  "hours": "11:00~22:00",
  "minOrder": 15000,
  "deliveryFee": 2000,
  "isOpen": true,
  "bank_account": "카카오뱅크 3333-00-0000000 홍길동",
  "telegram_chat_id": "-5224004931"
}
```

---

### 관리자

#### `GET /api/admin/users`
사용자 목록 (status, role 필터)

#### `POST /api/admin/users`
관리자 직접 사용자 생성

#### `PATCH /api/admin/users/[id]`
사용자 정보·상태 수정

#### `DELETE /api/admin/users/[id]`
사용자 삭제

#### `GET /api/admin/stores-config`
상점 설정 전체 조회

#### `PATCH /api/admin/stores-config`
상점 설정 저장 (overrides·custom·deleted)

#### `GET /api/admin/driver-stats`
배달기사별 통계

---

### Webhook / Cron

#### `POST /api/webhooks/cron/[event]`

| event | 스케줄 | 설명 |
|-------|--------|------|
| `daily-open` | 매일 08:00 | 공동구매 오픈 알림 |
| `closing-notice` | 매일 14:00 | 마감 임박 알림 |
| `daily-report` | 매일 23:00 | 일일 정산 리포트 |
| `pending-timeout` | 매 5분 | 30분 이상 미입금 주문 자동 취소 |

#### `POST /api/webhooks/order-status`
DB 트리거(pg_net)에서 호출 — 주문 상태 변경 시 텔레그램 알림

---

## 8. 데이터베이스 스키마

마이그레이션 파일: `supabase/migrations/001~008_*.sql`

### ENUM 타입

```sql
CREATE TYPE user_role AS ENUM ('customer', 'owner', 'driver', 'admin');
-- admin은 005_auth_upgrade.sql에서 추가

CREATE TYPE group_buy_status AS ENUM ('draft', 'active', 'closed', 'cancelled');

CREATE TYPE order_status AS ENUM (
  'pending', 'paid', 'approved', 'rejected', 'preparing',
  'ready', 'delivering', 'delivered', 'cancelled'
);

CREATE TYPE delivery_status AS ENUM (
  'pending', 'assigned', 'picked_up', 'delivering', 'delivered', 'failed'
);
```

### 테이블

#### `users`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 자동 생성 |
| device_uuid | TEXT UNIQUE | 모바일 기기 식별자 (nullable) |
| nickname | TEXT UNIQUE | 로그인 아이디 겸 표시명 |
| role | user_role | customer / owner / driver / admin |
| status | TEXT | pending / active / suspended |
| phone | TEXT | 전화번호 |
| password_hash | TEXT | bcrypt 해시 |
| store_id | TEXT | 사장님 담당 매장 ID |
| telegram_chat_id | BIGINT | 개인 텔레그램 채팅 ID |
| is_active | BOOLEAN | 활성 여부 |
| pref_vector | vector(512) | 구매 패턴 임베딩 (pgvector) |
| created_at / updated_at | TIMESTAMPTZ | |

#### `group_buys`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| title | TEXT | 공동구매 이름 |
| description | TEXT | 설명 |
| kakao_chat_url | TEXT | 카카오톡 오픈채팅 링크 |
| owner_id | UUID → users | |
| status | group_buy_status | |
| order_deadline | TIMESTAMPTZ | 주문 마감 시각 |
| delivery_date | DATE | 배달 예정일 |
| min_order_amount | INTEGER | 최소 주문금액 |
| banner_image_url | TEXT | |

#### `products`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| group_buy_id | UUID → group_buys | CASCADE 삭제 |
| name | TEXT | 상품명 |
| price | INTEGER | 원 |
| unit | TEXT | 개·봉·kg 등 |
| stock_limit | INTEGER | 재고 한도 (null = 무제한) |
| is_available | BOOLEAN | 판매 가능 여부 |
| sort_order | INTEGER | 정렬 순서 |
| name_vector | vector(1536) | 상품 임베딩 (HNSW 인덱스) |

#### `orders`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| order_number | TEXT UNIQUE | 자동 생성 (GB YYMMDD-NNN) |
| group_buy_id | UUID → group_buys | 공동구매 주문 시 |
| store_id | TEXT | 상점가 주문 시 매장 ID |
| store_name | TEXT | 상점가 주문 시 매장명 |
| customer_id | UUID → users | |
| status | order_status | |
| total_amount | INTEGER | 원 |
| delivery_address | TEXT | `'매장 픽업'`이면 픽업 주문 |
| delivery_memo | TEXT | 희망 시간 포함 |
| kakao_nickname | TEXT | 주문자 표시명 |
| customer_phone | TEXT | 연락처 |
| owner_memo | TEXT | 사장님 메모 |
| rejected_reason | TEXT | 취소/거절 사유 |
| approved_at | TIMESTAMPTZ | |

#### `order_items`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| order_id | UUID → orders | CASCADE 삭제 |
| product_id | UUID → products | nullable (상점가 주문) |
| product_name | TEXT | |
| unit_price | INTEGER | |
| quantity | INTEGER | CHECK > 0 |
| subtotal | INTEGER | |

#### `deliveries`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| order_id | UUID UNIQUE → orders | 주문당 1개 |
| driver_id | UUID → users | 배정된 기사 |
| status | delivery_status | |
| assigned_at | TIMESTAMPTZ | 수락 시각 |
| picked_up_at | TIMESTAMPTZ | 픽업 시각 |
| delivered_at | TIMESTAMPTZ | 완료 시각 |
| delivery_photo_url | TEXT | 완료 사진 |
| driver_memo | TEXT | 기사 메모 |
| failed_reason | TEXT | 실패 사유 |

#### `order_status_logs`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| order_id | UUID → orders | CASCADE 삭제 |
| from_status | order_status | 변경 전 |
| to_status | order_status | 변경 후 |
| changed_by | UUID → users | 변경 주체 |
| note | TEXT | |
| created_at | TIMESTAMPTZ | |

#### `store_settings` *(008 마이그레이션)*

| 컬럼 | 타입 | 설명 |
|------|------|------|
| store_id | TEXT PK | market-data.ts의 store id |
| name | TEXT | |
| is_open | BOOLEAN | 영업 여부 |
| is_active | BOOLEAN | 플랫폼 노출 여부 |
| min_order | INTEGER | |
| delivery_fee | INTEGER | |
| badge | TEXT | 배지 텍스트 |
| hours | TEXT | `'HH:MM~HH:MM'` 형식 |

#### `telegram_notifications`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| order_id | UUID → orders | |
| chat_id | BIGINT | 수신 채팅방 ID |
| message | TEXT | 발송 내용 |
| status | TEXT | pending / sent / failed |
| sent_at | TIMESTAMPTZ | |

### 트리거

```sql
-- updated_at 자동 갱신: users, group_buys, orders, deliveries, store_settings
update_updated_at()

-- 주문 상태 변경 자동 로그
log_order_status_change()  → order_status_logs INSERT
```

### 확장 Extension

```sql
uuid-ossp  — UUID 생성
vector     — pgvector (구매 패턴·상품 임베딩)
pg_net     — DB 내 HTTP 요청 (웹훅 트리거)
pg_cron    — DB 내 스케줄러 (cron 잡)
```

---

## 9. Supabase Storage 구조

버킷: `config`

| 파일 | 설명 |
|------|------|
| `config/stores-config.json` | 상점 설정 (overrides·custom·deleted) |
| `config/products-{storeId}.json` | 상점별 상품 목록 |

### `stores-config.json` 구조

```json
{
  "overrides": {
    "chicken": {
      "name": "페리카나 치킨",
      "hours": "11:00~22:00",
      "minOrder": 15000,
      "deliveryFee": 2000,
      "bank_account": "카카오뱅크 3333-00-0000000 홍길동",
      "telegram_chat_id": "-5224004931"
    }
  },
  "custom": [
    {
      "id": "new-store",
      "name": "새 가게",
      "emoji": "🍜",
      "category": "식당",
      "hours": "10:00~21:00",
      "minOrder": 10000,
      "deliveryFee": 1500,
      "bank_account": "...",
      "telegram_chat_id": "..."
    }
  ],
  "deleted": ["old-store-id"]
}
```

---

## 10. 인증 및 계정 체계

### 역할별 접근 권한

| 역할 | 접근 경로 | 쿠키값 |
|------|-----------|--------|
| customer | `/market`, `/orders`, `/shop` | `cosmart_role=customer` |
| owner | `/owner/*` | `cosmart_role=owner` |
| driver | `/driver/*` | `cosmart_role=driver` |
| admin | `/admin/*` | `cosmart_role=admin` |

### 데모 계정 (비밀번호: `demo1234`)

| 닉네임 | 역할 | 담당 매장 |
|--------|------|-----------|
| 테스트고객 | customer | — |
| 관리자 | admin | — |
| 사장님 | owner | central-super |
| 반찬사장님 | owner | banchan |
| 정육사장님 | owner | butcher |
| 본죽사장님 | owner | bonjuk |
| 치킨사장님 | owner | chicken |
| 빵집사장님 | owner | bakery |
| 배달기사 | driver | — |

### 실제 생성 계정 (Supabase DB)

| 닉네임 | 역할 | 상태 | 전화번호 |
|--------|------|------|----------|
| admin | admin | active | — |
| 코사마트사장님 | owner | active | 010-1234-5678 |
| 치킨 부사장 | owner | active | 010-6548-5489 |
| 홍기사 | driver | active | 010-9876-5432 |
| 김기사 | driver | active | 010-5555-1234 |
| 평창댁·101동어머니·산책좋아요·좋은생각 등 | customer | active | — |

> 실제 계정 비밀번호: 가입 시 설정한 값 (코드에 없음)

---

## 11. 텔레그램 알림 체계

### 채팅방 구성

| 채팅방 | Chat ID | 구성원 |
|--------|---------|--------|
| 관리방 | `-5232711770` | 관리자 + 관리팀 |
| 배달방 | `-5159319491` | 관리자 + 관리팀 + 배달기사 |
| 페리카나 치킨 가게방 | `-5224004931` | 치킨 사장 + 관리팀 |

**봇**: `@pcdmarket_admin_bot` (토큰: env `TELEGRAM_BOT_TOKEN`)

### 알림 발송 함수

```typescript
notifyAdmin(text)                     // → 관리방
notifyDriver(text, driverChatId?)     // → 배달방 (driverChatId 미지정 시)
notifyStore(storeChatId, text)        // → 해당 가게방
```

### 알림 발생 시점

| 이벤트 | 수신 채팅방 |
|--------|------------|
| 신규 주문 접수 | 관리방 + 가게방 |
| 입금 확인 | 관리방 |
| 주문 승인 | 관리방 + 배달방 (배달 주문만) |
| 주문 취소/거절 | 관리방 |
| 배달 픽업 완료 | 관리방 |
| 배달 완료 | 관리방 |
| 배달 실패 | 관리방 |
| 일일 정산 리포트 | 관리방 |

> 매장 픽업 주문은 배달방 알림 제외

---

## 12. TypeScript 타입 정의

```typescript
// lib/types (또는 각 파일 내 inline 정의)

type UserRole = 'customer' | 'owner' | 'driver' | 'admin'
type UserStatus = 'pending' | 'active' | 'suspended'

type OrderStatus =
  | 'pending' | 'paid' | 'approved' | 'rejected'
  | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled'

type DeliveryStatus =
  | 'pending' | 'assigned' | 'picked_up' | 'delivering' | 'delivered' | 'failed'

type GroupBuyStatus = 'draft' | 'active' | 'closed' | 'cancelled'

interface User {
  id: string
  device_uuid?: string
  nickname: string
  role: UserRole
  status: UserStatus
  phone?: string
  store_id?: string
  telegram_chat_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Order {
  id: string
  order_number: string        // GB260412-001
  group_buy_id?: string
  store_id?: string
  store_name?: string
  customer_id: string
  kakao_nickname: string
  status: OrderStatus
  total_amount: number
  delivery_address: string    // '매장 픽업' = 픽업 주문
  delivery_memo?: string
  customer_phone?: string
  owner_memo?: string
  rejected_reason?: string
  approved_at?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
  customer?: User
  delivery?: Delivery
  status_logs?: OrderStatusLog[]
}

interface OrderItem {
  id: string
  order_id: string
  product_id?: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

interface Delivery {
  id: string
  order_id: string
  driver_id?: string
  status: DeliveryStatus
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  delivery_photo_url?: string
  driver_memo?: string
  failed_reason?: string
  created_at: string
  updated_at: string
  order?: Order
  driver?: User
}

interface GroupBuy {
  id: string
  title: string
  description?: string
  kakao_chat_url?: string
  owner_id: string
  status: GroupBuyStatus
  order_deadline?: string
  delivery_date?: string
  min_order_amount: number
  banner_image_url?: string
  created_at: string
  updated_at: string
  products?: Product[]
}

interface Product {
  id: string
  group_buy_id: string
  name: string
  description?: string
  price: number
  unit: string
  stock_limit?: number
  image_url?: string
  is_available: boolean
  sort_order: number
  created_at: string
}

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  unit: string
}
```

---

## 13. 주문 상태 흐름

```
[고객 주문]
     │
  pending ──────────────────────────────────→ cancelled
     │ (입금확인 버튼)
     ▼
   paid
     │ (승인 버튼)
     ▼
  approved ──────────────────────────────────→ cancelled
     │ (배달기사 픽업 완료)
     ▼
 delivering
     │ (배달 완료)
     ▼
 delivered

     또는 배달 실패 시 → delivery_failed
```

> - `'매장 픽업'` 주문도 동일 흐름이지만 deliveries 레코드는 생성되나 배달기사 목록에 노출 안 됨
> - 취소는 `cancelled` 상태로 통일 (`rejected` ENUM은 있으나 실제 코드에서 `cancelled` 사용)

---

## 14. 배달 상태 흐름

```
  pending  (배달 대기, 기사 미배정)
     │ (기사 수락)
     ▼
 assigned  (기사 배정)
     │ (픽업 완료 클릭)
     ▼
 picked_up
     │ (자동 또는 진행)
     ▼
 delivering
     │ (배달 완료 클릭)          (이슈 보고)
     ▼                              ▼
 delivered                        failed
```

---

## 15. 데모 모드

`NEXT_PUBLIC_SUPABASE_URL`이 없거나 `https`로 시작하지 않으면 데모 모드 활성화.

- DB 없이 `lib/demo-data.ts`의 Mock 데이터로 동작
- 데모 계정은 `app/api/auth/route.ts` 내 `DEMO_ACCOUNTS` 배열에 하드코딩
- 실제 배포 환경에서는 데모 계정도 DB 계정이 없을 경우 fallback으로 동작

---

## 16. 주요 라이브러리 유틸리티

### `lib/utils`

```typescript
formatPrice(amount: number): string       // ₩12,500
formatDate(str: string): string           // 2026.04.12
formatDateTime(str: string): string       // 2026.04.12 09:15
timeAgo(str: string): string             // 3분 전
generateOrderNumber(): string             // GB260412-001
generateDeviceUUID(): string              // UUID v4
getLocalStorage(key): string | null
setLocalStorage(key, value): void
getDeadlineText(deadline): string        // D-1, 2시간 30분
```

### `lib/supabase/server.ts`

```typescript
createClient()       // anon key (일반 접근)
createAdminClient()  // service_role key (전체 접근, RLS 우회)
```

### `lib/telegram/messages.ts`

```typescript
sendTelegramMessage(chatId, text)
notifyAdmin(text)
notifyDriver(text, driverChatId?)
notifyStore(storeChatId, text)

TelegramMessages.newOrder(order)
TelegramMessages.orderApproved(order)
TelegramMessages.orderRejected(order)
TelegramMessages.deliveryStarted(order)
TelegramMessages.deliveryCompleted(order, memo?)
TelegramMessages.deliveryFailed(order, reason)
TelegramMessages.newMarketOrder(order)
TelegramMessages.dailyReport(data)
```

### `lib/market-data.ts`

정적 상점 카탈로그 (6개 매장):

| store_id | 상점명 | 카테고리 |
|----------|--------|----------|
| central-super | 중앙슈퍼 | 편의점·슈퍼 |
| banchan | 반찬가게 | 반찬 |
| butcher | 정육마스터 김사장 | 정육 |
| bonjuk | 본죽 | 죽·한식 |
| chicken | 치킨마루 | 치킨 |
| bakery | 파리바게뜨 | 베이커리 |

각 매장 정적 필드: `id`, `name`, `emoji`, `category`, `description`, `hours`, `minOrder`, `deliveryFee`, `products[]`
→ Supabase Storage `stores-config.json`의 `overrides`로 런타임 덮어쓰기 가능

---

*이 문서는 코사마트 상점가 플랫폼의 전체 기술 명세입니다. 코드 변경 시 함께 업데이트해 주세요.*
