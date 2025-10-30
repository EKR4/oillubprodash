import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '../models/user';
import { SupabaseUser, UserProfile } from '../models/supabase';

export interface MockQueryResponse<T> {
  data: T | null;
  error: Error | null;
}

export const createTestUser = (
  id: string,
  email: string,
  fullName: string,
  role: UserRole = 'customer'
): SupabaseUser => ({
  id,
  email,
  full_name: fullName,
  role,
  created_at: new Date().toISOString(),
  is_active: true,
  phone: '',
  company_id: null,
  profile: {
    id: `profile-${id}`,
    user_id: id,
    created_at: new Date().toISOString(),
    street: 'Test Street',
    city: 'Test City',
    state: '',
    postal_code: '',
    country: ''
  },
  company: undefined
});

export const createMockSupabase = () => {
  const mockAuth = {
    getSession: jasmine.createSpy('getSession'),
    getUser: jasmine.createSpy('getUser'),
    signUp: jasmine.createSpy('signUp'),
    signInWithPassword: jasmine.createSpy('signInWithPassword'),
    signOut: jasmine.createSpy('signOut')
  };

  const mockFrom = jasmine.createSpy('from');
  const mockRpc = jasmine.createSpy('rpc');

  const mockClient = {
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc
  } as unknown as SupabaseClient;

  return {
    mockClient,
    mockAuth,
    mockFrom,
    mockRpc
  };
};