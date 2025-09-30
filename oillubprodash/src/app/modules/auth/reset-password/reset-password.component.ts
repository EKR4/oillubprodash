import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../cores/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm!: FormGroup;
  isLoading = false;
  error: string | null = null;
  isSuccess = false;
  token: string | null = null;
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Get token from URL parameters
    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        this.token = params['token'] || null;
        if (!this.token) {
          this.error = 'Invalid or missing password reset token. Please request a new password reset link.';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  initForm(): void {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.isSuccess = false;

    const { password } = this.resetPasswordForm.value;

    this.subscription.add(
      this.authService.updatePassword(password).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isSuccess = response.success;
          
          if (response.success) {
            // Redirect to login after successful password reset
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 3000);
          } else if (response.error) {
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

  private getErrorMessage(error: Error | any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    // Extract message from Supabase error
    if (error?.message) {
      if (error.message.includes('Token has expired')) {
        return 'Your password reset link has expired. Please request a new one.';
      }
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

  get passwordControl() { return this.resetPasswordForm.get('password'); }
  get confirmPasswordControl() { return this.resetPasswordForm.get('confirmPassword'); }
  get passwordMismatch() { return this.resetPasswordForm.hasError('mismatch') && this.confirmPasswordControl?.touched; }
}