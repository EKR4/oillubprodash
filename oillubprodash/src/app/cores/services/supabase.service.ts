import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { SupabaseUser, SupabaseAuthResponse, SupabaseQueryResponse, UserProfile } from '../models/supabase';

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
        const { data: user } = await this.supabase.auth.getUser();
        if (user) {
          const { data: userData, error: userError } = await this.supabase
            .from('users')
            .select(`
              *,
              profile:user_profiles(*),
              company:companies(*)
            `)
            .eq('id', user.user?.id)
            .single();

          if (userError) {
            console.error('Error loading user data:', userError);
            return;
          }

          if (userData) {
            const appUser: SupabaseUser = {
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name,
              role: userData.role,
              created_at: userData.created_at,
              is_active: userData.is_active,
              phone: userData.phone,
              company_id: userData.company_id,
              profile: userData.profile,
              company: userData.company
            };
            this.currentUserSubject.next(appUser);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  // Check if this is the first user
  private async isFirstUser(): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      
      return count === 0;
    } catch (error) {
      console.error('Error checking first user:', error);
      return false;
    }
  }

  async signUp(email: string, password: string, userData: any = {}) {
    if (!isPlatformBrowser(this.platformId)) {
      return { data: null, error: new Error('Authentication not available during server-side rendering') };
    }
    
    try {
      // Check if this is the first user
      const isFirst = await this.isFirstUser();
      const userRole = isFirst ? 'admin' : (userData.role || 'customer');

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
        // Create user record
        const userRecord = {
          id: data.user.id,
          email: email,
          full_name: userData.fullName || '',
          role: userRole,
          phone: userData.phone || '',
          company_id: userData.companyId || null,
          created_at: new Date().toISOString(),
          is_active: true,
          loyalty_points: 0
        };

        const { error: userError } = await this.supabase
          .from('users')
          .insert([userRecord])
          .select()
          .single();

        if (userError) throw userError;

        // Create user profile with UUID
        const profileRecord = {
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

        const { error: profileError } = await this.supabase
          .from('user_profiles')
          .insert([profileRecord])
          .select()
          .single();

        if (profileError) throw profileError;

        // If this is the first user (admin), create admin_users record
        if (isFirst) {
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
        
        // Update local user state
        const appUser: SupabaseUser = {
          ...userRecord,
          profile: profileRecord
        };
        this.currentUserSubject.next(appUser);
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
        // Get user data with profile and company info
        const { data: userData, error: userError } = await this.supabase
          .from('users')
          .select(`
            *,
            profile:user_profiles(*),
            company:companies(*)
          `)
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        if (userData) {
          // Update local user state
          const appUser: SupabaseUser = {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            created_at: userData.created_at,
            is_active: userData.is_active,
            phone: userData.phone,
            company_id: userData.company_id,
            profile: userData.profile,
            company: userData.company
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