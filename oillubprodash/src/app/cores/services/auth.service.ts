import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, map, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthError as SupabaseAuthError, User as SupabaseAuthUser, Session } from '@supabase/supabase-js';
import { AuthState, initialAuthState } from '../models/auth-state';
import { AuthError } from '../models/auth-error';
import { AuthErrorService } from './auth-error.service';

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
  private authStateSubject = new BehaviorSubject<AuthState>(initialAuthState);
  private sessionRefreshTimer: any;
  private readonly SESSION_REFRESH_INTERVAL = 1000 * 60 * 30; // 30 minutes

  // Handle the authentication callback from Supabase
  handleCallback(access_token: string): Observable<{ user: User | null; error: Error | null }> {
    return new Observable(observer => {
      this.updateAuthState({ loading: true });

      this.supabaseService.getSupabase().auth.setSession({
        access_token,
        refresh_token: ''
      }).then(async ({ data, error }) => {
        if (error) {
          const authError = this.authErrorService.handleError(error);
          this.updateAuthState({ 
            error: authError.message,
            loading: false 
          });
          observer.next({ user: null, error: new Error(authError.message) });
          observer.complete();
          return;
        }

        try {
          if (data?.user) {
            await this.loadUserData(data.user.id);
            const currentState = this.authStateSubject.getValue();
            observer.next({ 
              user: currentState.user,
              error: null 
            });
          } else {
            observer.next({ 
              user: null,
              error: new Error('No user data received') 
            });
          }
        } catch (error) {
          const authError = this.authErrorService.handleError(error);
          observer.next({ 
            user: null,
            error: new Error(authError.message)
          });
        }

        observer.complete();
      }).catch(error => {
        const authError = this.authErrorService.handleError(error);
        this.updateAuthState({ 
          error: authError.message,
          loading: false 
        });
        observer.next({ 
          user: null,
          error: new Error(authError.message)
        });
        observer.complete();
      });
    });
  }  public authState$ = this.authStateSubject.asObservable();
  public currentUser$ = this.authState$.pipe(map(state => state.user));
  public session$ = this.authState$.pipe(map(state => state.session));
  public loading$ = this.authState$.pipe(map(state => state.loading));
  public error$ = this.authState$.pipe(map(state => state.error));

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private authErrorService: AuthErrorService
  ) {
    // Handle hash params for email verification flow
    if (typeof window !== 'undefined') {
      this.handleAuthParams();
    }
    
    // Initialize auth state
    this.initAuthState();
    
    // Setup session refresh
    this.setupSessionRefresh();
  }

  ngOnDestroy() {
    if (this.sessionRefreshTimer) {
      clearInterval(this.sessionRefreshTimer);
    }
  }

  private updateAuthState(update: Partial<AuthState>) {
    const currentState = this.authStateSubject.getValue();
    this.authStateSubject.next({ ...currentState, ...update });
  }

  private setupSessionRefresh() {
    this.sessionRefreshTimer = setInterval(async () => {
      try {
        const currentState = this.authStateSubject.getValue();
        if (currentState.session) {
          const { data: { session }, error } = 
            await this.supabaseService.getSupabase().auth.refreshSession();
          
          if (error) {
            throw error;
          }

          if (session) {
            this.updateAuthState({ session });
          }
        }
      } catch (error) {
        this.authErrorService.handleError(error);
        // If session refresh fails, log out the user
        this.logout().subscribe();
      }
    }, this.SESSION_REFRESH_INTERVAL);
  }

  /**
   * Handle URL parameters after email verification
   */
  private async handleAuthParams() {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const tokenType = params.get('token_type');
    const expiresIn = params.get('expires_in');
    const refreshToken = params.get('refresh_token');

    if (accessToken && tokenType) {
      try {
        this.updateAuthState({ loading: true });

        // Set the session in Supabase
        const { data, error } = await this.supabaseService.getSupabase().auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) throw error;

        // Clear the URL hash
        window.location.hash = '';

        // Load user data
        if (data.user) {
          await this.loadUserData(data.user.id);
        }

        const currentState = this.authStateSubject.getValue();
        if (currentState.user) {
          switch (currentState.user.role) {
            case 'admin':
              await this.router.navigate(['/admin/dashboard']);
              break;
            case 'company':
              await this.router.navigate(['/company/dashboard']);
              break;
            case 'customer':
              await this.router.navigate(['/customer/dashboard']);
              break;
            default:
              await this.router.navigate(['/']);
          }
        }
      } catch (error) {
        const authError = this.authErrorService.handleError(error);
        this.updateAuthState({ error: authError.message });
        await this.router.navigate(['/auth/login']);
      } finally {
        this.updateAuthState({ loading: false });
      }
    }
  }

  /**
   * Set the session after authentication callback
   */
  async setSession(session: { 
    access_token: string; 
    refresh_token: string; 
  }): Promise<{ data: any; error: any }> {
    try {
      this.updateAuthState({ loading: true });
      
      const response = await this.supabaseService.getSupabase().auth.setSession(session);
      
      if (response.error) {
        throw response.error;
      }

      if (response.data.user) {
        await this.loadUserData(response.data.user.id);
      }

      return { data: response.data, error: null };
    } catch (error) {
      const authError = this.authErrorService.handleError(error);
      this.updateAuthState({ error: authError.message });
      return { data: null, error: authError };
    } finally {
      this.updateAuthState({ loading: false });
    }
  }

  /**
   * Get the current access token for API calls
   */
  getAccessToken(): string | null {
    const currentState = this.authStateSubject.getValue();
    return currentState.session?.access_token || null;
  }

  /**
   * Initialize auth state by listening for Supabase auth changes
   */
  private async initAuthState(): Promise<void> {
    const currentState = this.authStateSubject.getValue();
    if (currentState.initialized) return;

    try {
      this.updateAuthState({ loading: true });

      // Initialize session state
      const { data: { session }, error: sessionError } = 
        await this.supabaseService.getSupabase().auth.getSession();
      
      if (sessionError) throw sessionError;

      this.updateAuthState({ session });
      
      if (session?.user) {
        await this.loadUserData(session.user.id);
      }

      // Listen for auth changes
      this.supabaseService.getSupabase().auth.onAuthStateChange(async (event, session) => {
        this.updateAuthState({ session });
        
        switch (event) {
          case 'SIGNED_OUT':
            this.updateAuthState({ 
              user: null, 
              session: null,
              error: null 
            });
            this.router.navigateByUrl('/');
            break;
            
          case 'SIGNED_IN':
          case 'USER_UPDATED':
            if (session?.user) {
              await this.loadUserData(session.user.id);
            }
            break;
        }
      });

      this.updateAuthState({ initialized: true, error: null });
    } catch (error) {
      const authError = this.authErrorService.handleError(error);
      this.updateAuthState({ 
        error: authError.message,
        initialized: true 
      });
    } finally {
      this.updateAuthState({ loading: false });
    }
  }

  /**
   * Load user data from the profiles table (linked to auth.users)
   */
  private async loadUserData(userId: string): Promise<void> {
    if (!userId) return;

    try {
      this.updateAuthState({ loading: true });

      // Get user from profiles table (linked to auth.users)
      const { data: profileData, error: profileError } = await this.supabaseService
        .getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const currentState = this.authStateSubject.getValue();
      const authUser = currentState.session?.user;

      if (profileData && authUser) {
        // Create user object from profile data
        const appUser: User = this.mapToAppUser(profileData, authUser);
        this.updateAuthState({ 
          user: appUser,
          error: null
        });
      }
    } catch (error) {
      const authError = this.authErrorService.handleError(error);
      this.updateAuthState({ 
        user: null,
        error: authError.message
      });
    } finally {
      this.updateAuthState({ loading: false });
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
   * Handle email verification token
   */
  async handleEmailVerification(token: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase().auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update local auth state if verification successful
      if (data?.user) {
        await this.loadUserData(data.user.id);
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Register a new user using Supabase auth with profile integration
   */
  register(email: string, password: string, userData: Partial<User>): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      // SupabaseService handles role determination with server-side RPC
      this.supabaseService.signUp(email, password)
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
      this.updateAuthState({ loading: true });
      
      this.supabaseService.signOut()
        .then(response => {
          if (response.error) {
            const authError = this.authErrorService.handleError(response.error);
            this.updateAuthState({ error: authError.message });
            observer.next({ success: false, error: new Error(authError.message) });
          } else {
            this.updateAuthState({
              user: null,
              session: null,
              error: null
            });
            observer.next({ success: true, error: null });
            this.router.navigateByUrl('/');
          }
          observer.complete();
        })
        .catch(error => {
          const authError = this.authErrorService.handleError(error);
          this.updateAuthState({ error: authError.message });
          observer.next({ success: false, error: new Error(authError.message) });
          observer.complete();
        })
        .finally(() => {
          this.updateAuthState({ loading: false });
        });
    });
  }

  /**
   * Get current logged in user
   */
  getCurrentUser(): User | null {
    const currentState = this.authStateSubject.getValue();
    return currentState.user;
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
    const currentState = this.authStateSubject.getValue();
    if (!currentState.user) {
      return of(null);
    }

    return new Observable<User | null>(observer => {
      this.updateAuthState({ loading: true });

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
          .eq('id', currentState.user!.id)
          .select('*')
          .single();
        
        // Use then with success and error handlers instead of catch
        query.then(
          // Success handler
          (response) => {
            if (response.error) {
              const authError = this.authErrorService.handleError(response.error);
              this.updateAuthState({ 
                error: authError.message,
                loading: false
              });
              observer.error(new Error(authError.message));
              observer.complete();
              return;
            }

            if (response.data) {
              const authUser = currentState.session?.user;
              
              if (authUser) {
                const updatedUser = this.mapToAppUser(response.data, authUser);
                this.updateAuthState({ 
                  user: updatedUser,
                  error: null,
                  loading: false
                });
                observer.next(updatedUser);
              } else {
                this.updateAuthState({ loading: false });
                observer.next(null);
              }
            } else {
              this.updateAuthState({ loading: false });
              observer.next(null);
            }
            
            observer.complete();
          },
          // Error handler
          (error: unknown) => {
            const authError = this.authErrorService.handleError(error);
            this.updateAuthState({ 
              error: authError.message,
              loading: false
            });
            observer.error(new Error(authError.message));
            observer.complete();
          }
        );
      } catch (error: unknown) {
        // Fallback error handler for synchronous errors
        const authError = this.authErrorService.handleError(error);
        this.updateAuthState({ 
          error: authError.message,
          loading: false
        });
        observer.error(new Error(authError.message));
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