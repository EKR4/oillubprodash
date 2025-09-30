import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  supabase: {
    url: 'https://cgwxhmotkujqhwkkfrjf.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnd3hobW90a3VqcWh3a2tmcmpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODczOTAsImV4cCI6MjA3MzE2MzM5MH0.plBumFO0w5bMHDvtOC3-OyLgadYG9a6s184No9EKRo0',
    database: {
      url: 'postgresql://postgres:KIPNGETIcH58@@db.cgwxhmotkujqhwkkfrjf.supabase.co:5432/postgres'
    }
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