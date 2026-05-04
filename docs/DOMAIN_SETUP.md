# 도메인 연결 가이드 — 골목상점.kr

> **상태**: 등록 대기 중
> **Punycode**: `xn--bb0bw4xzve3ni.kr`
> **연결 대상**: Railway 배포 (`kosamart-production.up.railway.app`)

---

## 1. 도메인 등록

### 가용성 확인 (사전)
- DNS 조회: `Non-existent domain` (등록 안 된 가능성 높음, 100% 확신은 등록사에서)
- 추천 등록사:
  - **가비아** https://www.gabia.com (제일 무난)
  - **후이즈** https://domain.whois.co.kr
  - **아이네임즈** https://www.inames.co.kr

### 검색 방법
검색창에 다음 중 하나 입력:
- `골목상점.kr` (한글 그대로)
- `xn--bb0bw4xzve3ni.kr` (Punycode)

### 비용 (참고)
- `.kr` 한글 도메인 1년: 약 25,000~30,000원
- 5년 일괄 결제 시 할인 가능

### 추천 부가 옵션
- `www.골목상점.kr` 도 함께 등록 (보통 무료)
- `골목상점.com` 도 함께 등록 권장 (해외 노출 대비, 보통 별도 비용)
- 자동 갱신 ON

---

## 2. Railway 커스텀 도메인 설정

### 단계
1. Railway Dashboard 접속 → 프로젝트 선택
2. 좌측 메뉴 → **Settings** → **Networking** (또는 Domains)
3. **Custom Domain** 섹션에서 `+ Custom Domain` 클릭
4. 다음 둘 다 추가:
   - `xn--bb0bw4xzve3ni.kr` (Punycode 권장 — 호환성 최대)
   - `www.xn--bb0bw4xzve3ni.kr`
   - 또는 `골목상점.kr` 입력해도 자동 변환됨
5. Railway가 표시하는 **CNAME 값** 복사 (예: `xxxxx.up.railway.app`)

### 결과
- SSL 인증서: Railway가 Let's Encrypt로 자동 발급 (5분~1시간)
- 두 도메인 모두 작동 (기존 `kosamart-production.up.railway.app` 도 유지)

---

## 3. DNS 설정 (등록사 사이트에서)

### 가비아 기준
1. 마이페이지 → 도메인 관리 → 해당 도메인 → DNS 정보
2. 다음 레코드 추가:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | (Railway가 알려준 CNAME 값) | 3600 |
| CNAME | www | (Railway가 알려준 CNAME 값) | 3600 |

> ⚠️ 일부 등록사는 루트(`@`) CNAME 미지원 → ALIAS 또는 ANAME 레코드 사용. 가비아는 지원함.

### DNS 전파 시간
- 보통 5분~1시간
- 최대 24~48시간 (TTL 따라)

### 확인 방법
```bash
# 한글 도메인은 Punycode로 조회
nslookup xn--bb0bw4xzve3ni.kr 8.8.8.8

# 또는 온라인 도구
# https://dnschecker.org/#CNAME/xn--bb0bw4xzve3ni.kr
```

---

## 4. 코드 측 변경 (필요 없음 ✅)

확인 결과 앱 코드는 전부 **상대 경로**를 사용 — 도메인 변경에 따른 코드 수정 불필요.

다만 다음 문서는 도메인 등록 후 갱신:
- [docs/HANDOFF.md](HANDOFF.md) — "예정" 표기 제거
- [KOSAMART_SPEC.md](../KOSAMART_SPEC.md) — 메인/백업 표기 정리

---

## 5. 한글 도메인 운영 시 주의

### Punycode 노출 케이스
일부 메신저/이메일에서 `xn--bb0bw4xzve3ni.kr` 처럼 노출됨. 대응 전략:

1. **카톡 공유 시**: 한글 그대로 보냄 → 카톡은 한글로 표시
2. **텔레그램·디스코드**: Punycode 노출 가능 → 한글 도메인 + 설명 함께 보냄
3. **이메일 본문**: HTML 메일 사용 시 한글로 표시, 일부 메일 클라이언트는 Punycode
4. **인쇄물**: 한글 그대로 인쇄 (전단지·명함·간판) — 가장 강력한 활용처

### 보안 주의
- IDN 사칭 공격 (예: `골목상점.kr` 처럼 보이는 다른 한글 도메인) 가능성 존재
- 정품 도메인 단속을 위해 자동 갱신 필수

---

## 6. 등록 완료 체크리스트

- [ ] 도메인 등록사에서 `골목상점.kr` 구매
- [ ] (권장) `www.골목상점.kr`, `골목상점.com` 추가 등록
- [ ] Railway Custom Domain 추가
- [ ] 등록사 DNS에 CNAME 등록
- [ ] 한글 주소로 접속 테스트 (Chrome / Edge / Safari)
- [ ] 모바일 카톡으로 링크 공유 테스트
- [ ] SSL 인증서 자동 발급 확인 (자물쇠 아이콘)
- [ ] 컨셉 페이퍼·매뉴얼 링크 정상 작동 확인
- [ ] [docs/HANDOFF.md](HANDOFF.md) "예정" → "운영 중" 변경
- [ ] 기존 Railway URL → 새 도메인으로 301 리다이렉트 검토 (선택)
