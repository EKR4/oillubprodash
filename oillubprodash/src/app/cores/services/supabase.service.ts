import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { 
  SupabaseClient, 
  User as SupabaseAuthUser,
  PostgrestResponse,
  PostgrestError 
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { User, UserRole } from '../models/user';
import { SUPABASE_CLIENT_CREATOR } from '../models/supabase-token';
import { 
  SignupUserData,
  SignupFunctionResponse,
  SignupBaseError,
  SignupValidationError,
  ProfileUpdateError,
  EdgeFunctionError,
  SIGNUP_CONSTANTS,
  SignupStatus,
  SignupResult,
  ProfileUpdateData,
  UserProfileUpdateData,
  validateSignupData,
  prepareProfileUpdate,
  prepareUserProfileUpdate
} from '../models/signup';
import { withTimeout, withRetry, RetryConfig } from '../utils/timeout';
import { TimeoutError, NetworkError, RateLimitError, AppError } from '../models/errors';

// Error classes
export class AuthError extends AppError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    statusCode: number = 401
  ) {
    super(message, code, statusCode, false);
    this.name = 'AuthError';
  }
}

// Auth status enum
export enum AuthStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  VALIDATION_ERROR = 'validation_error'
}

// Response types for database functions
interface DbFunctionResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}

// Profile data from database
interface ProfileResponse {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id?: string;
  is_active: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  profile_image_url?: string;
  loyalty_points?: number;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error?: string;
  initialized: boolean;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  user: User;
  expires_at?: number;
}

// Base response type for auth operations
export interface BaseResponse {
  user: User | null;
  session: Session | null;
  error?: string;
}

// Supabase error types
interface SupabaseError {
  message: string;
  name: string;
}

interface SupabaseAuthError extends SupabaseError {
  status: number;
}

interface SupabaseDbError extends SupabaseError {
  code: string;
  details?: string;
}

type AuthResult = Promise<{
  data: any;
  user: User | null;
  session: Session | null;
  error: string | null;
  status: AuthStatus;
}>;

type SignOutResult = Promise<{
  error: string | null;
  status: AuthStatus;
}>;

type SupabaseErrorType = SupabaseAuthError | SupabaseDbError | Error;

interface SupabaseServiceInterface {
  signIn(email: string, password: string): AuthResult;
  signUp(email: string, password: string, userData?: SignupUserData): Promise<SignupResult>;
  signOut(): SignOutResult;
  getSupabase(): SupabaseClient;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService implements SupabaseServiceInterface {
  private readonly supabase: SupabaseClient;
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public readonly currentUser$: Observable<User | null>;
  private readonly signInCalls = new Map<string, number>();

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    @Inject(SUPABASE_CLIENT_CREATOR) private readonly createClient: typeof import('@supabase/supabase-js').createClient
  ) {
    this.supabase = this.createClient(
      environment.supabase.url,
      environment.supabase.key
    ) as SupabaseClient;
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.signInCalls = new Map();

    if (isPlatformBrowser(this.platformId)) {
      this.loadUser();
    }
  }

  private handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'An unknown error occurred';
  }

  private async handleRpcCall<T>(
    rpcName: string,
    params?: Record<string, unknown>
  ): Promise<DbFunctionResponse<T>> {
    try {
      const { data, error } = await this.supabase.rpc(rpcName, params || {});
      return { data: data as T, error: error as Error | null };
    } catch (err) {
      console.error(`Error calling RPC ${rpcName}:`, err);
      return { data: null, error: err as Error };
    }
  }

  private async mapUserData(authUser: SupabaseAuthUser): Promise<User> {
    const { data: profile, error } = await this.handleRpcCall<ProfileResponse>('get_current_user_profile');
    
    if (error) throw new AuthError('Failed to get user profile', 'PROFILE_ERROR', 500);
    if (!profile) throw new AuthError('Profile not found', 'PROFILE_NOT_FOUND', 404);

    return {
      id: authUser.id,
      email: authUser.email || '',
      full_name: profile.full_name || authUser.user_metadata?.['full_name'] || '',
      role: profile.role,
      created_at: new Date(profile.created_at),
      is_active: profile.is_active,
      phone: profile.phone || authUser.user_metadata?.['phone'],
      company_id: profile.company_id,
      profile_image_url: profile.profile_image_url,
      loyalty_points: profile.loyalty_points || 0
    };
  }

  private createSession(authSession: any, user: User): Session {
    return {
      access_token: authSession.access_token,
      refresh_token: authSession.refresh_token,
      user,
      expires_at: authSession.expires_at
    };
  }

  private async loadUser() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return;
      }
      
      if (session?.user) {
        try {
          // Get user data using RPC function
          const user = await this.mapUserData(session.user);
          this.currentUserSubject.next(user);
        } catch (error) {
          console.error('Error mapping user data:', error);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

    private async determineUserRole(requestedRole?: string): Promise<string> {
    try {
      // Get first user status using RPC
      const { data: firstUserStatus, error: statusError } = await this.supabase
        .rpc('get_first_user_status') as { data: { is_first: boolean }, error: Error | null };

      if (statusError) {
        console.error('Error checking first user status:', statusError);
        return 'customer';
      }

      // If first user, return admin role
      if (firstUserStatus.is_first) {
        return 'admin';
      }

      // If role is provided and valid, use it
      const validRoles = ['admin', 'company', 'customer'] as const;
      if (requestedRole && validRoles.includes(requestedRole as any)) {
        return requestedRole;
      }

      // Default to customer role
      return 'customer';
    } catch (error) {
      console.error('Error determining user role:', error);
      return 'customer';
    }
  }

  private rateLimit = new Map<string, { attempts: number; timestamp: number; blockedUntil?: number }>();

  private checkRateLimit(email: string): void {
    const now = Date.now();
    const limit = this.rateLimit.get(email);

    if (limit) {
      // Check if user is blocked
      if (limit.blockedUntil && now < limit.blockedUntil) {
        const waitSeconds = Math.ceil((limit.blockedUntil - now) / 1000);
        throw new RateLimitError(
          `Too many signup attempts. Please try again in ${waitSeconds} seconds`,
          waitSeconds
        );
      }

      // Check if the rate limit window has expired
      if (now - limit.timestamp > SIGNUP_CONSTANTS.RATE_LIMIT.WINDOW_MS) {
        this.rateLimit.set(email, { attempts: 1, timestamp: now });
      } else if (limit.attempts >= SIGNUP_CONSTANTS.RATE_LIMIT.MAX_ATTEMPTS) {
        // Block the user
        const blockedUntil = now + SIGNUP_CONSTANTS.RATE_LIMIT.BLOCK_DURATION_MS;
        this.rateLimit.set(email, {
          ...limit,
          blockedUntil,
        });
        const waitSeconds = Math.ceil(SIGNUP_CONSTANTS.RATE_LIMIT.BLOCK_DURATION_MS / 1000);
        throw new RateLimitError(
          `Too many signup attempts. Please try again in ${waitSeconds} seconds`,
          waitSeconds
        );
      } else {
        // Increment attempts within window
        this.rateLimit.set(email, {
          attempts: limit.attempts + 1,
          timestamp: limit.timestamp,
        });
      }
    } else {
      // First attempt
      this.rateLimit.set(email, { attempts: 1, timestamp: now });
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

      // Configure email template settings
      const emailRedirectTo = `${window.location.origin}/auth/verify-email`;

      // Using Supabase Auth for user creation with metadata
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: userData.fullName || '',
            role: userRole,
          },
          // Ensure email verification is required
          emailConfirm: true
        }
      });

  public getSupabase(): SupabaseClient {
    return this.supabase;
  }

  public async signIn(email: string, password: string): AuthResult {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve({
        data: null,
        user: null,
        session: null,
        error: 'Authentication not available during server-side rendering',
        status: AuthStatus.FAILED
      });
    }

    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) {
        return {
          data: null,
          user: null,
          session: null,
          error: this.handleError(authError),
          status: AuthStatus.FAILED
        };
      }

      if (!authData?.user) {
        return {
          data: null,
          user: null,
          session: null,
          error: 'No user data returned',
          status: AuthStatus.FAILED
        };
      }

      const user = await this.mapUserData(authData.user);
      const session = this.createSession(authData.session, user);
      
      return { 
        data: authData,
        user, 
        session, 
        error: null,
        status: AuthStatus.SUCCESS
      };
    } catch (err) {
      return {
        data: null,
        user: null,
        session: null,
        error: this.handleError(err),
        status: AuthStatus.FAILED
      };
    }
  }

  public async signOut(): SignOutResult {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve({
        error: 'Authentication not available during server-side rendering',
        status: AuthStatus.FAILED
      });
    }

    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      this.currentUserSubject.next(null);
      return { 
        error: null,
        status: AuthStatus.SUCCESS
      };
    } catch (error) {
      console.error('Error signing out:', error);
      return { 
        error: this.handleError(error),
        status: AuthStatus.FAILED
      };
    }
  }
}