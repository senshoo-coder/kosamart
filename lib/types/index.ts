// =============================================
// 코사마트 OMS/DMS 공통 타입 정의
// =============================================

export type UserRole = 'customer' | 'owner' | 'driver' | 'admin'
export type UserStatus = 'pending' | 'active' | 'suspended'

export type GroupBuyStatus = 'draft' | 'active' | 'closed' | 'cancelled'

export type OrderStatus =
  | 'pending'               // 주문접수 (입금대기)
  | 'paid'                  // 입금완료 (사장님 승인 대기)
  | 'approved'              // 사장님 승인
  | 'rejected'              // 사장님 거절
  | 'preparing'             // 상품 준비중
  | 'ready'                 // 픽업 대기
  | 'delivering'            // 배달중
  | 'delivered'             // 배달완료
  | 'picked_up_by_customer' // 고객 픽업 완료 (매장 픽업)
  | 'cancelled'             // 취소

export type DeliveryStatus =
  | 'pending'     // 배정 대기
  | 'assigned'    // 기사 배정됨
  | 'picked_up'   // 픽업 완료
  | 'delivering'  // 배달중
  | 'delivered'   // 완료
  | 'failed'      // 실패 (부재 등)

// =============================================
// DB 엔티티
// =============================================

export interface User {
  id: string
  device_uuid?: string
  nickname: string
  role: UserRole
  status: UserStatus
  phone?: string
  telegram_chat_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GroupBuy {
  id: string
  title: string
  description?: string
  kakao_chat_url?: string
  owner_id: string
  status: GroupBuyStatus
  order_deadline?: string
  delivery_date?: string
  min_order_amount: number
  created_at: string
  updated_at: string
  products?: Product[]
  _count?: { orders: number }
}

export interface Product {
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

export interface Order {
  id: string
  order_number: string
  group_buy_id: string
  customer_id: string
  status: OrderStatus
  total_amount: number
  delivery_address: string
  delivery_memo?: string
  kakao_nickname: string
  owner_memo?: string
  rejected_reason?: string
  approved_at?: string
  scheduled_at?: string
  created_at: string
  updated_at: string
  // denormalized fields from API joins
  store_name?: string
  // relations
  group_buy?: GroupBuy
  customer?: User
  items?: OrderItem[]
  delivery?: Delivery
  status_logs?: OrderStatusLog[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
  product?: Product
}

export interface Delivery {
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
  // relations
  order?: Order
  driver?: User
}

export interface OrderStatusLog {
  id: string
  order_id: string
  from_status?: OrderStatus
  to_status: OrderStatus
  changed_by?: string
  note?: string
  created_at: string
  user?: User
}

// =============================================
// API 요청/응답 타입
// =============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  meta?: {
    total?: number
    page?: number
    pageSize?: number
  }
}

export interface CreateOrderRequest {
  group_buy_id: string
  delivery_address: string
  delivery_memo?: string
  items: Array<{
    product_id: string
    quantity: number
  }>
}

export interface ApproveOrderRequest {
  owner_memo?: string
}

export interface RejectOrderRequest {
  rejected_reason: string
}

export interface CompleteDeliveryRequest {
  driver_memo?: string
  delivery_photo_url?: string
}

// =============================================
// 세션 / 인증
// =============================================

export interface SessionUser {
  id: string
  nickname: string
  device_uuid: string
  role: UserRole
}

export interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  unit: string
}

// =============================================
// UI 상태 타입
// =============================================

export type StatusColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'purple'

export interface StatusConfig {
  label: string
  color: StatusColor
  icon: string
  description: string
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending:               { label: '입금대기',   color: 'gray',   icon: '⏳', description: '입금 확인 중' },
  paid:                  { label: '입금완료',   color: 'green',  icon: '💰', description: '입금 확인됨' },
  approved:              { label: '준비완료',   color: 'blue',   icon: '✅', description: '준비 완료' },
  rejected:              { label: '거절됨',    color: 'red',    icon: '❌', description: '주문 거절' },
  preparing:             { label: '준비중',    color: 'orange', icon: '📦', description: '상품 준비 중' },
  ready:                 { label: '픽업대기',  color: 'purple', icon: '🏪', description: '매장 픽업 대기' },
  delivering:            { label: '배달중',    color: 'yellow', icon: '🚚', description: '배달 중' },
  delivered:             { label: '배달완료',  color: 'green',  icon: '🎉', description: '배달 완료' },
  picked_up_by_customer: { label: '고객픽업완료', color: 'green',  icon: '🏪', description: '고객 픽업 완료' },
  cancelled:             { label: '취소됨',    color: 'red',    icon: '🚫', description: '주문 취소' },
}

export const DELIVERY_STATUS_CONFIG: Record<DeliveryStatus, StatusConfig> = {
  pending:    { label: '배정대기', color: 'gray',   icon: '⏳', description: '기사 배정 대기' },
  assigned:   { label: '배정완료', color: 'blue',   icon: '👤', description: '기사 배정됨' },
  picked_up:  { label: '픽업완료', color: 'orange', icon: '📦', description: '물품 수령 완료' },
  delivering: { label: '배달중',   color: 'yellow', icon: '🚚', description: '배달 중' },
  delivered:  { label: '완료',    color: 'green',  icon: '✅', description: '배달 완료' },
  failed:     { label: '실패',    color: 'red',    icon: '⚠️', description: '배달 실패' },
}
