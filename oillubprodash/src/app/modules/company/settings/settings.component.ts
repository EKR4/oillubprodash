import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface CompanySettings {
  general: {
    companyName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    website: string;
    logo: string;
  };
  notifications: {
    lowStockAlerts: boolean;
    orderNotifications: boolean;
    customerReviews: boolean;
    newsletterUpdates: boolean;
  };
  preferences: {
    currency: string;
    dateFormat: string;
    timeZone: string;
    language: string;
  };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class CompanySettingsComponent implements OnInit {
  settingsForm: FormGroup;
  isLoading = true;
  isSaving = false;

  currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CAD', name: 'Canadian Dollar' }
  ];

  dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
  ];

  languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' }
  ];

  constructor(private fb: FormBuilder) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  createForm() {
    this.settingsForm = this.fb.group({
      general: this.fb.group({
        companyName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        address: this.fb.group({
          street: ['', Validators.required],
          city: ['', Validators.required],
          state: ['', Validators.required],
          zip: ['', Validators.required],
          country: ['', Validators.required]
        }),
        website: ['', Validators.pattern('https?://.+')],
        logo: ['']
      }),
      notifications: this.fb.group({
        lowStockAlerts: [true],
        orderNotifications: [true],
        customerReviews: [true],
        newsletterUpdates: [false]
      }),
      preferences: this.fb.group({
        currency: ['USD', Validators.required],
        dateFormat: ['MM/DD/YYYY', Validators.required],
        timeZone: ['', Validators.required],
        language: ['en', Validators.required]
      })
    });
  }

  loadSettings() {
    // TODO: Replace with actual API call
    setTimeout(() => {
      const settings: CompanySettings = {
        general: {
          companyName: 'OilLub Pro',
          email: 'contact@oillubpro.com',
          phone: '+1 (555) 123-4567',
          address: {
            street: '123 Industry Ave',
            city: 'Houston',
            state: 'TX',
            zip: '77001',
            country: 'USA'
          },
          website: 'https://oillubpro.com',
          logo: '/assets/logo.png'
        },
        notifications: {
          lowStockAlerts: true,
          orderNotifications: true,
          customerReviews: true,
          newsletterUpdates: false
        },
        preferences: {
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeZone: 'America/New_York',
          language: 'en'
        }
      };

      this.settingsForm.patchValue(settings);
      this.isLoading = false;
    }, 1000);
  }

  onSubmit() {
    if (this.settingsForm.valid) {
      this.isSaving = true;
      // TODO: Replace with actual API call
      setTimeout(() => {
        console.log('Settings saved:', this.settingsForm.value);
        this.isSaving = false;
      }, 1000);
    }
  }

  onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // TODO: Implement logo upload
      console.log('Logo file to upload:', file);
    }
  }
}