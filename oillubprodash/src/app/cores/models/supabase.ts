import { User, UserRole } from './user';

export interface UserProfile {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company_id?: string | null;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
}

export interface SupabaseUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  phone?: string;
  company_id?: string | null;
  profile?: UserProfile;
  company?: Company;
}

export interface SupabaseAuthResponse {
  user: User | null;
  session: any | null;
  error: Error | null;
}

export interface SupabaseQueryResponse<T> {
  data: T | null;
  error: Error | null;
}