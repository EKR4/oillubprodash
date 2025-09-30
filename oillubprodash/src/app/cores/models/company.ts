import { Address } from './user';

export type CompanyType = 'distributor' | 'retailer' | 'workshop' | 'fleet_operator' | 'manufacturer' | 'other';
export type CompanyStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export interface Company {
  id: string;
  name: string;
  business_registration_number: string;
  tax_id?: string;
  email: string;
  phone: string;
  alternative_phone?: string;
  website?: string;
  company_type: CompanyType;
  industry?: string;
  status: CompanyStatus;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_date?: Date;
  verified_by?: string;
  verified?: boolean;
  
  // Address information
  primary_address: Address;
  billing_address?: Address;
  shipping_addresses?: Address[];
  
  // Business details
  year_established?: number;
  employee_count?: number;
  annual_revenue_range?: string;
  description?: string;
  notes?: string;
  
  // Account information
  account_manager_id?: string;
  credit_limit?: number;
  payment_terms?: string; // "Net 30", etc.
  credit_status: 'good' | 'warning' | 'hold';
  discount_rate?: number;
  
  // Documents
  logo_url?: string;
  registration_certificate_url?: string;
  tax_certificate_url?: string;
  
  // Timestamps
  created_at: Date;
  updated_at?: Date;
  last_order_date?: Date;
  
  // Metrics
  total_orders?: number;
  total_spent?: number;
  average_order_value?: number;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  full_name: string;
  position: string;
  department?: string;
  email: string;
  phone: string;
  is_primary_contact: boolean;
  is_billing_contact: boolean;
  is_technical_contact: boolean;
  notes?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: 'registration' | 'tax' | 'financial' | 'contract' | 'other';
  name: string;
  description?: string;
  file_url: string;
  file_type: string;
  upload_date: Date;
  expiry_date?: Date;
  is_verified: boolean;
  verified_by?: string;
  verification_date?: Date;
  verification_notes?: string;
}

export interface PriceTier {
  id: string;
  name: string;
  description?: string;
  minimum_order_value?: number;
  discount_percentage: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface CompanyPriceTier {
  id: string;
  company_id: string;
  price_tier_id: string;
  effective_from: Date;
  effective_to?: Date;
  override_discount_percentage?: number;
  notes?: string;
  created_by: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CompanyTransaction {
  id: string;
  company_id: string;
  transaction_type: 'invoice' | 'payment' | 'credit_note' | 'debit_note';
  amount: number;
  currency: string;
  reference_number: string;
  description?: string;
  transaction_date: Date;
  due_date?: Date;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  related_order_id?: string;
  payment_method?: string;
  created_at: Date;
  updated_at?: Date;
}

// Company response for pagination
export interface CompaniesResponse {
  data: Company[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: Error;
}