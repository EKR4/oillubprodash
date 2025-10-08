import { User, UserRole } from './user';

describe('User interface', () => {
  it('should be able to create a user object', () => {
    const user: User = {
      id: '1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'customer' as UserRole,
      created_at: new Date(),
      is_active: true
    };
    expect(user).toBeTruthy();
    expect(user.email).toBe('test@example.com');
  });
});
