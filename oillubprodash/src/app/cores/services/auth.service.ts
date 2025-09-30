import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { User, UserRole, AuthResponse } from '../models/user';
import { SupabaseService } from './supabase.service';
import { AuthError, User as SupabaseAuthUser, Session, AuthChangeEvent } from '@supabase/supabase-js';

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

  getAccessToken(): string | null {
    const session = this.sessionSubject.value;
    return session?.access_token || null;
  }

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
      }
    });

    this.isInitialized = true;
  }

  private async loadUserData(userId: string | undefined): Promise<void> {
    if (!userId) return;

    try {
      // First, try to get user from users table
      const { data: userData, error: userError } = await this.supabaseService
        .getSupabase()
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user data:', userError);
        return;
      }

      const session = this.sessionSubject.value;
      const authUser = session?.user;

      if (!userData && authUser) {
        // User exists in auth but not in users table
        const { error: createError } = await this.supabaseService
          .getSupabase()
          .from('users')
          .insert([{
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.['full_name'] || '',
            role: authUser.user_metadata?.['role'] || 'customer',
            created_at: new Date().toISOString(),
            is_active: true
          }])
          .single();

        if (createError) {
          console.error('Error creating user record:', createError);
          return;
        }

        // Fetch the newly created user data
        const { data: newUserData } = await this.supabaseService
          .getSupabase()
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (newUserData) {
          const appUser: User = this.mapToAppUser(newUserData, authUser);
          this.currentUserSubject.next(appUser);
        }
      } else if (userData && authUser) {
        const appUser: User = this.mapToAppUser(userData, authUser);
        this.currentUserSubject.next(appUser);
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      this.currentUserSubject.next(null);
    }
  }

  private mapToAppUser(
    userData: { 
      id: string;
      email: string;
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
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name || authUser.user_metadata?.['full_name'] || '',
      role: userData.role as UserRole,
      created_at: new Date(userData.created_at),
      is_active: userData.is_active,
      phone: userData.phone || authUser.user_metadata?.['phone'],
      company_id: userData.company_id,
      profile_image_url: userData.profile_image_url,
      loyalty_points: userData.loyalty_points || 0
    };
  }

  private async isFirstUser(): Promise<boolean> {
    const { data, error } = await this.supabaseService
      .getSupabase()
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error checking for first user:', error);
      return false;
    }
    
    return data?.length === 0;
  }

  register(email: string, password: string, userData: Partial<User>): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      this.isFirstUser().then(isFirst => {
        const role = isFirst ? 'admin' : (userData.role || 'customer');
        
        this.supabaseService.signUp(email, password, { ...userData, role })
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
    });
  }

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

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  hasRole(role: UserRole | UserRole[]): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        
        return user.role === role;
      })
    );
  }

  private navigateAfterAuth(role: UserRole): void {
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

  updateUserProfile(userData: Partial<User>): Observable<User | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return of(null);
    }

    return new Observable<User | null>(observer => {
      Promise.resolve(
        this.supabaseService
          .getSupabase()
          .from('users')
          .update(userData)
          .eq('id', currentUser.id)
          .select()
          .single()
      )
        .then(response => {
          if (response.error) {
            observer.error(response.error);
            observer.complete();
            return;
          }

          if (response.data) {
            const updatedUser = {
              ...currentUser,
              ...response.data
            };
            
            this.currentUserSubject.next(updatedUser);
            observer.next(updatedUser);
          } else {
            observer.next(null);
          }
          
          observer.complete();
        })
        .catch((error: unknown) => {
          observer.error(error instanceof Error ? error : new Error(String(error)));
          observer.complete();
        });
    });
  }

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
        .catch(error => {
          observer.next({ success: false, error });
          observer.complete();
        });
    });
  }

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
        .catch(error => {
          observer.next({ success: false, error });
          observer.complete();
        });
    });
  }
}