import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Company, CompanyStatus, CompanyType } from '../../../cores/models/company';
import { SupabaseService } from '../../../cores/services/supabase.service';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss']
})
export class CompanyFormComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  companyForm!: FormGroup;
  isLoading: boolean = false;
  isEditMode: boolean = false;
  companyId: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Make Date available in template
  currentYear = new Date().getFullYear();
  
  // For select dropdowns
  companyTypes: CompanyType[] = ['distributor', 'retailer', 'workshop', 'fleet_operator', 'manufacturer', 'other'];
  statuses: CompanyStatus[] = ['active', 'pending', 'suspended', 'inactive'];
  verificationStatuses = ['unverified', 'pending', 'verified', 'rejected'];
  creditStatuses = ['good', 'warning', 'hold'];
  industries = [
    'Automotive',
    'Aviation',
    'Manufacturing',
    'Construction',
    'Mining',
    'Agriculture',
    'Transportation',
    'Marine',
    'Energy',
    'Other'
  ];
  
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.initializeForm();
    
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['id']) {
        this.companyId = params['id'];
        this.isEditMode = true;
        this.loadCompanyData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      company_type: ['manufacturer', Validators.required],
      business_registration_number: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{5,20}$')]],
      tax_id: ['', Validators.pattern('^[A-Za-z0-9-]{5,20}$')],
      industry: [''],
      year_established: [null],
      website: ['', Validators.pattern('https?://.+')],
      logo_url: [''],
      description: ['', Validators.maxLength(500)],
      
      // Contact Details
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[+]?[0-9\\s-]{10,15}$')]],
      alternative_phone: ['', Validators.pattern('^[+]?[0-9\\s-]{10,15}$')],
      
      // Address
      primary_address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: [''],
        postal_code: ['', Validators.required],
        country: ['Kenya', Validators.required],
      }),
      
      // Company Settings
      status: ['active'],
      verification_status: ['unverified'],
      credit_status: ['good'],
      credit_limit: [0, [Validators.min(0)]],
      payment_terms: ['30 days'],
      discount_rate: [0, [Validators.min(0), Validators.max(100)]],
      
      // Additional Information
      notes: [''],
      verified: [false],
      verification_date: [null],
    });
  }

  async loadCompanyData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const { data: company, error } = await this.supabase
        .getItemById('companies', this.companyId!);
      
      if (error) throw error;
      if (!company) throw new Error('Company not found');
      
      this.companyForm.patchValue(company);
    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.companyForm.invalid) {
      this.markFormGroupTouched(this.companyForm);
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    
    const formData = this.companyForm.value;
    
    // Set verification date if verified checkbox is true
    if (formData.verified && !formData.verification_date) {
      formData.verification_date = new Date();
    }
    
    try {
      if (this.isEditMode) {
        await this.updateCompany(formData);
      } else {
        await this.createCompany(formData);
      }
      
      this.successMessage = `Company ${this.isEditMode ? 'updated' : 'created'} successfully!`;
      
      // Navigate after a brief delay to show the success message
      setTimeout(() => {
        this.router.navigate(['/admin/companies']);
      }, 1500);
    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.isLoading = false;
    }
  }
  
  private async createCompany(data: Partial<Company>): Promise<void> {
    const { error } = await this.supabase.createItem('companies', {
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    if (error) throw error;
  }
  
  private async updateCompany(data: Partial<Company>): Promise<void> {
    const { error } = await this.supabase.updateItem('companies', this.companyId!, {
      ...data,
      updated_at: new Date()
    });
    
    if (error) throw error;
  }
  
  // Utility method to mark all form controls as touched to trigger validation messages
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if ((control as FormGroup).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
  
  // Helper method to get company type label for display
  getCompanyTypeLabel(type: CompanyType): string {
    return type.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Helper method to get status label for display
  getStatusLabel(status: CompanyStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  // Form validation helpers
  getErrorMessage(controlName: string): string {
    const control = this.companyForm.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['maxlength']) return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return 'Please enter a valid format';
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;
    if (errors['max']) return `Maximum value is ${errors['max'].max}`;

    return 'Invalid value';
  }

  // Address form validation helper
  getAddressErrorMessage(field: string): string {
    const control = this.companyForm.get(`primary_address.${field}`);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    return 'Invalid value';
  }

  // Public navigation method
  navigateToCompanies(): void {
    this.router.navigate(['/admin/companies']);
  }
}