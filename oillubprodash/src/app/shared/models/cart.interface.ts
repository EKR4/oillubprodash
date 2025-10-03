export interface CartItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
  };
  quantity: number;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface Cart {
  id: string;
  user_id?: string;
  status: 'active' | 'saved' | 'completed' | 'abandoned';
  items: CartItem[];
  total: number;
  created_at: Date;
  updated_at: Date;
}

export interface CartSummary {
  total_items: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface SavedCart {
  id: string;
  name: string;
  cart: Cart;
  created_at: Date;
  updated_at: Date;
}