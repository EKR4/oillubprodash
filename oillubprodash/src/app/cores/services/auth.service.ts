import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthError, User as SupabaseAuthUser, Session } from '@supabase/supabase-js';

// Define types locally to avoid TSX import issues
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: Date;
  is_active: boolean;
  phone?: string;
  company_id?: string;
  profile_image_url?: string;
  loyalty_points?: number;
}

export type UserRole = 'admin' | 'company' | 'customer';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private isInitialized = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.initAuthState();
  }

  /**
   * Get the current access token for API calls
   */
  getAccessToken(): string | null {
    const session = this.sessionSubject.value;
    return session?.access_token || null;
  }

  /**
   * Initialize auth state by listening for Supabase auth changes
   */
  private initAuthState(): void {
    if (this.isInitialized) return;

    // Initialize session state
    this.supabaseService.getSupabase().auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      this.sessionSubject.next(session);
      if (session?.user) {
        this.loadUserData(session.user.id);
      }
    });

    // Listen for auth changes
    this.supabaseService.getSupabase().auth.onAuthStateChange((event, session) => {
      this.sessionSubject.next(session);
      
      switch (event) {
        case 'SIGNED_OUT':
          this.currentUserSubject.next(null);
          this.router.navigateByUrl('/');
          break;
        case 'SIGNED_IN':
        case 'USER_UPDATED':
          if (session?.user) {
            this.loadUserData(session.user.id);
          }
          break;
      }
    });

    this.isInitialized = true;
  }

  /**
   * Load user data from the profiles table (linked to auth.users)
   */
  private async loadUserData(userId: string): Promise<void> {
    if (!userId) return;

    try {
      // Get user from profiles table (linked to auth.users)
      const { data: profileData, error: profileError } = await this.supabaseService
        .getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return;
      }

      const session = this.sessionSubject.value;
      const authUser = session?.user;

      if (profileData && authUser) {
        // Create user object from profile data
        const appUser: User = this.mapToAppUser(profileData, authUser);
        this.currentUserSubject.next(appUser);
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Map Supabase user and profile data to our application User model
   */
  private mapToAppUser(
    profileData: { 
      id: string;
      full_name: string;
      role: string;
      created_at: string;
      is_active: boolean;
      phone?: string;
      company_id?: string;
      profile_image_url?: string;
      loyalty_points?: number;
    },
    authUser: SupabaseAuthUser
  ): User {
    return {
      id: profileData.id,
      email: authUser.email || '',
      full_name: profileData.full_name || authUser.user_metadata?.['full_name'] || '',
      role: profileData.role as UserRole,
      created_at: new Date(profileData.created_at),
      is_active: profileData.is_active,
      phone: profileData.phone || authUser.user_metadata?.['phone'],
      company_id: profileData.company_id,
      profile_image_url: profileData.profile_image_url,
      loyalty_points: profileData.loyalty_points || 0
    };
  }

  /**
   * Register a new user using Supabase auth with profile integration
   */
  register(email: string, password: string, userData: Partial<User>): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      // SupabaseService handles role determination with server-side RPC
      this.supabaseService.signUp(email, password, userData)
        .then(response => {
          if (response.error) {
            observer.error(response.error);
            observer.complete();
            return;
          }

          if (response.data?.user && !response.data.session) {
            observer.next({
              user: null,
              session: null,
              error: new Error('Please check your email for a confirmation link')
            });
          } else if (response.data?.user) {
            // User will be created by auth state change handler
            observer.next({
              user: null,
              session: response.data.session,
              error: null
            });
          }
          
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
          observer.complete();
        });
    });
  }

  /**
   * Login using Supabase auth
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      this.supabaseService.signIn(email, password)
        .then(response => {
          if (response.error) {
            observer.error(response.error);
            observer.complete();
            return;
          }

          if (!response.data?.session) {
            observer.error(new Error('No session data received'));
            observer.complete();
            return;
          }

          // User will be loaded by auth state change handler
          observer.next({
            user: null,
            session: response.data.session,
            error: null
          });
          
          observer.complete();
        })
        .catch((error: unknown) => {
          observer.error(error instanceof Error ? error : new Error(String(error)));
          observer.complete();
        });
    });
  }

  /**
   * Logout using Supabase auth
   */
  logout(): Observable<{ success: boolean; error: Error | null }> {
    return new Observable(observer => {
      this.supabaseService.signOut()
        .then(response => {
          if (response.error) {
            const errorObj = response.error instanceof Error 
              ? response.error 
              : new Error(typeof response.error === 'string' 
                  ? response.error 
                  : JSON.stringify(response.error));
            
            observer.next({ success: false, error: errorObj });
          } else {
            this.sessionSubject.next(null);
            this.currentUserSubject.next(null);
            observer.next({ success: true, error: null });
            this.router.navigateByUrl('/');
          }
          observer.complete();
        })
        .catch(error => {
          const errorObj = error instanceof Error 
            ? error 
            : new Error(typeof error === 'string' ? error : JSON.stringify(error));
            
          observer.next({ success: false, error: errorObj });
          observer.complete();
        });
    });
  }

  /**
   * Get current logged in user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  /**
   * Check if user has the specified role(s)
   */
  hasRole(roleOrRoles: UserRole | UserRole[]): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        
        if (Array.isArray(roleOrRoles)) {
          return roleOrRoles.includes(user.role);
        }
        
        return user.role === roleOrRoles;
      })
    );
  }

  /**
   * Navigate to appropriate dashboard based on user role
   */
  navigateAfterAuth(role: UserRole): void {
    switch (role) {
      case 'admin':
        this.router.navigateByUrl('/admin/dashboard');
        break;
      case 'company':
        this.router.navigateByUrl('/company/dashboard');
        break;
      case 'customer':
        this.router.navigateByUrl('/customer/dashboard');
        break;
      default:
        this.router.navigateByUrl('/');
        break;
    }
  }

  /**
   * Update user profile in the profiles table
   */
  updateUserProfile(userData: Partial<User>): Observable<User | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return of(null);
    }

    return new Observable<User | null>(observer => {
      try {
        // Create the query
        const query = this.supabaseService
          .getSupabase()
          .from('profiles')
          .update({
            full_name: userData.full_name,
            phone: userData.phone,
            company_id: userData.company_id,
            profile_image_url: userData.profile_image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id)
          .select('*')
          .single();
        
        // Use then with success and error handlers instead of catch
        query.then(
          // Success handler
          (response) => {
            if (response.error) {
              observer.error(response.error);
              observer.complete();
              return;
            }

            if (response.data) {
              const session = this.sessionSubject.value;
              const authUser = session?.user;
              
              if (authUser) {
                const updatedUser = this.mapToAppUser(response.data, authUser);
                this.currentUserSubject.next(updatedUser);
                observer.next(updatedUser);
              } else {
                observer.next(null);
              }
            } else {
              observer.next(null);
            }
            
            observer.complete();
          },
          // Error handler
          (error: unknown) => {
            observer.error(error instanceof Error ? error : new Error(String(error)));
            observer.complete();
          }
        );
      } catch (error: unknown) {
        // Fallback error handler for synchronous errors
        observer.error(error instanceof Error ? error : new Error(String(error)));
        observer.complete();
      }
    });
  }

  /**
   * Request password reset using Supabase auth
   */
  requestPasswordReset(email: string): Observable<{ success: boolean; error: Error | null }> {
    return new Observable(observer => {
      this.supabaseService.getSupabase().auth.resetPasswordForEmail(email)
        .then(response => {
          if (response.error) {
            observer.next({ success: false, error: response.error });
          } else {
            observer.next({ success: true, error: null });
          }
          observer.complete();
        })
        .catch((error: unknown) => {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          observer.next({ success: false, error: errorObj });
          observer.complete();
        });
    });
  }

  /**
   * Update password using Supabase auth
   */
  updatePassword(password: string): Observable<{ success: boolean; error: Error | null }> {
    return new Observable(observer => {
      this.supabaseService.getSupabase().auth.updateUser({ password })
        .then(response => {
          if (response.error) {
            observer.next({ success: false, error: response.error });
          } else {
            observer.next({ success: true, error: null });
          }
          observer.complete();
        })
        .catch((error: unknown) => {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          observer.next({ success: false, error: errorObj });
          observer.complete();
        });
    });
  }
}