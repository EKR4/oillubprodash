import { InjectionToken } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT_CREATOR = new InjectionToken<typeof createClient>(
  'SUPABASE_CLIENT_CREATOR',
  { factory: () => createClient }
);