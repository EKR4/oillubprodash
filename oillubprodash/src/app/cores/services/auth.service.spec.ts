import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

// Mock SupabaseService
class MockSupabaseService {
  private mockUser: any = null;
  private mockSession: any = null;
  private authStateCallback: any = null;

  getSupabase() {
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: (callback: any) => {
          this.authStateCallback = callback;
          return { unsubscribe: () => { this.authStateCallback = null; } };
        },
        signInWithPassword: (params: { email: string, password: string }) => {
          this.mockUser = {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' }
          };
          this.mockSession = {
            access_token: 'test-token',
            refresh_token: 'test-refresh-token',
            user: this.mockUser
          };
          if (this.authStateCallback) {
            this.authStateCallback('SIGNED_IN', this.mockSession);
          }
          return Promise.resolve({ data: { user: this.mockUser, session: this.mockSession }, error: null });
        },
        signOut: () => {
          this.mockUser = null;
          this.mockSession = null;
          if (this.authStateCallback) {
            this.authStateCallback('SIGNED_OUT', null);
          }
          return Promise.resolve({ error: null });
        },
        setSession: () => Promise.resolve({ data: { session: this.mockSession }, error: null })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: this.mockUser ? {
                id: this.mockUser.id,
                full_name: 'Test User',
                role: 'customer',
                created_at: new Date().toISOString(),
                is_active: true
              } : null,
              error: null
            })
          })
        })
      })
    };
  }

  signIn(email: string, password: string) {
    return this.getSupabase().auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.getSupabase().auth.signOut();
  }
}

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: SupabaseService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useClass: MockSupabaseService },
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    supabaseService = TestBed.inject(SupabaseService);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with null user', fakeAsync(async () => {
    const user = await firstValueFrom(service.currentUser$);
    expect(user).toBeNull();
  }));

  it('should have a valid session observable', fakeAsync(async () => {
    const session = await firstValueFrom(service.session$);
    expect(session).toBeNull();
  }));

  describe('login', () => {
    beforeEach(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it('should handle successful login', fakeAsync(async () => {
      const testEmail = 'test@example.com';
      const testPassword = 'password123';

      let response: any;
      service.login(testEmail, testPassword).subscribe(res => {
        response = res;
      });

      tick();

      expect(response.error).toBeNull();
      expect(response.session).toBeDefined();
    }));
  });

  describe('logout', () => {
    it('should handle successful logout', fakeAsync(async () => {
      let response: any;
      service.logout().subscribe(res => {
        response = res;
      });

      tick();

      expect(response.success).toBe(true);
      expect(response.error).toBeNull();
    }));
  });

  describe('isAuthenticated', () => {
    it('should return false when no user is logged in', fakeAsync(async () => {
      let isAuth: boolean | undefined;
      service.isAuthenticated().subscribe(auth => {
        isAuth = auth;
      });

      tick();
      expect(isAuth).toBe(false);
    }));
  });

  describe('hasRole', () => {
    it('should return false when no user is logged in', fakeAsync(async () => {
      let hasRole: boolean | undefined;
      service.hasRole('admin').subscribe(role => {
        hasRole = role;
      });

      tick();
      expect(hasRole).toBe(false);
    }));
  });

  describe('updateUserProfile', () => {
    it('should return null when no user is logged in', fakeAsync(async () => {
      let result: any;
      service.updateUserProfile({ full_name: 'Test User' }).subscribe(res => {
        result = res;
      });

      tick();
      expect(result).toBeNull();
    }));
  });
});
