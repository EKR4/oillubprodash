import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../cores/services/supabase.service';
import { ReplacePipe } from '../../../pipes/replace.pipe';

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  enable_ssl: boolean;
}

interface PaymentSettings {
  gateway: 'stripe' | 'paypal';
  live_mode: boolean;
  api_key: string;
  secret_key: string;
  webhook_secret: string;
  currency: string;
  payment_methods: string[];
}

interface NotificationSettings {
  enable_email: boolean;
  enable_sms: boolean;
  enable_push: boolean;
  notify_on_order: boolean;
  notify_on_low_stock: boolean;
  notify_on_backup: boolean;
}

interface SystemSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  timezone: string;
  date_format: string;
  currency_format: string;
  default_language: string;
}

interface IntegrationSettings {
  sms_provider: string;
  sms_api_key: string;
  google_maps_key: string;
  analytics_id: string;
}

type SettingSection = 'system' | 'email' | 'payment' | 'notification' | 'integration';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ReplacePipe],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  systemForm!: FormGroup;
  emailForm!: FormGroup;
  paymentForm!: FormGroup;
  notificationForm!: FormGroup;
  integrationForm!: FormGroup;
  
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  activeSection: SettingSection = 'system';
  Math = Math;
  
  // Navigation sections
  readonly sections: SettingSection[] = ['system', 'email', 'payment', 'notification', 'integration'];
  
  // Options for dropdowns
  timezones = [
    'UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6',
    'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12',
    'UTC-1', 'UTC-2', 'UTC-3', 'UTC-4', 'UTC-5', 'UTC-6',
    'UTC-7', 'UTC-8', 'UTC-9', 'UTC-10', 'UTC-11', 'UTC-12'
  ];
  
  dateFormats = [
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'MM-DD-YYYY'
  ];
  
  languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' }
  ];
  
  currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' },
    { code: 'AUD', symbol: 'A$' },
    { code: 'CAD', symbol: 'C$' }
  ];
  
  paymentMethods = [
    'credit_card',
    'debit_card',
    'bank_transfer',
    'crypto',
    'wallet'
  ];

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadSettings();
  }

  private initForms(): void {
    this.systemForm = this.fb.group({
      company_name: ['', Validators.required],
      company_address: ['', Validators.required],
      company_phone: ['', Validators.required],
      company_email: ['', [Validators.required, Validators.email]],
      timezone: ['UTC', Validators.required],
      date_format: ['DD/MM/YYYY', Validators.required],
      currency_format: ['USD', Validators.required],
      default_language: ['en', Validators.required]
    });

    this.emailForm = this.fb.group({
      smtp_host: ['', Validators.required],
      smtp_port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
      smtp_user: ['', Validators.required],
      smtp_password: ['', Validators.required],
      from_email: ['', [Validators.required, Validators.email]],
      from_name: ['', Validators.required],
      enable_ssl: [true]
    });

    this.paymentForm = this.fb.group({
      gateway: ['stripe', Validators.required],
      live_mode: [false],
      api_key: ['', Validators.required],
      secret_key: ['', Validators.required],
      webhook_secret: ['', Validators.required],
      currency: ['USD', Validators.required],
      payment_methods: [[]]
    });

    this.notificationForm = this.fb.group({
      enable_email: [true],
      enable_sms: [false],
      enable_push: [false],
      notify_on_order: [true],
      notify_on_low_stock: [true],
      notify_on_backup: [true]
    });

    this.integrationForm = this.fb.group({
      sms_provider: [''],
      sms_api_key: [''],
      google_maps_key: [''],
      analytics_id: ['']
    });
  }

  private async loadSettings(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const { data, error } = await this.supabaseService.getItems('system_settings');
      
      if (error) throw error;
      
      const typedData = data as unknown as Array<{
        type: SettingSection;
        settings: any;
      }>;

      typedData.forEach(item => {
        switch (item.type) {
          case 'system':
            this.systemForm.patchValue(item.settings);
            break;
          case 'email':
            this.emailForm.patchValue(item.settings);
            break;
          case 'payment':
            this.paymentForm.patchValue(item.settings);
            break;
          case 'notification':
            this.notificationForm.patchValue(item.settings);
            break;
          case 'integration':
            this.integrationForm.patchValue(item.settings);
            break;
        }
      });
    } catch (error: any) {
      this.errorMessage = `Error loading settings: ${error.message}`;
      console.error('Error loading settings:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async saveSettings(section: SettingSection): Promise<void> {
    let form: FormGroup;
    switch (section) {
      case 'system':
        form = this.systemForm;
        break;
      case 'email':
        form = this.emailForm;
        break;
      case 'payment':
        form = this.paymentForm;
        break;
      case 'notification':
        form = this.notificationForm;
        break;
      case 'integration':
        form = this.integrationForm;
        break;
      default:
        throw new Error('Invalid section');
    }

    if (form.invalid) {
      this.markFormGroupTouched(form);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const { error } = await this.supabaseService.updateItem(
        'system_settings',
        section,
        {
          type: section,
          settings: form.value,
          updated_at: new Date()
        }
      );

      if (error) throw error;
      
      this.successMessage = 'Settings saved successfully!';
    } catch (error: any) {
      this.errorMessage = `Error saving settings: ${error.message}`;
      console.error('Error saving settings:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  setActiveSection(section: SettingSection): void {
    this.activeSection = section;
    this.errorMessage = null;
    this.successMessage = null;
  }

  testEmailSettings(): void {
    if (this.emailForm.invalid) {
      this.markFormGroupTouched(this.emailForm);
      return;
    }

    // In a real application, this would send a test email
    alert('Test email functionality would be implemented here');
  }

  testPaymentSettings(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched(this.paymentForm);
      return;
    }

    // In a real application, this would test the payment gateway
    alert('Test payment functionality would be implemented here');
  }

  updatePaymentMethods(event: Event, method: string): void {
    const checkbox = event.target as HTMLInputElement;
    const paymentMethods = this.paymentForm.get('payment_methods')?.value || [];
    
    if (checkbox.checked) {
      if (!paymentMethods.includes(method)) {
        this.paymentForm.patchValue({
          payment_methods: [...paymentMethods, method]
        });
      }
    } else {
      this.paymentForm.patchValue({
        payment_methods: paymentMethods.filter((m: string) => m !== method)
      });
    }
  }

  resetSection(section: SettingSection): void {
    if (!confirm('Are you sure you want to reset these settings to default values?')) {
      return;
    }

    switch (section) {
      case 'system':
        this.systemForm.reset({
          timezone: 'UTC',
          date_format: 'DD/MM/YYYY',
          currency_format: 'USD',
          default_language: 'en'
        });
        break;
      case 'email':
        this.emailForm.reset({
          smtp_port: 587,
          enable_ssl: true
        });
        break;
      case 'payment':
        this.paymentForm.reset({
          gateway: 'stripe',
          live_mode: false,
          currency: 'USD'
        });
        break;
      case 'notification':
        this.notificationForm.reset({
          enable_email: true,
          notify_on_order: true,
          notify_on_low_stock: true,
          notify_on_backup: true
        });
        break;
      case 'integration':
        this.integrationForm.reset();
        break;
    }
  }
}