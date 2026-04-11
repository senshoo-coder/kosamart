// 평창동 상점가 정적 데이터

export interface StoreProduct {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  discountRate?: number
  unit: string
  emoji: string
  subcategory?: string
  isAvailable: boolean
  isPopular?: boolean
  tag?: string
}

export interface Store {
  id: string
  name: string
  emoji: string
  category: string
  description: string
  isOpen: boolean
  badge?: string
  hours?: string
  minOrder: number
  deliveryFee: number
  accentColor: string
  subcategories?: string[]
  products: StoreProduct[]
}

export const STORES: Store[] = [
  {
    id: 'central-super',
    name: '중앙슈퍼',
    emoji: '🛒',
    category: '편의점·슈퍼',
    description: '생필품부터 신선식품까지 한 번에',
    isOpen: true,
    badge: '단골',
    hours: '07:00~22:00',
    minOrder: 10000,
    deliveryFee: 0,
    accentColor: '#10B981',
    subcategories: ['식품', '음료', '생활용품'],
    products: [
      { id: 'cs-1', name: '국내산 계란 30구', description: '신선한 무항생제 계란', price: 9800, originalPrice: 12000, discountRate: 18, unit: '판', emoji: '🥚', subcategory: '식품', isAvailable: true, isPopular: true },
      { id: 'cs-2', name: '우유 1L', description: '서울우유 전지분유', price: 2800, unit: '개', emoji: '🥛', subcategory: '음료', isAvailable: true },
      { id: 'cs-3', name: '두부 (국산콩)', description: '부드러운 순두부', price: 2500, unit: '개', emoji: '⬜', subcategory: '식품', isAvailable: true },
      { id: 'cs-4', name: '참기름 320ml', description: '들기름 100% 착유', price: 8900, originalPrice: 11000, discountRate: 19, unit: '병', emoji: '🫙', subcategory: '식품', isAvailable: true },
      { id: 'cs-5', name: '간장 1.8L', description: '양조간장 진한맛', price: 5500, unit: '병', emoji: '🍶', subcategory: '식품', isAvailable: true },
      { id: 'cs-6', name: '라면 5개입', description: '신라면 멀티팩', price: 4200, originalPrice: 5000, discountRate: 16, unit: '봉', emoji: '🍜', subcategory: '식품', isAvailable: true, isPopular: true },
      { id: 'cs-7', name: '휴지 30롤', description: '더블 3겹 부드러운', price: 12900, unit: '묶음', emoji: '🧻', subcategory: '생활용품', isAvailable: true },
      { id: 'cs-8', name: '쌀 10kg', description: '경기 이천 햅쌀', price: 38000, unit: '포대', emoji: '🌾', subcategory: '식품', isAvailable: false, tag: '품절' },
    ],
  },
  {
    id: 'banchan',
    name: '반찬가게',
    emoji: '🥡',
    category: '반찬·가정식',
    description: '매일 아침 직접 만드는 손반찬',
    isOpen: true,
    badge: '오늘의 추천',
    hours: '08:00~19:00',
    minOrder: 15000,
    deliveryFee: 0,
    accentColor: '#F59E0B',
    subcategories: ['나물·무침', '볶음·조림', '국·찌개'],
    products: [
      { id: 'bc-1', name: '시금치 나물', description: '국내산 참기름 무침', price: 5000, unit: '200g', emoji: '🌿', subcategory: '나물·무침', isAvailable: true, isPopular: true },
      { id: 'bc-2', name: '도라지 무침', description: '껍질 벗긴 통도라지', price: 6000, unit: '200g', emoji: '🥗', subcategory: '나물·무침', isAvailable: true },
      { id: 'bc-3', name: '참나물 무침', description: '향긋한 제철 참나물', price: 5500, unit: '150g', emoji: '🥬', subcategory: '나물·무침', isAvailable: true, isPopular: true },
      { id: 'bc-4', name: '궁중 떡볶이', description: '간장 베이스 궁중식', price: 8000, unit: '250g', emoji: '🍱', subcategory: '볶음·조림', isAvailable: true },
      { id: 'bc-5', name: '소불고기', description: '양념 숙성 소불고기', price: 12000, originalPrice: 15000, discountRate: 20, unit: '200g', emoji: '🥩', subcategory: '볶음·조림', isAvailable: true, isPopular: true },
      { id: 'bc-6', name: '김치찌개용 묵은지', description: '2년 숙성 묵은지', price: 9000, unit: '500g', emoji: '🌶️', subcategory: '국·찌개', isAvailable: true },
      { id: 'bc-7', name: '잡채', description: '당면·버섯·야채 잡채', price: 10000, unit: '300g', emoji: '🍝', subcategory: '볶음·조림', isAvailable: true },
      { id: 'bc-8', name: '계란말이', description: '촉촉한 두툼 계란말이', price: 7000, unit: '200g', emoji: '🍳', subcategory: '볶음·조림', isAvailable: false, tag: '품절' },
    ],
  },
  {
    id: 'butcher',
    name: '정육마스터 김사장',
    emoji: '🥩',
    category: '정육·축산',
    description: '30년 경력의 정육 기술로 매일 아침마다 가장 신선한 품질의 고기만을 엄선하여 제공합니다.',
    isOpen: true,
    badge: 'PREMIUM',
    hours: '09:00~18:00',
    minOrder: 15000,
    deliveryFee: 3000,
    accentColor: '#10b981',
    subcategories: ['소고기', '돼지고기', '양념육', '선물세트'],
    products: [
      { id: 'bt-1', name: '[1++등급] 한우 채끝 스테이크 200g', description: '마블링 최상급 채끝 스테이크', price: 22400, originalPrice: 28000, discountRate: 20, unit: '팩', emoji: '🥩', subcategory: '소고기', isAvailable: true, isPopular: true },
      { id: 'bt-2', name: '무항생제 한돈 삼겹살 구이용 500g', description: '두껍게 썬 생삼겹살 구이용', price: 15300, originalPrice: 18000, discountRate: 15, unit: '팩', emoji: '🐷', subcategory: '돼지고기', isAvailable: true, isPopular: true },
      { id: 'bt-3', name: '정육마스터 특제 소불고기 400g', description: '24시간 숙성 양념 소불고기', price: 13500, originalPrice: 15000, discountRate: 10, unit: '팩', emoji: '🍖', subcategory: '양념육', isAvailable: true },
      { id: 'bt-4', name: '한우 앞지 국거리용 300g', description: '1++ 한우 사골 국거리', price: 24000, unit: '팩', emoji: '🥩', subcategory: '소고기', isAvailable: true },
      { id: 'bt-5', name: '닭볶음탕용 토막', description: '국내산 냉장 닭', price: 8500, unit: '1kg', emoji: '🐔', subcategory: '돼지고기', isAvailable: true },
      { id: 'bt-6', name: '한우 선물세트 (등심+안심)', description: '명절 선물용 프리미엄 한우 세트', price: 98000, originalPrice: 120000, discountRate: 18, unit: '세트', emoji: '🎁', subcategory: '선물세트', isAvailable: true, tag: '추천' },
    ],
  },
  {
    id: 'bonjuk',
    name: '본죽',
    emoji: '🍲',
    category: '죽·분식',
    description: '건강한 한 끼, 든든한 보양식',
    isOpen: true,
    badge: '따뜻하게',
    hours: '08:00~20:00',
    minOrder: 8000,
    deliveryFee: 2000,
    accentColor: '#8B5CF6',
    subcategories: ['해물죽', '소고기죽', '야채죽'],
    products: [
      { id: 'bj-1', name: '전복죽', description: '자연산 전복 듬뿍', price: 12000, originalPrice: 14000, discountRate: 14, unit: '1인분', emoji: '🦪', subcategory: '해물죽', isAvailable: true, isPopular: true },
      { id: 'bj-2', name: '낙지죽', description: '쫄깃한 낙지가 가득', price: 11000, unit: '1인분', emoji: '🐙', subcategory: '해물죽', isAvailable: true },
      { id: 'bj-3', name: '야채죽', description: '부드럽고 담백한 영양죽', price: 8000, unit: '1인분', emoji: '🥣', subcategory: '야채죽', isAvailable: true },
      { id: 'bj-4', name: '소고기죽', description: '한우 안심 찹쌀죽', price: 10000, unit: '1인분', emoji: '🍲', subcategory: '소고기죽', isAvailable: true, isPopular: true },
      { id: 'bj-5', name: '참치마요죽', description: '고소한 참치마요', price: 9000, unit: '1인분', emoji: '🐟', subcategory: '해물죽', isAvailable: true },
      { id: 'bj-6', name: '단호박죽', description: '달콤한 단호박 영양죽', price: 9000, unit: '1인분', emoji: '🎃', subcategory: '야채죽', isAvailable: true },
    ],
  },
  {
    id: 'chicken',
    name: '치킨',
    emoji: '🍗',
    category: '치킨·튀김',
    description: '바삭하고 촉촉한 평창동 대표 치킨',
    isOpen: true,
    badge: '인기',
    hours: '11:00~23:00',
    minOrder: 18000,
    deliveryFee: 0,
    accentColor: '#F97316',
    subcategories: ['통닭', '순살', '사이드'],
    products: [
      { id: 'ck-1', name: '후라이드 치킨 한 마리', description: '바삭한 황금 후라이드', price: 18000, unit: '마리', emoji: '🍗', subcategory: '통닭', isAvailable: true, isPopular: true },
      { id: 'ck-2', name: '양념 치킨 한 마리', description: '달콤 매콤 양념치킨', price: 19000, unit: '마리', emoji: '🍗', subcategory: '통닭', isAvailable: true, isPopular: true },
      { id: 'ck-3', name: '반반 치킨', description: '후라이드 + 양념 반반', price: 19000, unit: '마리', emoji: '🍗', subcategory: '통닭', isAvailable: true },
      { id: 'ck-4', name: '간장 마늘 치킨', description: '은은한 간장 마늘향', price: 20000, unit: '마리', emoji: '🧄', subcategory: '통닭', isAvailable: true },
      { id: 'ck-5', name: '순살 치킨', description: '뼈 없는 순살 튀김', price: 20000, originalPrice: 23000, discountRate: 13, unit: '팩', emoji: '🍗', subcategory: '순살', isAvailable: true },
      { id: 'ck-6', name: '치킨 무', description: '새콤달콤 치킨무 단품', price: 1000, unit: '개', emoji: '🥒', subcategory: '사이드', isAvailable: true },
      { id: 'ck-7', name: '콜라 1.25L', description: '코카콜라', price: 2500, unit: '병', emoji: '🥤', subcategory: '사이드', isAvailable: true },
    ],
  },
  {
    id: 'bakery',
    name: '빵집',
    emoji: '🥐',
    category: '베이커리·카페',
    description: '매일 새벽 4시 구워내는 동네 빵집',
    isOpen: true,
    badge: '신선',
    hours: '07:00~20:00',
    minOrder: 5000,
    deliveryFee: 0,
    accentColor: '#D97706',
    subcategories: ['빵', '케이크', '음료'],
    products: [
      { id: 'bk-1', name: '크루아상', description: '버터 듬뿍 프랑스식', price: 3500, unit: '개', emoji: '🥐', subcategory: '빵', isAvailable: true, isPopular: true },
      { id: 'bk-2', name: '식빵 (통식빵)', description: '촉촉한 우유식빵', price: 5500, originalPrice: 6500, discountRate: 15, unit: '개', emoji: '🍞', subcategory: '빵', isAvailable: true, isPopular: true },
      { id: 'bk-3', name: '소보루빵', description: '달콤 바삭 소보루 토핑', price: 2000, unit: '개', emoji: '🍞', subcategory: '빵', isAvailable: true },
      { id: 'bk-4', name: '단팥빵', description: '통팥 앙금 가득', price: 2500, unit: '개', emoji: '🥮', subcategory: '빵', isAvailable: true, isPopular: true },
      { id: 'bk-5', name: '마늘빵', description: '구운 마늘버터빵', price: 3000, unit: '개', emoji: '🧄', subcategory: '빵', isAvailable: true },
      { id: 'bk-6', name: '치즈케이크', description: '뉴욕 스타일 진한 치즈', price: 6500, unit: '조각', emoji: '🍰', subcategory: '케이크', isAvailable: true, tag: '베스트' },
      { id: 'bk-7', name: '아메리카노', description: '에티오피아 원두 싱글오리진', price: 4000, unit: '잔', emoji: '☕', subcategory: '음료', isAvailable: true },
      { id: 'bk-8', name: '딸기 생크림 케이크', description: '논산 딸기 시즌 한정', price: 38000, unit: '홀', emoji: '🎂', subcategory: '케이크', isAvailable: true, tag: '시즌 한정' },
    ],
  },
]

export function getStore(id: string): Store | undefined {
  return STORES.find(s => s.id === id)
}
