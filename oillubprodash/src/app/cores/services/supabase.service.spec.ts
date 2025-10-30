import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../enviroments/environment';
import { firstValueFrom } from 'rxjs';
import { SUPABASE_CLIENT_CREATOR } from '../models/supabase-token';
import { createMockSupabase, createTestUser } from '../test/mock-supabase';

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mock: ReturnType<typeof createMockSupabase>;
  let mockClientCreator: jasmine.Spy;

  beforeEach(() => {
    mock = createMockSupabase();
    mockClientCreator = jasmine.createSpy('createClient').and.returnValue(mock.mockClient);
    
    TestBed.configureTestingModule({
      providers: [
        SupabaseService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SUPABASE_CLIENT_CREATOR, useValue: mockClientCreator }
      ]
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize Supabase client with correct credentials', () => {
    expect(mockClientCreator).toHaveBeenCalledWith(
      environment.supabase.url,
      environment.supabase.key
    );
  });

  describe('User Authentication', () => {
    const testUser = createTestUser('test-id', 'test@example.com', 'Test User');

    beforeEach(() => {
      // Reset and setup auth mocks
      mock.mockAuth.getSession.and.returnValue(Promise.resolve({
        data: { session: null },
        error: null
      }));

      mock.mockAuth.getUser.and.returnValue(Promise.resolve({
        data: { user: null },
        error: null
      }));

      // Setup authentication mock responses
      mock.mockAuth.signInWithPassword.and.returnValue(Promise.resolve({
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            user_metadata: { full_name: testUser.full_name }
          },
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            user: {
              id: testUser.id,
              email: testUser.email,
              user_metadata: { full_name: testUser.full_name }
            }
          }
        },
        error: null
      }));

      // Setup database mock responses
      const mockProfileData = {
        id: testUser.id,
        full_name: testUser.full_name,
        role: testUser.role,
        created_at: testUser.created_at,
        is_active: testUser.is_active,
        phone: testUser.phone,
        company_id: testUser.company_id,
        user_profiles: [{
          id: testUser.profile?.id,
          user_id: testUser.id,
          created_at: testUser.profile?.created_at,
          street: testUser.profile?.street,
          city: testUser.profile?.city,
          state: testUser.profile?.state,
          postal_code: testUser.profile?.postal_code,
          country: testUser.profile?.country,
          preferred_language: 'en',
          preferred_currency: 'KES'
        }],
        company: testUser.company
      };

      mock.mockFrom.and.callFake(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: mockProfileData,
              error: null
            })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => Promise.resolve({
              data: mockProfileData,
              error: null
            })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockProfileData,
              error: null
            })
          })
        })
      }));
    });

    it('should sign in user successfully', fakeAsync(async () => {
      const signInPromise = service.signIn('test@example.com', 'password');
      tick();
      const result = await signInPromise;
      tick();
      
      expect(result.error).toBeNull();
      expect(result.data?.user).toBeTruthy();
      expect(result.data?.session).toBeTruthy();
    }));

    it('should load user profile after sign in', fakeAsync(async () => {
      // Setup mock responses
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        user: {
          id: testUser.id,
          email: testUser.email,
          user_metadata: { full_name: testUser.full_name }
        }
      };

      // Set up mock session and auth user
      mock.mockAuth.signInWithPassword.and.returnValue(Promise.resolve({
        data: { session: mockSession, user: mockSession.user },
        error: null
      }));

      // Set up mock profile data
      const mockProfileData = {
        id: testUser.id,
        full_name: testUser.full_name,
        role: testUser.role,
        created_at: testUser.created_at,
        is_active: testUser.is_active,
        phone: testUser.phone,
        company_id: testUser.company_id,
        user_profiles: [{
          id: testUser.profile?.id,
          user_id: testUser.id,
          created_at: testUser.profile?.created_at,
          street: testUser.profile?.street,
          city: testUser.profile?.city,
          state: testUser.profile?.state,
          postal_code: testUser.profile?.postal_code,
          country: testUser.profile?.country,
          preferred_language: 'en',
          preferred_currency: 'KES'
        }],
        company: testUser.company
      };

      mock.mockFrom.and.returnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: mockProfileData,
              error: null
            })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => Promise.resolve({
              data: mockProfileData,
              error: null
            })
          })
        })
      });

      // Perform sign in
      const signInPromise = service.signIn('test@example.com', 'password');
      tick();
      await signInPromise;
      tick();
      
      const userPromise = firstValueFrom(service.currentUser$);
      tick();
      const user = await userPromise;
      tick();
      
      expect(user).toBeTruthy();
      expect(user?.email).toBe(testUser.email);
      expect(user?.full_name).toBe(testUser.full_name);
      expect(user?.role).toBe('customer' as const);
    }));

    it('should sign up new user', fakeAsync(async () => {
      const newUser = createTestUser('new-id', 'new@example.com', 'New User');

      mock.mockAuth.signUp.and.returnValue(Promise.resolve({
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            user_metadata: { full_name: newUser.full_name }
          },
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            user: {
              id: newUser.id,
              email: newUser.email,
              user_metadata: { full_name: newUser.full_name }
            }
          }
        },
        error: null
      }));

      mock.mockFrom.and.returnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: newUser,
              error: null
            })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => Promise.resolve({
              data: newUser,
              error: null
            })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: newUser,
              error: null
            })
          })
        })
      });

      // Call sign up
      const signUpPromise = service.signUp(
        newUser.email,
        'password123',
        {
          fullName: newUser.full_name, role: newUser.role,
          email: '',
          password: ''
        }
      );
      tick();
      const result = await signUpPromise;
      tick();

      expect(result.error).toBeNull();
      expect(result.data?.user?.email).toBe(newUser.email);
    }));

    it('should sign out user', fakeAsync(async () => {
      // First sign in
      await service.signIn('test@example.com', 'password');
      
      // Then sign out
      mock.mockAuth.signOut.and.returnValue(Promise.resolve({ error: null }));
      const result = await service.signOut();
      const user = await firstValueFrom(service.currentUser$);

      expect(result.error).toBeNull();
      expect(user).toBeNull();
    }));

    it('should handle sign in errors', fakeAsync(async () => {
      const errorMessage = 'Invalid credentials';
      mock.mockAuth.signInWithPassword.and.returnValue(Promise.resolve({
        data: { user: null, session: null },
        error: new Error(errorMessage)
      }));

      const signInPromise = service.signIn('test@example.com', 'wrong-password');
      tick();
      const result = await signInPromise;
      tick();
      
      expect(result.error).toBeTruthy();
      expect((result.error as unknown as Error).message).toBe(errorMessage);
    }));
  });

  describe('Server-side rendering', () => {
    let serverService: SupabaseService;
    let serverMock: ReturnType<typeof createMockSupabase>;
    let serverMockClientCreator: jasmine.Spy;

    beforeEach(() => {
      serverMock = createMockSupabase();
      serverMockClientCreator = jasmine.createSpy('createClient').and.returnValue(serverMock.mockClient);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SupabaseService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SUPABASE_CLIENT_CREATOR, useValue: serverMockClientCreator }
        ]
      });
      serverService = TestBed.inject(SupabaseService);
    });

    it('should not load user on server side', fakeAsync(async () => {
      const user = await firstValueFrom(serverService.currentUser$);
      expect(user).toBeNull();
    }));

    it('should return auth error for sign in on server side', fakeAsync(async () => {
      const result = await serverService.signIn('test@example.com', 'password');
      expect(result.error).toBeTruthy();
      expect((result.error as any).message).toContain('server-side rendering');
    }));

    it('should return auth error for sign up on server side', fakeAsync(async () => {
      const result = await serverService.signUp('test@example.com', 'password');
      expect(result.error).toBeTruthy();
      expect((result.error as any).message).toContain('server-side rendering');
    }));
  });

  describe('Role Determination', () => {
    it('should assign admin role to first user', fakeAsync(async () => {
      const adminUser = createTestUser('admin-id', 'admin@example.com', 'Admin User', 'admin');

      // Mock the role determination RPC call
      mock.mockRpc.and.returnValue(Promise.resolve({
        data: { is_first: true },
        error: null
      }));

      // Mock the signup auth response
      mock.mockAuth.signUp.and.returnValue(Promise.resolve({
        data: {
          user: {
            id: adminUser.id,
            email: adminUser.email,
            user_metadata: { 
              full_name: adminUser.full_name,
              role: 'admin'
            }
          },
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            user: {
              id: adminUser.id,
              email: adminUser.email,
              user_metadata: { 
                full_name: adminUser.full_name,
                role: 'admin'
              }
            }
          }
        },
        error: null
      }));

      // Mock database responses
      const profileData = {
        id: adminUser.id,
        full_name: adminUser.full_name,
        role: 'admin',
        created_at: new Date().toISOString(),
        is_active: true,
        phone: '',
        company_id: null,
        last_login: new Date().toISOString(),
        user_profiles: [{
          id: `profile-${adminUser.id}`,
          user_id: adminUser.id,
          created_at: new Date().toISOString(),
          street: 'Test Street',
          city: 'Test City',
          state: '',
          postal_code: '',
          country: '',
          preferred_language: 'en',
          preferred_currency: 'KES'
        }],
        company: null
      };

      // Mock from chain
      mock.mockFrom.and.callFake((table) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profileData, error: null })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => Promise.resolve({ data: profileData, error: null })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: profileData, error: null })
          })
        })
      }));

      const signUpPromise = service.signUp('admin@example.com', 'password');
      tick();
      await signUpPromise;
      tick();
      
      const userPromise = firstValueFrom(service.currentUser$);
      tick();
      const user = await userPromise;
      tick();
      
      expect(user?.role).toBe('admin');
    }));

    it('should assign requested role to non-first user', fakeAsync(async () => {
      const companyUser = createTestUser('user-id', 'user@example.com', 'Company User', 'company');

      // Mock the role determination RPC call
      mock.mockRpc.and.returnValue(Promise.resolve({
        data: { is_first: false },
        error: null
      }));

      // Mock the signup auth response
      mock.mockAuth.signUp.and.returnValue(Promise.resolve({
        data: {
          user: {
            id: companyUser.id,
            email: companyUser.email,
            user_metadata: { 
              full_name: companyUser.full_name,
              role: 'company'
            }
          },
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            user: {
              id: companyUser.id,
              email: companyUser.email,
              user_metadata: { 
                full_name: companyUser.full_name,
                role: 'company'
              }
            }
          }
        },
        error: null
      }));

      // Mock database responses
      const profileData = {
        id: companyUser.id,
        full_name: companyUser.full_name,
        role: 'company',
        created_at: new Date().toISOString(),
        is_active: true,
        phone: '',
        company_id: null,
        last_login: new Date().toISOString(),
        user_profiles: [{
          id: `profile-${companyUser.id}`,
          user_id: companyUser.id,
          created_at: new Date().toISOString(),
          street: 'Test Street',
          city: 'Test City',
          state: '',
          postal_code: '',
          country: '',
          preferred_language: 'en',
          preferred_currency: 'KES'
        }],
        company: null
      };

      // Mock from chain
      mock.mockFrom.and.callFake((table) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profileData, error: null })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => Promise.resolve({ data: profileData, error: null })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: profileData, error: null })
          })
        })
      }));

      const signUpPromise = service.signUp('user@example.com', 'password', {
        role: 'company',
        email: '',
        password: ''
      });
      tick();
      await signUpPromise;
      tick();
      
      const userPromise = firstValueFrom(service.currentUser$);
      tick();
      const user = await userPromise;
      tick();
      
      expect(user?.role).toBe('company');
    }));
  });
});
