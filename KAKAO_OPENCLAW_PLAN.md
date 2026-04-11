# 카카오톡 알림 연동 계획 (OpenClaw + Kakao TalkChannel Plugin)

## 개요

현재 텔레그램으로만 구현된 알림 시스템을 카카오톡 채널로 확장한다.
OpenClaw + openclaw-kakao-talkchannel-plugin을 활용해 카카오 비즈니스 채널과 연동.

- 참고 레포: https://github.com/openclaw/openclaw
- 플러그인: https://github.com/kakao-bart-lee/openclaw-kakao-talkchannel-plugin

---

## 현재 구조

```
lib/telegram/messages.ts       ← 텔레그램 알림 (현재 구현됨)
  - sendTelegramMessage()
  - notifyAdmin()
  - notifyDriver()
  - TelegramMessages.newOrder / orderApproved / deliveryStarted / ...

app/api/orders/[id]/approve/route.ts    ← 텔레그램 호출 (버그 있음)
app/api/orders/[id]/confirm-payment/route.ts
app/api/deliveries/[id]/complete/route.ts
```

---

## 목표 구조

```
lib/kakao/messages.ts          ← 카카오 알림 (신규 추가)
  - sendKakaoMessage()
  - KakaoMessages.newOrder / orderApproved / deliveryStarted / ...

lib/notify.ts                  ← 통합 알림 레이어 (신규 추가)
  - notify(target, event, data)
    → Telegram + Kakao 동시 발송
```

---

## 카카오톡 카드 타입 매핑

| 이벤트 | 카드 타입 | 이유 |
|--------|-----------|------|
| 신규 주문 접수 (사장님) | `listCard` | 주문 항목 목록 표시 |
| 주문 승인 완료 (고객) | `textCard` | 안내 텍스트 + 버튼 |
| 주문 거절 (고객) | `simpleText` | 단순 알림 |
| 배달 출발 (고객) | `basicCard` | 이미지(지도) + 상태 |
| 배달 완료 (고객) | `itemCard` | 영수증 형식 |
| 배달 실패 (사장님) | `textCard` | 내용 + 조치 버튼 |
| 일일 정산 리포트 | `listCard` | 항목별 통계 목록 |

---

## 필요한 것들

### 외부 서비스
- [ ] 카카오 비즈니스 계정 개설
- [ ] 카카오톡 채널 생성 (카카오 비즈니스 플랫폼)
- [ ] OpenClaw 설치 (`npm install -g openclaw@latest`)
- [ ] 플러그인 설치 (`npm install @openclaw/kakao-talkchannel`)
- [ ] Anthropic API 키 (OpenClaw 구동용)

### 릴레이 서버
- 기본: `k.tess.dev` 사용 (MVP 단계, 별도 설정 불필요)
- 추후: 자체 릴레이 서버 배포 검토 (월 1000건+ 주문 시)

### 환경변수 추가 (.env.local)
```
KAKAO_RELAY_TOKEN=         # 릴레이 서버 토큰 (자체 서버 사용 시)
KAKAO_RELAY_URL=           # 릴레이 서버 URL (자체 서버 사용 시)
KAKAO_ADMIN_SESSION=       # 사장님 카카오 세션 ID (페어링 완료 후)
KAKAO_DRIVER_SESSION=      # 기사 카카오 세션 ID (페어링 완료 후)
```

---

## 구현 순서

### Phase 1 - 카카오 알림 모듈 (lib/kakao/messages.ts)
- [ ] `sendKakaoMessage(sessionId, card)` 기본 함수 구현
- [ ] 각 이벤트별 카드 템플릿 구현 (TelegramMessages 대응)
- [ ] simpleText 폴백 처리 (카드 실패 시)

### Phase 2 - 통합 알림 레이어 (lib/notify.ts)
- [ ] `notify()` 함수로 Telegram + Kakao 동시 발송
- [ ] 각 채널 실패해도 다른 채널은 계속 발송
- [ ] 기존 API Route들에서 텔레그램 직접 호출 → notify()로 교체

### Phase 3 - API Route 연동
- [ ] `app/api/orders/[id]/approve/route.ts` 수정 (텔레그램 버그 수정 포함)
- [ ] `app/api/orders/[id]/confirm-payment/route.ts` 수정
- [ ] `app/api/deliveries/[id]/complete/route.ts` 수정

### Phase 4 - 테스트
- [ ] OpenClaw + 플러그인 로컬 실행
- [ ] 카카오톡 채널 페어링 (사장님, 기사 각각)
- [ ] 주문 플로우 E2E 테스트

---

## 카드 JSON 작성 규칙

카카오톡 카드는 JSON만 단독으로 전송해야 함. 텍스트와 섞으면 카드 변환 안 됨.

```typescript
// ✅ 올바름
return JSON.stringify({
  version: "2.0",
  template: { outputs: [{ listCard: { ... } }] }
})

// ❌ 잘못됨
return `주문이 들어왔습니다!\n${JSON.stringify(card)}`
```

버튼 라벨 최대 14자, 카드당 버튼 최대 3개.
이미지는 반드시 HTTPS 공개 URL (JPG/PNG).

---

## 참고: 기존 텔레그램 버그

`app/api/orders/[id]/approve/route.ts`에 텔레그램 알림 버그 존재.
Phase 3 작업 시 같이 수정할 것.
