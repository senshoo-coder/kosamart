export const MANUAL_ADMIN_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>코사마트 관리자 매뉴얼</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f4f6f8;
  color: #1a1c1c;
  font-size: 15px;
  line-height: 1.6;
}

/* ── Header ── */
.header {
  background: linear-gradient(135deg, #2d6a4f 0%, #40916c 100%);
  color: white;
  padding: 18px 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.header h1 { font-size: 19px; font-weight: 700; }
.header p  { font-size: 12px; opacity: 0.85; margin-top: 2px; }
.btn-pdf {
  flex-shrink: 0;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.4);
  color: white;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-pdf:active { background: rgba(255,255,255,0.35); }
.btn-pdf.loading { opacity: 0.6; pointer-events: none; }

/* ── Tab bar ── */
.tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  flex: 0 0 auto;
  padding: 9px 16px;
  border: none;
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.8);
  border-radius: 10px 10px 0 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.tab.active { background: #f4f6f8; color: #2d6a4f; }

/* ── Content ── */
.content { display: none; padding-bottom: 80px; }
.content.active { display: block; }

/* ── Section card ── */
.section {
  background: white;
  margin: 12px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.section-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.section-header:active { background: #f9f9f9; }
.section-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.section-title { flex: 1; }
.section-title h2 { font-size: 15px; font-weight: 700; }
.section-title p  { font-size: 12px; color: #888; margin-top: 1px; }
.chevron { font-size: 12px; color: #bbb; transition: transform 0.2s; }
.section-header.open .chevron { transform: rotate(90deg); }
.section-body {
  display: none;
  padding: 0 16px 18px;
  border-top: 1px solid #f0f0f0;
}
.section-body.open { display: block; }

/* ── Steps ── */
.steps { list-style: none; padding: 12px 0 0; }
.steps li { display: flex; gap: 12px; margin-bottom: 14px; }
.step-num {
  flex-shrink: 0;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: #2d6a4f;
  color: white;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin-top: 1px;
}
.step-text { flex: 1; }
.step-text strong { color: #1a1c1c; font-weight: 700; display: block; }
.step-text p { color: #555; font-size: 14px; margin-top: 2px; }

/* ── Tips ── */
.tip  { background: #e8f5e9; border-left: 3px solid #40916c; color: #1b5e20; border-radius: 10px; padding: 11px 13px; margin: 10px 0; font-size: 14px; line-height: 1.55; }
.warn { background: #fff3e0; border-left: 3px solid #fb8c00; color: #7f3f00; border-radius: 10px; padding: 11px 13px; margin: 10px 0; font-size: 14px; line-height: 1.55; }
.info { background: #e3f2fd; border-left: 3px solid #1976d2; color: #0d3c70; border-radius: 10px; padding: 11px 13px; margin: 10px 0; font-size: 14px; line-height: 1.55; }

/* ── Badge ── */
.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 2px 2px; }
.badge-green  { background: #d4edda; color: #155724; }
.badge-blue   { background: #cce5ff; color: #004085; }
.badge-orange { background: #fff3cd; color: #856404; }
.badge-red    { background: #f8d7da; color: #721c24; }
.badge-gray   { background: #e2e3e5; color: #383d41; }

kbd { background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: monospace; }
hr  { border: none; border-top: 1px solid #f0f0f0; margin: 12px 0; }

/* ── Welcome card ── */
.welcome-card {
  background: linear-gradient(135deg, #2d6a4f, #52b788);
  color: white;
  border-radius: 14px;
  padding: 20px 18px;
  margin: 12px;
  box-shadow: 0 4px 12px rgba(45,106,79,0.25);
}
.welcome-card h2 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.welcome-card p  { font-size: 14px; opacity: 0.9; line-height: 1.5; }

/* ── Quick grid ── */
.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px; }
.quick-card {
  background: white; border-radius: 12px; padding: 14px;
  text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); cursor: pointer;
}
.quick-card .icon  { font-size: 28px; margin-bottom: 6px; }
.quick-card .label { font-size: 13px; font-weight: 600; }
.quick-card .sub   { font-size: 11px; color: #888; margin-top: 2px; }

/* ── Flow ── */
.flow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 12px 0; }
.flow-item { background: #e8f5e9; border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; color: #2d6a4f; white-space: nowrap; }
.flow-arrow { color: #bbb; font-size: 16px; }

/* ── Notif rows ── */
.notif-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.notif-row:last-child { border-bottom: none; }
.notif-emoji { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.notif-text strong { font-size: 14px; color: #1a1c1c; display: block; }
.notif-text span   { font-size: 13px; color: #666; }

/* ── FAQ ── */
.faq-item { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.faq-item:last-child { border-bottom: none; }
.faq-q { font-weight: 700; color: #2d6a4f; margin-bottom: 5px; font-size: 14px; }
.faq-q::before { content: "Q. "; }
.faq-a { font-size: 14px; color: #555; }
.faq-a::before { content: "A. "; color: #999; }

/* ══════════════════════════════════════
   PHONE MOCKUP SYSTEM
══════════════════════════════════════ */
.mockup-wrap {
  margin: 16px 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mockup-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}
.phone {
  width: 240px;
  background: #1a1a1a;
  border-radius: 30px;
  padding: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.22), 0 0 0 1px #333;
  position: relative;
}
.phone::before {
  content: '';
  display: block;
  width: 60px; height: 6px;
  background: #333;
  border-radius: 3px;
  margin: 0 auto 8px;
}
.phone-screen {
  background: #f7f9fb;
  border-radius: 20px;
  overflow: hidden;
  min-height: 380px;
}

/* ── Screen: top bar ── */
.s-topbar {
  background: #2d6a4f;
  color: white;
  padding: 10px 12px 8px;
  font-size: 13px;
  font-weight: 700;
}
.s-topbar-row { display: flex; align-items: center; justify-content: space-between; }
.s-topbar-sub { font-size: 10px; opacity: 0.8; font-weight: 400; margin-top: 1px; }

/* ── Screen: tab row ── */
.s-tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #eee;
}
.s-tab {
  flex: 1;
  text-align: center;
  padding: 7px 2px;
  font-size: 10px;
  font-weight: 600;
  color: #999;
  border-bottom: 2px solid transparent;
}
.s-tab.active { color: #2d6a4f; border-bottom-color: #2d6a4f; }

/* ── Screen: input field ── */
.s-input-group { padding: 8px 10px 0; }
.s-label { font-size: 9px; color: #888; margin-bottom: 2px; }
.s-input {
  background: #f4f6f8;
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 11px;
  color: #333;
  margin-bottom: 6px;
  border: 1px solid #eee;
}
.s-input.placeholder { color: #bbb; }

/* ── Screen: button ── */
.s-btn {
  margin: 6px 10px;
  background: #2d6a4f;
  color: white;
  border-radius: 10px;
  padding: 9px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
}
.s-btn-outline {
  margin: 4px 10px;
  border: 1px solid #2d6a4f;
  color: #2d6a4f;
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
}
.s-btn-orange {
  background: #e65100;
}
.s-btn-red {
  background: #c62828;
}
.s-btn-blue {
  background: #1565c0;
}

/* ── Screen: card ── */
.s-card {
  background: white;
  margin: 6px 8px;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.s-card-title { font-size: 12px; font-weight: 700; color: #1a1c1c; }
.s-card-sub   { font-size: 10px; color: #888; margin-top: 2px; }
.s-card-row   { display: flex; align-items: center; justify-content: space-between; }

/* ── Screen: badge ── */
.s-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
}
.s-badge-green  { background: #d4edda; color: #155724; }
.s-badge-gray   { background: #e2e3e5; color: #555; }
.s-badge-orange { background: #fff3cd; color: #7d5a00; }
.s-badge-blue   { background: #cce5ff; color: #004085; }
.s-badge-red    { background: #f8d7da; color: #721c24; }

/* ── Screen: section title ── */
.s-section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2d6a4f;
  padding: 8px 10px 4px;
}

/* ── Screen: product row ── */
.s-product {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid #f5f5f5;
}
.s-product-img {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: #e8f5e9;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.s-product-info { flex: 1; }
.s-product-name  { font-size: 11px; font-weight: 700; }
.s-product-price { font-size: 10px; color: #2d6a4f; font-weight: 700; margin-top: 1px; }
.s-qty-btn {
  background: #2d6a4f;
  color: white;
  border-radius: 6px;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
  flex-shrink: 0;
}

/* ── Screen: status bar ── */
.s-status-bar {
  display: flex;
  justify-content: space-around;
  padding: 8px 6px;
  border-bottom: 1px solid #f0f0f0;
  background: white;
}
.s-status-item { text-align: center; }
.s-status-dot  { width: 8px; height: 8px; border-radius: 50%; margin: 0 auto 3px; }
.s-status-text { font-size: 8px; color: #666; }

/* ── Screen: order row ── */
.s-order {
  padding: 8px 10px;
  border-bottom: 1px solid #f5f5f5;
}
.s-order-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
.s-order-num  { font-size: 10px; font-weight: 700; }
.s-order-addr { font-size: 9px; color: #888; }
.s-order-items { font-size: 9px; color: #555; margin-top: 2px; }

/* ── Screen: bottom nav ── */
.s-bottom-nav {
  display: flex;
  background: white;
  border-top: 1px solid #eee;
  padding: 6px 0 4px;
  margin-top: auto;
}
.s-nav-item {
  flex: 1;
  text-align: center;
  font-size: 9px;
  color: #aaa;
}
.s-nav-item.active { color: #2d6a4f; }
.s-nav-icon { font-size: 16px; display: block; margin-bottom: 1px; }

/* ── Screen: settings row ── */
.s-setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 10px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
}
.s-setting-label { color: #333; }
.s-setting-value { color: #2d6a4f; font-weight: 600; font-size: 10px; }
.s-toggle {
  width: 28px; height: 16px;
  border-radius: 8px;
  background: #2d6a4f;
  position: relative;
  flex-shrink: 0;
}
.s-toggle::after {
  content: '';
  position: absolute;
  right: 2px; top: 2px;
  width: 12px; height: 12px;
  background: white;
  border-radius: 50%;
}
.s-toggle.off { background: #ccc; }
.s-toggle.off::after { right: auto; left: 2px; }

/* ── Screen: delivery card ── */
.s-delivery {
  background: white;
  margin: 6px 8px;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border-left: 3px solid #2d6a4f;
}
.s-store-tag { font-size: 10px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px; }
.s-delivery-info { font-size: 10px; color: #555; line-height: 1.6; }
.s-delivery-addr { font-size: 11px; font-weight: 600; color: #1a1c1c; margin-top: 3px; }

/* ── Screen: admin row ── */
.s-admin-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #f5f5f5;
}
.s-admin-icon { font-size: 20px; flex-shrink: 0; }
.s-admin-label { font-size: 12px; font-weight: 600; }
.s-admin-sub   { font-size: 10px; color: #888; }
.s-chevron-r   { margin-left: auto; font-size: 12px; color: #ccc; }

/* ── Screen: divider text ── */
.s-divider {
  text-align: center;
  font-size: 9px;
  color: #bbb;
  padding: 4px 0;
}

/* ── Screen: link text ── */
.s-link { text-align: center; font-size: 9px; color: #2d6a4f; padding: 6px 0; font-weight: 600; }

/* ── Screen: amount row ── */
.s-amount-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 10px;
  font-size: 11px;
}
.s-amount-label { color: #666; }
.s-amount-value { font-weight: 700; color: #1a1c1c; }
.s-amount-total .s-amount-label { color: #1a1c1c; font-weight: 700; }
.s-amount-total .s-amount-value { color: #2d6a4f; font-size: 13px; }

/* ── Screen: photo placeholder ── */
.s-photo {
  background: #e8f5e9;
  border-radius: 8px;
  height: 60px;
  margin: 4px 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  color: #aaa;
}

/* ── Screen: memo input ── */
.s-memo {
  background: #f4f6f8;
  border-radius: 8px;
  margin: 4px 10px;
  padding: 7px 10px;
  font-size: 10px;
  color: #bbb;
  min-height: 40px;
}

/* ── Screen: time slot row ── */
.s-slots { display: flex; gap: 4px; padding: 4px 10px; flex-wrap: wrap; }
.s-slot {
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 3px 8px;
  font-size: 9px;
  color: #666;
}
.s-slot.active { background: #2d6a4f; color: white; border-color: #2d6a4f; }

/* ── Screen: welcome banner ── */
.s-welcome {
  background: linear-gradient(135deg, #2d6a4f, #52b788);
  color: white;
  padding: 12px;
  border-radius: 10px;
  margin: 6px 8px;
}
.s-welcome-title { font-size: 12px; font-weight: 700; }
.s-welcome-sub   { font-size: 10px; opacity: 0.85; margin-top: 2px; }

/* ── Screen: cart item ── */
.s-cart-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #f5f5f5;
}
.s-cart-name  { font-size: 11px; font-weight: 600; flex: 1; }
.s-cart-price { font-size: 11px; color: #2d6a4f; font-weight: 700; }
.s-cart-qty   { font-size: 10px; color: #888; display: block; margin-top: 1px; }

/* print */
@media print {
  .header, .tabs, .btn-pdf, .chevron, .quick-grid { display: none !important; }
  .content { display: block !important; padding: 0 !important; }
  .section-body { display: block !important; }
  .section { box-shadow: none; margin: 8px 0; }
  body { background: white; }
  .phone { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
}

@media (max-width: 360px) {
  .phone { width: 210px; }
}
</style>

<body>

<div class="header" style="background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);">
  <div class="header-top">
    <div>
      <h1>⚙️ 관리자 매뉴얼</h1>
      <p>관리자 전용 운영 가이드 &nbsp;·&nbsp; 최종 업데이트: 2026.04.24</p>
    </div>
    <button class="btn-pdf" id="btnPdf" onclick="downloadPDF()">⬇️ PDF</button>
  </div>
</div>

<div class="content active" style="display:block;">


  <div class="welcome-card" style="background: linear-gradient(135deg, #4a148c, #6a1b9a);">
    <h2>👋 관리자 매뉴얼이에요!</h2>
    <p>시스템 전반을 관리하는 역할이에요.</p>
  </div>

  <!-- 관리자 로그인 -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#f3e5f5">🔑</div>
      <div class="section-title"><h2>관리자 로그인</h2><p>관리자 탭에서 로그인해요</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <div class="mockup-wrap">
        <div class="mockup-label">📱 관리자 탭 선택 후 로그인</div>
        <div class="phone">
          <div class="phone-screen">
            <div class="s-topbar" style="text-align:center;padding:14px 12px 10px;background:linear-gradient(135deg,#4a148c,#6a1b9a);">
              <div style="font-size:20px;margin-bottom:4px">🛒</div>
              <div style="font-size:13px;font-weight:700">코사마트</div>
            </div>
            <div class="s-tabs">
              <div class="s-tab">🧑 고객</div>
              <div class="s-tab">🏪 사장님</div>
              <div class="s-tab">🚚 기사님</div>
              <div class="s-tab active">⚙️ 관리자</div>
            </div>
            <div style="padding:10px 10px 0;">
              <div class="s-label">아이디</div>
              <div class="s-input" style="color:#333;">admin</div>
              <div class="s-label">비밀번호</div>
              <div class="s-input placeholder">비밀번호 입력</div>
            </div>
            <div class="s-btn" style="background:#4a148c;">로그인</div>
          </div>
        </div>
      </div>
      <div class="warn">⚠️ 관리자 계정은 외부에 절대 공유하지 마세요!</div>
    </div>
  </div>

  <!-- 전체 주문 관리 -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#e8f5e9">📊</div>
      <div class="section-title"><h2>전체 주문 관리</h2><p>모든 가게의 주문을 한눈에 봐요</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <!-- 📱 관리자 주문 관리 -->
      <div class="mockup-wrap">
        <div class="mockup-label">📱 관리자 대시보드</div>
        <div class="phone">
          <div class="phone-screen">
            <div class="s-topbar" style="background:linear-gradient(135deg,#4a148c,#6a1b9a);">
              <div style="font-size:13px;font-weight:700">⚙️ 관리자 패널</div>
              <div class="s-topbar-sub">오늘 전체 주문: 5건</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px;">
              <div style="background:white;border-radius:10px;padding:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <div style="font-size:20px;font-weight:700;color:#2d6a4f;">5</div>
                <div style="font-size:9px;color:#888;">오늘 주문</div>
              </div>
              <div style="background:white;border-radius:10px;padding:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <div style="font-size:20px;font-weight:700;color:#e65100;">2</div>
                <div style="font-size:9px;color:#888;">배달 대기</div>
              </div>
              <div style="background:white;border-radius:10px;padding:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <div style="font-size:20px;font-weight:700;color:#1976d2;">1</div>
                <div style="font-size:9px;color:#888;">배달 중</div>
              </div>
              <div style="background:white;border-radius:10px;padding:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <div style="font-size:20px;font-weight:700;color:#4a148c;">2</div>
                <div style="font-size:9px;color:#888;">완료</div>
              </div>
            </div>
            <div class="s-admin-row">
              <div class="s-admin-icon">📋</div>
              <div><div class="s-admin-label">전체 주문 관리</div><div class="s-admin-sub">주문 상태 변경·취소 처리</div></div>
              <div class="s-chevron-r">▶</div>
            </div>
            <div class="s-admin-row">
              <div class="s-admin-icon">👥</div>
              <div><div class="s-admin-label">사용자 관리</div><div class="s-admin-sub">계정 생성·비번 재설정</div></div>
              <div class="s-chevron-r">▶</div>
            </div>
            <div class="s-admin-row">
              <div class="s-admin-icon">🏬</div>
              <div><div class="s-admin-label">가게 설정</div><div class="s-admin-sub">영업시간·텔레그램 Chat ID</div></div>
              <div class="s-chevron-r">▶</div>
            </div>
          </div>
        </div>
      </div>

      <ul class="steps">
        <li><div class="step-num">1</div><div class="step-text"><strong>대시보드에서 오늘 주문 현황 확인</strong><p>접수/배달중/완료/대기 건수를 한눈에 볼 수 있어요.</p></div></li>
        <li><div class="step-num">2</div><div class="step-text"><strong>전체 주문 관리 → 주문 상세 확인·처리</strong><p>모든 가게의 주문을 직접 상태 변경할 수 있어요.</p></div></li>
      </ul>
    </div>
  </div>

  <!-- 사용자 관리 -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#e3f2fd">👥</div>
      <div class="section-title"><h2>사용자 관리</h2><p>고객·사장님·기사님 계정을 관리해요</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <!-- 📱 사용자 관리 -->
      <div class="mockup-wrap">
        <div class="mockup-label">📱 사용자 관리 화면</div>
        <div class="phone">
          <div class="phone-screen">
            <div class="s-topbar" style="background:linear-gradient(135deg,#4a148c,#6a1b9a);">
              <div class="s-topbar-row"><span>← 뒤로</span><span>사용자 관리</span><span>+ 추가</span></div>
            </div>
            <div class="s-tabs" style="font-size:9px;">
              <div class="s-tab active" style="font-size:10px;">전체</div>
              <div class="s-tab" style="font-size:10px;">고객</div>
              <div class="s-tab" style="font-size:10px;">사장님</div>
              <div class="s-tab" style="font-size:10px;">기사님</div>
            </div>
            <div style="padding:4px 0;">
              <div class="s-admin-row">
                <div style="width:32px;height:32px;background:#e8f5e9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🏪</div>
                <div>
                  <div class="s-admin-label">banchanjip</div>
                  <div class="s-admin-sub">사장님 · 반찬가게 · 활성</div>
                </div>
                <span class="s-badge s-badge-green" style="font-size:8px">활성</span>
              </div>
              <div class="s-admin-row">
                <div style="width:32px;height:32px;background:#e3f2fd;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🚚</div>
                <div>
                  <div class="s-admin-label">driver01</div>
                  <div class="s-admin-sub">기사님 · 김배달 · 활성</div>
                </div>
                <span class="s-badge s-badge-green" style="font-size:8px">활성</span>
              </div>
              <div class="s-admin-row">
                <div style="width:32px;height:32px;background:#f3e5f5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🧑</div>
                <div>
                  <div class="s-admin-label">user_hong</div>
                  <div class="s-admin-sub">고객 · kakao_user1 · 활성</div>
                </div>
                <span class="s-badge s-badge-green" style="font-size:8px">활성</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul class="steps">
        <li><div class="step-num">1</div><div class="step-text"><strong>사용자 목록 확인</strong><p>역할별 탭으로 필터링해서 볼 수 있어요.</p></div></li>
        <li><div class="step-num">2</div><div class="step-text"><strong>오른쪽 상단 <kbd>+ 추가</kbd>로 신규 계정 생성</strong><p>사장님이나 기사님 계정을 직접 만들어 줄 수 있어요.</p></div></li>
        <li><div class="step-num">3</div><div class="step-text"><strong>계정 탭 → 비밀번호 재설정·상태 변경</strong></div></li>
      </ul>
    </div>
  </div>

  <!-- 가게 설정 관리 -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#fff3e0">🏬</div>
      <div class="section-title"><h2>가게 설정 관리</h2><p>각 가게의 상세 설정을 관리해요</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <!-- 📱 가게 설정 (관리자) -->
      <div class="mockup-wrap">
        <div class="mockup-label">📱 관리자 가게 설정 (Chat ID 포함)</div>
        <div class="phone">
          <div class="phone-screen">
            <div class="s-topbar" style="background:linear-gradient(135deg,#4a148c,#6a1b9a);">
              <div class="s-topbar-row"><span>← 뒤로</span><span>🥗 반찬가게 설정</span><span></span></div>
            </div>
            <div class="s-section-title">운영 설정</div>
            <div class="s-setting-row">
              <div class="s-setting-label">영업 상태</div>
              <div class="s-toggle"></div>
            </div>
            <div class="s-setting-row">
              <div class="s-setting-label">영업 시간</div>
              <div class="s-setting-value">09:00-20:00</div>
            </div>
            <div class="s-setting-row">
              <div class="s-setting-label">주간 휴무</div>
              <div class="s-setting-value">일요일</div>
            </div>
            <div class="s-setting-row">
              <div class="s-setting-label">배달비</div>
              <div class="s-setting-value">2,000원</div>
            </div>
            <div class="s-section-title" style="color:#7c3aed;">텔레그램 알림 (관리자 전용)</div>
            <div class="s-setting-row">
              <div>
                <div class="s-setting-label">텔레그램 Chat ID</div>
                <div style="font-size:9px;color:#aaa;">가게 그룹 채팅방의 ID</div>
              </div>
            </div>
            <div class="s-input" style="margin:0 10px 4px;font-size:11px;color:#333;">-5210586190</div>
            <div class="s-btn" style="background:#4a148c;margin-top:10px">저장하기</div>
          </div>
        </div>
      </div>

      <ul class="steps">
        <li><div class="step-num">1</div><div class="step-text"><strong>가게 설정에서 모든 항목 수정 가능</strong><p>영업시간, 배달비, 공지사항, 휴무일 등을 직접 설정할 수 있어요.</p></div></li>
        <li><div class="step-num">2</div><div class="step-text"><strong>텔레그램 Chat ID 입력 (관리자 전용)</strong><p>각 가게의 텔레그램 그룹 Chat ID를 입력하면, 배달 이벤트마다 그 그룹으로 알림이 가요.</p></div></li>
      </ul>
      <div class="info">ℹ️ Chat ID는 관리자 화면에서만 보여요. 사장님 화면에는 표시되지 않아요.</div>
    </div>
  </div>

  <!-- 텔레그램 설정 -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#e8eaf6">📱</div>
      <div class="section-title"><h2>텔레그램 알림 설정</h2><p>가게별 그룹 Chat ID 등록 방법</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <div class="tip">💡 배달 이벤트마다 <b>관리자 그룹</b>과 <b>해당 가게 그룹</b> 양쪽으로 알림이 가요!</div>
      <ul class="steps">
        <li><div class="step-num">1</div><div class="step-text"><strong>텔레그램에서 새 그룹 생성</strong><p>텔레그램 앱에서 새 그룹을 만들고, 코사마트 봇과 사장님을 초대해요.</p></div></li>
        <li><div class="step-num">2</div><div class="step-text"><strong>그룹에서 메시지를 보낸 후 Chat ID 확인</strong><p>봇에게 /getUpdates 요청을 보내거나, 봇이 메시지를 받으면 chat_id가 확인돼요.<br>그룹 Chat ID는 <kbd>-521XXXXXXX</kbd> 처럼 음수예요.</p></div></li>
        <li><div class="step-num">3</div><div class="step-text"><strong>관리자 → 가게 설정 → Chat ID 입력 후 저장</strong></div></li>
      </ul>
      <hr>
      <div class="notif-row"><span class="notif-emoji">📋</span><div class="notif-text"><strong>배달 배정</strong><span>기사 이름, 주문번호, 주문자, 주소 포함</span></div></div>
      <div class="notif-row"><span class="notif-emoji">🚚</span><div class="notif-text"><strong>배달 출발 (픽업)</strong><span>주문자, 배달 주소 포함</span></div></div>
      <div class="notif-row"><span class="notif-emoji">✅</span><div class="notif-text"><strong>배달 완료</strong><span>주문번호, 금액, 기사 메모 포함</span></div></div>
      <div class="notif-row"><span class="notif-emoji">❌</span><div class="notif-text"><strong>배달 실패</strong><span>주문번호, 실패 사유 포함</span></div></div>
    </div>
  </div>

  <!-- 상품 관리 (관리자) -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#e0f2fe">📦</div>
      <div class="section-title"><h2>상품 관리 / 순서 변경</h2><p>각 가게 및 공구 상품을 관리해요</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <div class="info">ℹ️ 관리자는 <b>모든 가게의 상품</b>과 <b>공구 상품</b>을 관리할 수 있어요.</div>
      <ul class="steps">
        <li><div class="step-num">1</div><div class="step-text"><strong>가게별 상품 관리</strong><p>가게 관리 → 해당 가게 → 상품 목록. ▲▼ 버튼으로 순서 조정 가능.</p></div></li>
        <li><div class="step-num">2</div><div class="step-text"><strong>공구 상품 관리</strong><p>공구 상품 페이지에서 ▲▼ 버튼으로 순서를 바꿀 수 있어요.</p></div></li>
      </ul>
      <div class="tip">💡 사장님 계정은 본인 가게 상품만 수정 가능하고, 타 가게 상품은 읽기·수정 모두 차단돼요. (API 레벨에서 store_id 검증)</div>
    </div>
  </div>

  <!-- 보안 및 개인정보 -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#fce4ec">🔒</div>
      <div class="section-title"><h2>보안 및 개인정보 보호</h2><p>시스템 보안 정책 요약</p></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <div class="warn">⚠️ 관리자 계정 정보는 절대 외부에 공유하지 마세요. 계정 탈취 시 전체 주문 데이터에 접근 가능해요.</div>

      <div style="padding:8px 0;">
        <div class="notif-row"><span class="notif-emoji">🔑</span><div class="notif-text"><strong>역할 기반 접근 제어</strong><span>고객·사장님·기사님·관리자 역할별로 접근 가능한 기능이 엄격히 제한돼요. 타인의 주문 조회·수정이 불가능해요.</span></div></div>
        <div class="notif-row"><span class="notif-emoji">🏪</span><div class="notif-text"><strong>사장님 가게 경계</strong><span>사장님은 본인 가게의 주문/상품만 처리할 수 있어요. 주문 승인·거부·픽업완료·상품 수정 시 store_id를 서버에서 검증합니다.</span></div></div>
        <div class="notif-row"><span class="notif-emoji">🍪</span><div class="notif-text"><strong>보안 쿠키 인증</strong><span>로그인 정보는 httpOnly·Secure 쿠키로 저장돼요. JavaScript로 접근하거나 중간에서 가로채기가 불가능해요.</span></div></div>
        <div class="notif-row"><span class="notif-emoji">📁</span><div class="notif-text"><strong>파일 업로드 제한</strong><span>이미지 업로드는 JPEG·PNG·WebP·GIF 형식만 허용되고, 파일 크기는 10MB 이하로 제한돼요.</span></div></div>
        <div class="notif-row"><span class="notif-emoji">💰</span><div class="notif-text"><strong>입력값 검증</strong><span>가격·재고 등 숫자 필드는 음수 입력을 차단합니다.</span></div></div>
        <div class="notif-row"><span class="notif-emoji">🤖</span><div class="notif-text"><strong>웹훅 보안</strong><span>텔레그램 알림 웹훅은 비밀 키(WEBHOOK_SECRET)로 인증돼요. 외부에서 위조 요청을 보낼 수 없어요.</span></div></div>
        <div class="notif-row"><span class="notif-emoji">👤</span><div class="notif-text"><strong>개인정보 자동 파기</strong><span>고객의 전화번호·주소·닉네임 등 개인정보는 일정 기간 후 자동 익명화돼요 (PII 자동 purge 정책).</span></div></div>
      </div>

      <ul class="steps">
        <li><div class="step-num">1</div><div class="step-text"><strong>비밀번호 재설정은 관리자가 직접 처리</strong><p>사용자 관리 화면에서 특정 계정의 비밀번호를 재설정할 수 있어요.</p></div></li>
        <li><div class="step-num">2</div><div class="step-text"><strong>계정 정지(suspended) 기능 활용</strong><p>비정상 행동이 감지되면 계정을 정지 처리해 로그인을 막을 수 있어요.</p></div></li>
        <li><div class="step-num">3</div><div class="step-text"><strong>WEBHOOK_SECRET 환경변수 설정 권장</strong><p>Railway 환경변수에 WEBHOOK_SECRET을 설정하면 웹훅 위조 공격을 방어해요.</p></div></li>
      </ul>
    </div>
  </div>

  <!-- 관리자 FAQ -->
  <div class="section">
    <div class="section-header" onclick="toggleSection(this)">
      <div class="section-icon" style="background:#f3e5f5">❓</div>
      <div class="section-title"><h2>자주 묻는 질문</h2></div>
      <span class="chevron">▶</span>
    </div>
    <div class="section-body">
      <div class="faq-item"><div class="faq-q">텔레그램 알림이 안 와요</div><div class="faq-a">Chat ID가 올바르게 입력됐는지, 봇이 그룹에 초대됐는지 확인하세요. 봇은 메시지 전송 권한이 있어야 해요.</div></div>
      <div class="faq-item"><div class="faq-q">사장님이 영업시간 설정했는데 반영이 안 돼요</div><div class="faq-a">저장 후 새로고침을 해보세요. 형식이 맞아야 해요: HH:MM-HH:MM</div></div>
      <div class="faq-item"><div class="faq-q">새 가게를 추가하고 싶어요</div><div class="faq-a">관리자 화면 또는 Supabase 관리 패널에서 신규 가게를 등록할 수 있어요.</div></div>
      <div class="faq-item"><div class="faq-q">주문 상태를 직접 수정하고 싶어요</div><div class="faq-a">관리자 주문 상세 화면에서 상태를 직접 변경할 수 있어요.</div></div>
      <div class="faq-item"><div class="faq-q">WEBHOOK_SECRET은 어떻게 설정하나요?</div><div class="faq-a">Railway 대시보드 → Variables → WEBHOOK_SECRET에 임의의 긴 문자열을 입력하면 돼요. DB 트리거 설정 시 x-webhook-secret 헤더에 같은 값을 넣어야 해요.</div></div>
    </div>
  </div>

</div>
<script>
function toggleSection(header) {
  const body = header.nextElementSibling;
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  header.classList.toggle('open', !open);
}

function downloadPDF() {
  const btn = document.getElementById('btnPdf');
  btn.classList.add('loading');
  btn.textContent = '생성 중...';

  document.querySelectorAll('.section-body').forEach(b => b.classList.add('open'));
  document.querySelectorAll('.section-header').forEach(h => h.classList.add('open'));

  document.title = '코사마트 관리자 매뉴얼';

  setTimeout(() => {
    window.print();
    btn.classList.remove('loading');
    btn.innerHTML = '⬇️ PDF';
  }, 300);
}
</script>

<style>
@media print {
  .header, .btn-pdf, .quick-grid, .tabs { display: none !important; }
  body { background: white; }
  .content { display: block !important; padding: 0 !important; }
  .section-body { display: block !important; border-top: 1px solid #eee; }
  .section { box-shadow: none; border: 1px solid #eee; page-break-inside: avoid; }
  .mockup-wrap { page-break-inside: avoid; }
  .phone { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .welcome-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .s-topbar, .s-btn, .s-badge, .s-delivery, .s-welcome { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</body>
</html>
`
