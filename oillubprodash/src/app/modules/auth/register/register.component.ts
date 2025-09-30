import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserRole } from '../../../cores/models';
import { AuthService } from '../../../cores/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  roles: { value: UserRole; label: string; }[] = [
    { value: 'customer', label: 'Customer' },
    { value: 'company', label: 'Business/Company' }
    // Admin role is not available for public registration
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required],
      role: ['customer', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { fullName, email, password, role } = this.registerForm.value;

    this.authService.register(email, password, {
      full_name: fullName,
      role
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          // Navigate based on role
          if (role === 'company') {
            this.router.navigate(['company/dashboard']);
          } else {
            this.router.navigate(['customer/dashboard']);
          }
        },
        error: (error: Error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Registration failed. Please try again.';
        }
      });
  }

  getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    
    if (control?.errors && (control.touched || control.dirty)) {
      if (control.errors['required']) {
        return `${this.getFieldName(controlName)} is required`;
      }
      
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      
      if (control.errors['minlength']) {
        const requiredLength = control.errors['minlength'].requiredLength;
        return `${this.getFieldName(controlName)} must be at least ${requiredLength} characters long`;
      }
      
      if (control.errors['pattern'] && controlName === 'password') {
        return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
      }

      if (control.errors['requiredTrue'] && controlName === 'terms') {
        return 'You must accept the terms and conditions';
      }
    }

    // Check for form-level errors
    if (controlName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  private getFieldName(controlName: string): string {
    switch (controlName) {
      case 'fullName':
        return 'Full name';
      case 'email':
        return 'Email';
      case 'password':
        return 'Password';
      case 'confirmPassword':
        return 'Confirm password';
      case 'role':
        return 'Role';
      case 'terms':
        return 'Terms acceptance';
      default:
        return controlName;
    }
  }
}