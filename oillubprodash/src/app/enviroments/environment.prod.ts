import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  supabase: {
    url: 'https://hzbocsermrjuhwomgxwl.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Ym9jc2VybXJqdWh3b21neHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzAwNzAsImV4cCI6MjA3NDg0NjA3MH0.1gWvr1yxZgm7sXHBJRM6bjYrYPLN7rVgkXJnsKwzGEE',
    // Database connection is only included in server-side code
  },
  schema: {
    auth: {
      users: 'auth.users',
      profiles: 'public.user_profiles',
      admin_users: 'public.admin_users'
    },
    public: {
      companies: 'public.companies',
      orders: 'public.orders',
      products: 'public.products',
      user_profiles: 'public.user_profiles'
    }
  }
};