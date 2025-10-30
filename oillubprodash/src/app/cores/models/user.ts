export type UserRole = 'admin' | 'company' | 'customer';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  company_id?: string;
  profile_image_url?: string;
  created_at: Date;
  updated_at?: Date;
  last_login?: Date;
  is_active: boolean;
  loyalty_points?: number;
  user_metadata?: {
    full_name?: string;
    phone?: string;
    [key: string]: any;
  };
  profile?: UserProfile;
  company?: Company;
}

export interface UserProfile extends Omit<User, 'id' | 'email'> {
  user_id: string;
  address?: Address;
  preferences?: UserPreferences;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface UserPreferences {
  newsletter_subscribed: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  preferred_language: string;
  preferred_currency: string;
}

export interface Company {
  id: string;
  name: string;
  created_at: Date;
  is_active: boolean;
  industry?: string;
  status?: string;
  registration_number?: string;
  vat_number?: string;
  type?: string;
  size?: string;
}

export interface AdminUser extends User {
  role: 'admin';
  department?: string;
  access_level: 'full' | 'limited';
  managed_regions?: string[];
}

export interface CompanyUser extends User {
  role: 'company';
  company_id: string;
  position?: string;
  department?: string;
  permissions?: string[];
}

export interface CustomerUser extends User {
  role: 'customer';
  loyalty_points: number;
  vehicle_types?: string[];
  favorite_products?: string[];
  purchase_history_count?: number;
}

export interface AuthResponse {
  user: User | null;
  session: any | null;
  error: Error | null;
}