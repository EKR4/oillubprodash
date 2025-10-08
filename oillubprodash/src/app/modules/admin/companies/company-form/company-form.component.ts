import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Company, CompanyStatus, CompanyType } from '../../../../cores/models/company';
import { SupabaseService } from '../../../../cores/services/supabase.service';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss']
})
export class CompanyFormComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  companyForm!: FormGroup<{
    name: FormControl<string>;
    company_type: FormControl<CompanyType>;
    business_registration_number: FormControl<string>;
    tax_id: FormControl<string | null>;
    industry: FormControl<string | null>;
    year_established: FormControl<number | null>;
    website: FormControl<string | null>;
    logo_url: FormControl<string | null>;
    description: FormControl<string | null>;
    email: FormControl<string>;
    phone: FormControl<string>;
    alternative_phone: FormControl<string | null>;
    primary_address: FormGroup<{
      street: FormControl<string>;
      city: FormControl<string>;
      state: FormControl<string | null>;
      postal_code: FormControl<string>;
      country: FormControl<string>;
      is_default: FormControl<boolean>;
    }>;
    status: FormControl<CompanyStatus>;
    verification_status: FormControl<'unverified' | 'pending' | 'verified' | 'rejected'>;
    credit_status: FormControl<'good' | 'warning' | 'hold'>;
    credit_limit: FormControl<number>;
    payment_terms: FormControl<string | null>;
    discount_rate: FormControl<number>;
    notes: FormControl<string | null>;
    verified: FormControl<boolean>;
    verification_date: FormControl<Date | null>;
  }>;
  
  isLoading = false;
  isEditMode = false;
  companyId: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Make Date available in template
  readonly currentYear = new Date().getFullYear();
  
  // For select dropdowns
  readonly companyTypes: CompanyType[] = ['distributor', 'retailer', 'workshop', 'fleet_operator', 'manufacturer', 'other'];
  readonly statuses: CompanyStatus[] = ['active', 'pending', 'suspended', 'inactive'];
  readonly verificationStatuses = ['unverified', 'pending', 'verified', 'rejected'] as const;
  readonly creditStatuses = ['good', 'warning', 'hold'] as const;
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
      name: this.fb.control('', [Validators.required, Validators.maxLength(100)]) as FormControl<string>,
      company_type: this.fb.control('manufacturer' as CompanyType, Validators.required),
      business_registration_number: this.fb.control('', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{5,20}$')]),
      tax_id: this.fb.control<string | null>('', Validators.pattern('^[A-Za-z0-9-]{5,20}$')),
      industry: this.fb.control<string | null>(''),
      year_established: this.fb.control<number | null>(null),
      website: this.fb.control<string | null>('', Validators.pattern('https?://.+')),
      logo_url: this.fb.control<string | null>(''),
      description: this.fb.control<string | null>('', Validators.maxLength(500)),
      
      // Contact Details
      email: this.fb.control('', [Validators.required, Validators.email]),
      phone: this.fb.control('', [Validators.required, Validators.pattern('^[+]?[0-9\\s-]{10,15}$')]),
      alternative_phone: this.fb.control<string | null>('', Validators.pattern('^[+]?[0-9\\s-]{10,15}$')),
      
      // Address
      primary_address: this.fb.group({
        street: this.fb.control('', Validators.required),
        city: this.fb.control('', Validators.required),
        state: this.fb.control<string | null>(''),
        postal_code: this.fb.control('', Validators.required),
        country: this.fb.control('Kenya', Validators.required),
        is_default: this.fb.control(true),
      }),
      
      // Company Settings
      status: this.fb.control('active' as CompanyStatus),
      verification_status: this.fb.control<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified'),
      credit_status: this.fb.control<'good' | 'warning' | 'hold'>('good'),
      credit_limit: this.fb.control(0, [Validators.min(0)]),
      payment_terms: this.fb.control<string | null>('30 days'),
      discount_rate: this.fb.control(0, [Validators.min(0), Validators.max(100)]),
      
      // Additional Information
      notes: this.fb.control<string | null>(''),
      verified: this.fb.control(false),
      verification_date: this.fb.control<Date | null>(null),
    });
  }

  async loadCompanyData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const supabase = this.supabase.getSupabase();
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', this.companyId!)
        .single();
      
      if (error) throw error;
      if (!company) throw new Error('Company not found');
      
      // Transform dates back to Date objects
      const formattedCompany = {
        ...company,
        created_at: company.created_at ? new Date(company.created_at) : undefined,
        updated_at: company.updated_at ? new Date(company.updated_at) : undefined,
        verification_date: company.verification_date ? new Date(company.verification_date) : null
      };
      
      this.companyForm.patchValue(formattedCompany);
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
    
    const formData = this.companyForm.getRawValue();
    
    // Transform data to match Company interface
    const companyData: Partial<Company> = {
      name: formData.name,
      company_type: formData.company_type,
      business_registration_number: formData.business_registration_number,
      email: formData.email,
      phone: formData.phone,
      status: formData.status,
      credit_status: formData.credit_status,
      credit_limit: formData.credit_limit,
      discount_rate: formData.discount_rate,
      verified: formData.verified,
      verification_status: formData.verification_status,
      
      // Handle optional fields
      tax_id: formData.tax_id || undefined,
      industry: formData.industry || undefined,
      year_established: formData.year_established || undefined,
      website: formData.website || undefined,
      logo_url: formData.logo_url || undefined,
      description: formData.description || undefined,
      alternative_phone: formData.alternative_phone || undefined,
      payment_terms: formData.payment_terms || undefined,
      notes: formData.notes || undefined,
      
      // Handle dates
      verification_date: formData.verified && !formData.verification_date ? 
        new Date() : formData.verification_date || undefined,
      
      // Handle address with proper null/undefined conversion
      primary_address: {
        street: formData.primary_address.street,
        city: formData.primary_address.city,
        postal_code: formData.primary_address.postal_code,
        country: formData.primary_address.country,
        is_default: formData.primary_address.is_default,
        state: formData.primary_address.state || undefined
      }
    };
    
    try {
      if (this.isEditMode) {
        await this.updateCompany(companyData);
      } else {
        await this.createCompany(companyData);
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
    const supabase = this.supabase.getSupabase();
    const { error } = await supabase
      .from('companies')
      .insert([{
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
  }
  
  private async updateCompany(data: Partial<Company>): Promise<void> {
    const supabase = this.supabase.getSupabase();
    const { error } = await supabase
      .from('companies')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.companyId!);
    
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