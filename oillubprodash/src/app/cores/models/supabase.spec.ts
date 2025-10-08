import { SupabaseUser } from './supabase';

describe('SupabaseUser interface', () => {
  it('should be able to create a user object', () => {
    const user: SupabaseUser = {
      id: '1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'customer',
      created_at: new Date().toISOString(),
      is_active: true
    };
    expect(user).toBeTruthy();
    expect(user.email).toBe('test@example.com');
  });
});
