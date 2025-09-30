export class Cart {
}
import { Product, ProductPackage } from './product';
import { User } from './user'
export interface CartItem {
  id: string;
  product_id: string;
  product: Product;
  package_id: string;
  package: ProductPackage;
  quantity: number;
  added_at: Date;
  updated_at: Date;
}

export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  created_at: Date;
  updated_at: Date;
  notes?: string;
}

export interface CartSummary {
  total_items: number;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  discount?: number;
  total: number;
  currency: string;
}

export interface CheckoutDetails {
  cart_id: string;
  user_id?: string;
  shipping_address: {
    full_name: string;
    phone: string;
    email: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    county: string;
    country: string;
  };
  billing_address?: {
    full_name: string;
    phone: string;
    email: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    county: string;
    country: string;
  };
  same_as_shipping: boolean;
  payment_method: 'mpesa' | 'card' | 'cash_on_delivery';
  delivery_method: 'delivery' | 'pickup';
  delivery_instructions?: string;
  delivery_date?: Date;
  pickup_location?: string;
}

export interface SavedCart {
  id: string;
  user_id: string;
  name: string;
  items: CartItem[];
  created_at: Date;
}