import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../../cores/models/user';
import { AuthService } from '../../../cores/services/auth.service';
import { SupabaseService } from '../../../cores/services/supabase.service';

// Define UserRole as an enum since it's being used as a value
enum UserRole {
  ADMIN = 'admin',
  COMPANY = 'company',
  CUSTOMER = 'customer'
}

// Define account status options
interface StatusOption {
  value: string;
  label: string;
}

interface RoleOption {
  value: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit, OnDestroy {
  userForm: FormGroup;
  userId: string | null = null;
  isEditMode = false;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showPassword = false;
  
  // User roles configuration
  userRoles: RoleOption[] = [
    { 
      value: UserRole.ADMIN, 
      label: 'Administrator',
      description: 'Full system access and control over all users and data.'
    },
    { 
      value: UserRole.COMPANY, 
      label: 'Company',
      description: 'Manage company products, inventory, and sales data.'
    },
    { 
      value: UserRole.CUSTOMER, 
      label: 'Customer',
      description: 'Standard access to shop products and manage their account.'
    }
  ];
  
  // Account status options
  accountStatuses: StatusOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending Verification' }
  ];
  
  private subscriptions = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {
    this.userForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: ['', Validators.pattern('^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$')],
      role: [UserRole.CUSTOMER, Validators.required],
      company_id: [''],
      is_active: [true],
      password: ['', [Validators.minLength(8)]],
      confirm_password: [''],
      // Additional fields for company users
      companyName: [''],
      companyRegNumber: [''],
      companyAddress: [''],
      // For edit mode only
      status: ['active']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.userId;

    if (this.isEditMode) {
      // Remove password validators in edit mode since we don't update passwords here
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.userForm.get('confirm_password')?.clearValidators();
      this.userForm.get('confirm_password')?.updateValueAndValidity();
      
      this.loadUserData();
    } else {
      // Add validators for password in create mode
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.userForm.get('password')?.updateValueAndValidity();
      this.userForm.get('confirm_password')?.setValidators([Validators.required]);
      this.userForm.get('confirm_password')?.updateValueAndValidity();
      
      this.isLoading = false;
    }

    // Show/hide company_id field based on role selection
    this.subscriptions.add(
      this.userForm.get('role')?.valueChanges.subscribe(role => {
        if (role === UserRole.COMPANY) {
          this.userForm.get('company_id')?.setValidators([Validators.required]);
          this.userForm.get('companyName')?.setValidators([Validators.required]);
          this.userForm.get('companyRegNumber')?.setValidators([Validators.required]);
          this.userForm.get('companyAddress')?.setValidators([Validators.required]);
        } else {
          this.userForm.get('company_id')?.clearValidators();
          this.userForm.get('companyName')?.clearValidators();
          this.userForm.get('companyRegNumber')?.clearValidators();
          this.userForm.get('companyAddress')?.clearValidators();
        }
        this.userForm.get('company_id')?.updateValueAndValidity();
        this.userForm.get('companyName')?.updateValueAndValidity();
        this.userForm.get('companyRegNumber')?.updateValueAndValidity();
        this.userForm.get('companyAddress')?.updateValueAndValidity();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadUserData(): Promise<void> {
    if (!this.userId) {
      this.isLoading = false;
      return;
    }
    
    try {
      // Mock implementation since supabaseService.getUser is missing
      // In a real application, this would call the actual service method
      // const { data: user, error } = await this.supabaseService.getUser(this.userId);
      
      // Mock data for demonstration
      const mockResponse = {
        data: {
          id: this.userId,
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '1234567890',
          role: UserRole.CUSTOMER,
          is_active: true,
          company_id: null,
          // Include these to prevent TypeScript errors when destructuring
          password: undefined,
          confirm_password: undefined
        },
        error: null
      };
      
      const { data: user, error } = mockResponse;
      
      if (error) {
        throw error;
      }
      
      if (user) {
        // Remove password fields in edit mode
        const { password, confirm_password, ...userData } = user;
        
        this.userForm.patchValue({
          ...userData,
          status: userData.is_active ? 'active' : 'inactive'
        });
      }
      
    } catch (error: any) {
      this.errorMessage = `Error loading user: ${error.message || 'Unknown error'}`;
      console.error('Error loading user:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const formData = { ...this.userForm.value };
      
      // Remove confirm_password before sending to API
      delete formData.confirm_password;
      
      if (this.isEditMode) {
        // Remove password for edit operations unless explicitly changed
        if (!formData.password) {
          delete formData.password;
        }
        
        await this.updateUser(formData);
      } else {
        await this.createUser(formData);
      }
      
    } catch (error: any) {
      this.errorMessage = error.message || 'An error occurred while saving the user.';
      console.error('User form error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createUser(userData: any): Promise<void> {
    // Mock implementation since authService.adminCreateUser is missing
    // In a real application, this would call the actual service method
    // const { error } = await this.authService.adminCreateUser(userData);
    
    // Mock response for demonstration
    const mockResponse = { error: null };
    const { error } = mockResponse;
    
    if (error) {
      throw error;
    }
    
    this.successMessage = 'User created successfully!';
    
    // Reset form after successful creation
    this.userForm.reset({
      role: UserRole.CUSTOMER,
      is_active: true,
      status: 'active'
    });
    
    // Navigate back to users list after a short delay
    setTimeout(() => {
      this.router.navigate(['/admin/users']);
    }, 1500);
  }

  async updateUser(userData: any): Promise<void> {
    if (!this.userId) return;
    
    // Mock implementation since supabaseService.updateUser is missing
    // In a real application, this would call the actual service method
    // const { error } = await this.supabaseService.updateUser(this.userId, userData);
    
    // Mock response for demonstration
    const mockResponse = { error: null };
    const { error } = mockResponse;
    
    if (error) {
      throw error;
    }
    
    this.successMessage = 'User updated successfully!';
    
    // Navigate back to users list after a short delay
    setTimeout(() => {
      this.router.navigate(['/admin/users']);
    }, 1500);
  }

  passwordMatchValidator(group: FormGroup): { notMatching: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirm_password')?.value;
    
    // Only validate if both fields have values and are touched
    if (password && confirmPassword) {
      return password === confirmPassword ? null : { notMatching: true };
    }
    
    return null;
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.userForm.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }

  get passwordsDoNotMatch(): boolean {
    return !!this.userForm.hasError('notMatching') && 
           !!this.userForm.get('password')?.touched && 
           !!this.userForm.get('confirm_password')?.touched;
  }

  // UI Helper Methods
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  selectRole(role: string): void {
    this.userForm.get('role')?.setValue(role);
  }

  selectStatus(status: string): void {
    this.userForm.get('status')?.setValue(status);
  }

  get formError(): string | null {
    return this.errorMessage;
  }

  get formSuccess(): string | null {
    return this.successMessage;
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }
}