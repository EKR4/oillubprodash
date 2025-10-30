import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { AuthService } from '../../cores/services/auth.service';
import { SupabaseService } from '../../cores/services/supabase.service';
import { BehaviorSubject } from 'rxjs';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockSupabaseService: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser'], {
      currentUser$: new BehaviorSubject(null)
    });
    mockSupabaseService = jasmine.createSpyObj('SupabaseService', ['getSupabase']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PaymentService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    });
    service = TestBed.inject(PaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
