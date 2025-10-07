import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../../cores/services/auth.service';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent implements OnInit {
  passwordForm!: FormGroup;
  isLoading = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit() {
    // Form is already initialized in constructor
  }

  private initForm() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/),
        this.validateNewPassword.bind(this)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator.bind(this) });
  }

  private validateNewPassword(control: AbstractControl): ValidationErrors | null {
    const currentPassword = this.passwordForm?.get('currentPassword')?.value;
    const newPassword = control.value;
    
    if (currentPassword && newPassword && currentPassword === newPassword) {
      return { sameAsOld: true };
    }
    return null;
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    if (!group) return null;
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  async onSubmit() {
    if (this.passwordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const { currentPassword, newPassword } = this.passwordForm.value;
        if (!currentPassword || !newPassword) {
          throw new Error('Password values are required');
        }
        await this.authService.updatePassword(newPassword);
        this.successMessage = 'Password updated successfully';
        this.passwordForm.reset();
        setTimeout(() => {
          this.router.navigate(['/account/profile']);
        }, 2000);
      } catch (error) {
        this.errorMessage = error instanceof Error ? 
          error.message : 
          'An error occurred while updating the password';
        console.error('Error changing password:', error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = 'Please fix the errors in the form';
      Object.keys(this.passwordForm.controls).forEach(key => {
        const control = this.passwordForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }
}
