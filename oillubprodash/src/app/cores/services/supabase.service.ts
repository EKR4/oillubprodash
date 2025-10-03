import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { SupabaseUser, SupabaseAuthResponse, SupabaseQueryResponse, UserProfile } from '../models/supabase';
import { UserRole } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<SupabaseUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key
    );

    if (isPlatformBrowser(this.platformId)) {
      this.loadUser();
    }
  }

  private async loadUser() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        const { data: authUser } = await this.supabase.auth.getUser();
        if (authUser?.user) {
          // Get user data from profiles table which is linked to auth.users
          const { data: profileData, error: profileError } = await this.supabase
            .from('profiles')
            .select(`
              *,
              user_profiles(*),
              company:companies(*)
            `)
            .eq('id', authUser.user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile data:', profileError);
            return;
          }

          if (profileData) {
            // Construct appUser with data from both auth.users and profiles
            const appUser: SupabaseUser = {
              id: profileData.id,
              email: authUser.user.email || '',
              full_name: profileData.full_name,
              role: profileData.role as UserRole,
              created_at: profileData.created_at,
              is_active: profileData.is_active,
              phone: profileData.phone,
              company_id: profileData.company_id,
              profile: profileData.user_profiles,
              company: profileData.company
            };
            this.currentUserSubject.next(appUser);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  // Determine user role atomically using server-side function
  private async determineUserRole(requestedRole?: string): Promise<string> {
    try {
      // Call server-side function for atomic role determination
      const { data, error } = await this.supabase.rpc('get_first_user_status');
      if (error) throw error;
      
      // If this is the first user, they become admin regardless of requested role
      if (data.is_first) {
        return 'admin';
      }
      
      // Otherwise, use requested role or default to customer
      return requestedRole || 'customer';
    } catch (error) {
      console.error('Error determining user role:', error);
      // Fail safe - default to customer role if there's an error
      return 'customer';
    }
  }

  async signUp(email: string, password: string, userData: any = {}) {
    if (!isPlatformBrowser(this.platformId)) {
      return { data: null, error: new Error('Authentication not available during server-side rendering') };
    }
    
    try {
      // Determine user role atomically through server-side function
      const userRole = await this.determineUserRole(userData.role);
      const isAdmin = userRole === 'admin';

      // Using Supabase Auth for user creation with metadata
      // The trigger we created will automatically create a basic profile
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || '',
            role: userRole,
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        // Update the automatically created profile with additional data
        const profileUpdate = {
          phone: userData.phone || '',
          company_id: userData.companyId || null,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await this.supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', data.user.id)
          .select();

        if (profileError) throw profileError;

        // Create user address record
        const addressRecord = {
          id: crypto.randomUUID(),
          user_id: data.user.id,
          street: userData.street || '',
          city: userData.city || '',
          state: userData.state || '',
          postal_code: userData.postalCode || '',
          country: userData.country || '',
          is_default_address: true,
          newsletter_subscribed: false,
          sms_notifications: false,
          email_notifications: true,
          preferred_language: 'en',
          preferred_currency: 'KES',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: addressError } = await this.supabase
          .from('user_profiles')
          .insert([addressRecord])
          .select()
          .single();

        if (addressError) throw addressError;

        // If this is the first user (admin), create admin_users record
        if (isAdmin) {
          const adminRecord = {
            id: data.user.id,
            department: 'Administration',
            access_level: 'full',
            managed_regions: ['all']
          };

          const { error: adminError } = await this.supabase
            .from('admin_users')
            .insert([adminRecord])
            .select()
            .single();

          if (adminError) throw adminError;
        }
        
        // Get the complete profile with company data
        const { data: profileData, error: fetchError } = await this.supabase
          .from('profiles')
          .select(`
            *,
            user_profiles(*),
            company:companies(*)
          `)
          .eq('id', data.user.id)
          .single();
          
        if (fetchError) throw fetchError;
        
        if (profileData) {
          // Update local user state
          const appUser: SupabaseUser = {
            id: profileData.id,
            email: email,
            full_name: profileData.full_name,
            role: profileData.role as UserRole,
            created_at: profileData.created_at,
            is_active: profileData.is_active,
            phone: profileData.phone,
            company_id: profileData.company_id,
            profile: profileData.user_profiles,
            company: profileData.company
          };
          this.currentUserSubject.next(appUser);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error };
    }
  }

  async signIn(email: string, password: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return { data: null, error: new Error('Authentication not available during server-side rendering') };
    }
    
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        // Get profile data linked to auth.users
        const { data: profileData, error: profileError } = await this.supabase
          .from('profiles')
          .select(`
            *,
            user_profiles(*),
            company:companies(*)
          `)
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData) {
          // Update profile's last_login timestamp
          await this.supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
          
          // Update local user state
          const appUser: SupabaseUser = {
            id: profileData.id,
            email: data.user.email || '',
            full_name: profileData.full_name,
            role: profileData.role as UserRole,
            created_at: profileData.created_at,
            is_active: profileData.is_active,
            phone: profileData.phone,
            company_id: profileData.company_id,
            profile: profileData.user_profiles,
            company: profileData.company
          };
          this.currentUserSubject.next(appUser);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { data: null, error };
    }
  }

  // Get Supabase instance
  getSupabase(): SupabaseClient {
    return this.supabase;
  }

  // Sign out
  async signOut() {
    if (!isPlatformBrowser(this.platformId)) {
      return { error: null };
    }
    
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      this.currentUserSubject.next(null);
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    }
  }
}

// Export types for auth events and sessions
export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'USER_DELETED';
export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: any;
}