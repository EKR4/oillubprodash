import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  supabase: {
    url: 'https://cpmnnfmdwitakudydwtk.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbW5uZm1kd2l0YWt1ZHlkd3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDgwMzksImV4cCI6MjA3NzIyNDAzOX0.IjUt0DLg0877e7wCT7Xr8_vNhhWMgMVqO61KLbhxqds',
    redirectUrl: 'https://oillubprodash.vercel.app/auth/callback',
    // Database connection is only included in server-side code
  },
  mulaflow: {
    apiUrl: process.env['MULAFLOW_API_URL'] || 'https://api.mulaflow.co.ke/v1',
    apiKey: process.env['MULAFLOW_API_KEY'] || '', // This should be set in your deployment environment
    webhookSecret: process.env['MULAFLOW_WEBHOOK_SECRET'] || '' // This should be set in your deployment environment
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