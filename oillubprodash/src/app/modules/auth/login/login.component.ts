import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SupabaseService } from '../../../cores/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Subscribe to current user changes
    this.supabaseService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // Redirect based on user role
          switch (user.role) {
            case 'admin':
              this.router.navigate(['/admin/dashboard']);
              break;
            case 'company':
              this.router.navigate(['/company/dashboard']);
              break;
            case 'customer':
              this.router.navigate(['/customer/dashboard']);
              break;
            default:
              this.router.navigate(['/']);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isLoading = true;
    this.error = null;

    const { email, password } = this.loginForm.value;

    try {
      const { data, error } = await this.supabaseService.signIn(email, password);
      
      if (error) {
        this.error = this.getErrorMessage(error);
        this.isLoading = false;
        return;
      }

      // Set loading to false after successful login
      this.isLoading = false;
      // Navigation will be handled by the currentUser$ subscription
    } catch (err: any) {
      this.error = this.getErrorMessage(err);
      this.isLoading = false;
    }
  }

  private getErrorMessage(error: any): string {
    if (error.message) {
      switch (error.message) {
        case 'Invalid login credentials':
          return 'Invalid email or password';
        case 'Email not confirmed':
          return 'Please verify your email address';
        default:
          return error.message;
      }
    }
    return 'An unexpected error occurred';
  }

  get emailControl() { return this.loginForm.get('email'); }
  get passwordControl() { return this.loginForm.get('password'); }
}