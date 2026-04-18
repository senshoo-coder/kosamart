export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <div className="max-w-2xl mx-auto px-5 py-8 pb-20">
        <h1 className="text-[20px] font-bold text-[#1a1c1c] mb-1">개인정보처리방침</h1>
        <p className="text-[12px] text-[#a3a3a3] mb-8">시행일: 2025년 1월 1일 · 최종 수정: 2026년 4월 18일</p>

        <Section title="1. 수집하는 개인정보 항목">
          <Table rows={[
            ['닉네임(카카오)', '주문자 식별 및 배달 안내', '필수'],
            ['휴대폰 번호', '배달 연락 및 주문 확인', '필수'],
            ['배달 주소', '배달 서비스 제공', '조건부 필수'],
            ['기기 고유 ID (UUID)', '서비스 이용 식별', '자동 수집'],
            ['주문 내역', '서비스 제공 및 분쟁 해결', '자동 수집'],
          ]} />
          <Note>매장 픽업 선택 시 배달 주소는 수집하지 않습니다.</Note>
        </Section>

        <Section title="2. 개인정보 수집 및 이용 목적">
          <List items={[
            '주문 접수 및 처리',
            '배달 서비스 제공 (배달 기사에게 주소·연락처 제공)',
            '가게 사장님에게 주문 내역 전달',
            '주문 현황 안내 및 고객 문의 응대',
            '부정 이용 방지 및 분쟁 해결',
          ]} />
        </Section>

        <Section title="3. 개인정보 보유 및 이용 기간">
          <Table rows={[
            ['주문·거래 기록', '전자상거래법 제6조', '5년'],
            ['배달 주소', '배달 완료 후', '즉시 목적 외 사용 중단'],
            ['기기 ID', '서비스 탈퇴 또는 1년 미이용 시', '삭제'],
          ]} />
          <Note>단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</Note>
        </Section>

        <Section title="4. 개인정보 제3자 제공">
          <p className="text-[13px] text-[#3c4a42] leading-relaxed mb-3">
            서비스 제공을 위해 아래의 경우 개인정보를 제3자에게 제공합니다.
          </p>
          <Table rows={[
            ['배달 기사', '주문자명, 연락처, 배달 주소', '배달 완료 시까지'],
            ['가게 사장님', '주문자명, 주문 내역, 배달 주소', '주문 처리 완료 시까지'],
            ['운영팀 (내부)', '주문 전체 내역', '분쟁 해결 및 서비스 운영 목적'],
          ]} />
          <Note>위 경우 외에는 정보주체의 동의 없이 제3자에게 개인정보를 제공하지 않습니다.</Note>
        </Section>

        <Section title="5. 개인정보 처리 위탁">
          <p className="text-[13px] text-[#3c4a42] leading-relaxed">
            현재 개인정보 처리 업무를 외부에 위탁하지 않습니다. 향후 위탁 시 본 방침을 통해 공지합니다.
          </p>
        </Section>

        <Section title="6. 정보주체의 권리">
          <List items={[
            '개인정보 열람·정정·삭제·처리정지 요청 권리',
            '동의 철회 권리 (단, 진행 중인 주문은 처리 완료 후 적용)',
          ]} />
          <p className="text-[13px] text-[#3c4a42] mt-2">
            요청은 카카오 오픈채팅 또는 아파트 관리사무소를 통해 운영자에게 문의해 주세요.
          </p>
        </Section>

        <Section title="7. 자동 수집 항목 (기기 ID)">
          <p className="text-[13px] text-[#3c4a42] leading-relaxed">
            별도의 회원가입 없이 서비스를 이용할 수 있도록 기기 고유 ID(UUID)를 브라우저에 자동 생성·저장합니다.
            이 값은 개인을 직접 식별하지 않으며, 기기 초기화 또는 브라우저 데이터 삭제 시 새로 발급됩니다.
          </p>
        </Section>

        <Section title="8. 개인정보 보호책임자">
          <p className="text-[13px] text-[#3c4a42] leading-relaxed">
            서비스명: 코사마트 상점가<br />
            문의: 카카오 오픈채팅 또는 아파트 관리사무소 경유<br />
            <span className="text-[11px] text-[#a3a3a3]">* 개인정보 관련 불만·피해 신고는 개인정보보호위원회(privacy.go.kr) 또는 한국인터넷진흥원(118)에 접수할 수 있습니다.</span>
          </p>
        </Section>

        <div className="mt-8 p-4 bg-[#f0fdf8] border border-[#d1fae5] rounded-[12px]">
          <p className="text-[11px] text-[#3c4a42] leading-relaxed">
            본 방침은 개인정보보호법 제30조에 따라 작성되었으며, 내용 변경 시 서비스 공지를 통해 안내합니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-[15px] font-bold text-[#1a1c1c] mb-3 pb-2 border-b border-[#e8e8e8]">{title}</h2>
      {children}
    </div>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[13px] text-[#3c4a42]">
          <span className="text-[#10b981] mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#f2f4f6]">
            {['항목', '목적/제공 내용', '기간/조건'].map(h => (
              <th key={h} className="text-left px-3 py-2 text-[#3c4a42] font-semibold first:rounded-l-lg last:rounded-r-lg">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c], i) => (
            <tr key={i} className="border-b border-[#f2f4f6]">
              <td className="px-3 py-2 text-[#1a1c1c] font-medium">{a}</td>
              <td className="px-3 py-2 text-[#3c4a42]">{b}</td>
              <td className="px-3 py-2 text-[#3c4a42]">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-[#a3a3a3] mt-1.5 leading-relaxed">{children}</p>
  )
}
