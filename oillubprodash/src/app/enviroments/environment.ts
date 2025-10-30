import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  supabase: {
     url: 'https://cpmnnfmdwitakudydwtk.supabase.co',
     key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbW5uZm1kd2l0YWt1ZHlkd3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDgwMzksImV4cCI6MjA3NzIyNDAzOX0.IjUt0DLg0877e7wCT7Xr8_vNhhWMgMVqO61KLbhxqds',
     redirectUrl: 'http://localhost:4200/auth/callback',
    // Database connection is only included in server-side code
  },
  mulaflow: {
    apiUrl: 'https://api.mulaflow.co.ke/v1',
    apiKey: 'test_api_key', // Replace with your development API key
    webhookSecret: 'test_webhook_secret' // Replace with your development webhook secret
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