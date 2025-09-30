import { Address, User } from './user';
import { Company } from './company';

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'mpesa' | 'card' | 'cash_on_delivery' | 'bank_transfer' | 'other';
export type DeliveryMethod = 'shipping' | 'pickup';

export interface OrderWithRelations extends Order {
  user?: User;
  company?: Company;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  company_id?: string; // For B2B orders
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_details: PaymentDetails;
  shipping_details: ShippingDetails;
  notes?: string;
  created_at: Date;
  updated_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  loyalty_points_earned?: number;
  loyalty_points_used?: number;
  is_bulk_order: boolean;
  metadata?: Record<string, any>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  package_id: string;
  package_size: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  is_gift?: boolean;
  notes?: string;
}

export interface PaymentDetails {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  transaction_id?: string;
  transaction_reference?: string;
  transaction_date?: Date;
  payment_provider: 'mulaflow' | 'mpesa' | 'stripe' | 'paypal' | 'manual' | 'other';
  
  // MulaFlow specific fields
  mulaflow_request_id?: string;
  mulaflow_callback_url?: string;
  
  // MPesa specific fields
  mpesa_phone_number?: string;
  mpesa_receipt_number?: string;
  
  // Card specific fields
  card_last_four?: string;
  card_brand?: string;
  card_expiry_month?: string;
  card_expiry_year?: string;
  
  // Status information
  status: PaymentStatus;
  status_message?: string;
  receipt_url?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface ShippingDetails {
  id: string;
  order_id: string;
  delivery_method: DeliveryMethod;
  
  // For shipping
  shipping_address?: Address;
  tracking_number?: string;
  tracking_url?: string;
  shipping_carrier?: string;
  estimated_delivery_date?: Date;
  actual_delivery_date?: Date;
  
  // For pickup
  pickup_location_id?: string;
  pickup_location_name?: string;
  pickup_address?: Address;
  pickup_date?: Date;
  pickup_time_slot?: string;
  pickup_confirmation_code?: string;
  pickup_instructions?: string;
  
  // Delivery status
  status: 'pending' | 'preparing' | 'ready_for_pickup' | 'in_transit' | 'delivered' | 'failed';
  status_updates?: DeliveryStatusUpdate[];
  notes?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface DeliveryStatusUpdate {
  id: string;
  shipping_id: string;
  status: string;
  location?: string;
  timestamp: Date;
  notes?: string;
  updated_by: string;
}

export interface PickupLocation {
  id: string;
  name: string;
  address: Address;
  contact_phone: string;
  contact_email?: string;
  business_hours: string;
  is_active: boolean;
  has_parking: boolean;
  has_loading_dock: boolean;
  notes?: string;
}

// For MulaFlow Payment Integration
export interface MulaflowPaymentRequest {
  amount: number;
  currency: string;
  phone_number: string;
  email?: string;
  callback_url: string;
  reference: string; // Order number
  description: string;
  metadata?: Record<string, any>;
}

export interface MulaflowPaymentResponse {
  request_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_url?: string;
  transaction_id?: string;
  message?: string;
}

export interface MulaflowPaymentCallback {
  request_id: string;
  transaction_id: string;
  reference: string;
  status: 'completed' | 'failed';
  amount: number;
  currency: string;
  payment_method: string;
  payment_provider: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Order response for pagination
export interface OrdersResponse {
  data: Order[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: Error;
}