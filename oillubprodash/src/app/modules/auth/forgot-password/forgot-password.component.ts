import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../cores/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  error: string | null = null;
  isSuccess = false;
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Redirect if already logged in
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.redirectBasedOnRole(user.role);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  initForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.markFormGroupTouched(this.forgotPasswordForm);
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.isSuccess = false;

    const { email } = this.forgotPasswordForm.value;

    this.subscription.add(
      this.authService.requestPasswordReset(email).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isSuccess = response.success;
          if (!response.success && response.error) {
            this.error = this.getErrorMessage(response.error);
          }
        },
        error: (err: Error) => {
          this.isLoading = false;
          this.error = this.getErrorMessage(err);
        }
      })
    );
  }

  redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'company':
        this.router.navigate(['/company/dashboard']);
        break;
      case 'customer':
      default:
        this.router.navigate(['/customer/dashboard']);
        break;
    }
  }

  private getErrorMessage(error: Error | any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    // Extract message from Supabase error
    if (error?.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again later.';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  get emailControl() { return this.forgotPasswordForm.get('email'); }
}