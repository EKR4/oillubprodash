export interface Environment {
  production: boolean;
  supabase: {
    url: string;
    key: string;
    database?: {
      url?: string; // Optional for client-side code
    };
  };
  schema: {
    auth: {
      users: string;
      profiles: string;
      admin_users: string;
    };
    public: {
      companies: string;
      orders: string;
      products: string;
      user_profiles: string;
    };
  };
}