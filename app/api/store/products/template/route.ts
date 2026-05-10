import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// GET /api/store/products/template
// 사장님·관리자용 상품 일괄 등록 엑셀 템플릿 다운로드

export async function GET() {
  // 헤더 + 예시 2행
  const data = [
    {
      상품명: '한우 등심 ++ 100g',
      가격: 20000,
      단위: '100g',
      카테고리: '한우',
      설명: '1++ 등급 한우 등심',
      이모지: '🥩',
      정가: '',
      인기상품: 'N',
    },
    {
      상품명: '국산 참기름 350ml',
      가격: 39000,
      단위: '병',
      카테고리: '동영방앗간',
      설명: '국산 참깨 100%',
      이모지: '🫒',
      정가: 45000,
      인기상품: 'Y',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(data, {
    header: ['상품명', '가격', '단위', '카테고리', '설명', '이모지', '정가', '인기상품'],
  })

  // 컬럼 너비 보기 좋게
  ws['!cols'] = [
    { wch: 30 }, // 상품명
    { wch: 10 }, // 가격
    { wch: 8 },  // 단위
    { wch: 14 }, // 카테고리
    { wch: 30 }, // 설명
    { wch: 8 },  // 이모지
    { wch: 10 }, // 정가
    { wch: 10 }, // 인기상품
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '상품 일괄 등록')

  // 안내 시트 추가
  const infoData = [
    ['항목',         '필수',  '설명'],
    ['상품명',       '필수',  '예) "한우 등심 100g". 100자 이내. 이미 같은 이름이 있으면 건너뜁니다.'],
    ['가격',         '필수',  '숫자만. 단위는 원. 예) 20000'],
    ['단위',         '선택',  '예) 100g, 1팩, 1병. 비우면 "개"'],
    ['카테고리',     '선택',  '가게 안에서 묶어서 보여주는 그룹. 예) 한우, 한돈, 보성농협'],
    ['설명',         '선택',  '500자 이내. 고객 화면에 작은 회색 글씨로 표시'],
    ['이모지',       '선택',  '예) 🥩 🥬 🍞. 비우면 "📦"'],
    ['정가',         '선택',  '할인 전 가격. 입력하면 자동으로 할인율 계산되어 빨간 뱃지로 표시'],
    ['인기상품',     '선택',  'Y/N. Y이면 인기 뱃지 표시'],
    ['',             '',      ''],
    ['※ 첫 행(헤더)은 그대로 두고, 두 번째 행부터 데이터를 입력하세요.'],
    ['※ 한 번에 최대 500개까지 등록 가능합니다.'],
    ['※ 이미 같은 이름의 상품이 있으면 자동 건너뜁니다 (안전).'],
    ['※ 이미지는 등록 후 가게 화면에서 개별 업로드 (이 양식에 URL 컬럼 없음).'],
  ]
  const infoWs = XLSX.utils.aoa_to_sheet(infoData)
  infoWs['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, infoWs, '작성 안내')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="kosamart-products-template.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
