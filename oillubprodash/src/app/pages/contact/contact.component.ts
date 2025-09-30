import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  company?: string;
  accountType?: 'customer' | 'company' | 'other';
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;
  submitted = false;
  success = false;
  error = '';
  loading = false;

  // Company contact information
  contactInfo = {
    address: {
      main: '123 Industrial Park, Nairobi, Kenya',
      branches: [
        { name: 'Mombasa Office', address: '45 Port Road, Mombasa, Kenya' },
        { name: 'Kisumu Office', address: '78 Lake Avenue, Kisumu, Kenya' }
      ]
    },
    phone: {
      sales: '+254 700 123 456',
      support: '+254 700 789 012',
      general: '+254 700 345 678'
    },
    email: {
      sales: 'sales@lubrimax.com',
      support: 'support@lubrimax.com',
      info: 'info@lubrimax.com'
    },
    socialMedia: [
      { name: 'Facebook', url: 'https://facebook.com/lubrimax', icon: 'facebook' },
      { name: 'Twitter', url: 'https://twitter.com/lubrimax', icon: 'twitter' },
      { name: 'LinkedIn', url: 'https://linkedin.com/company/lubrimax', icon: 'linkedin' },
      { name: 'Instagram', url: 'https://instagram.com/lubrimax', icon: 'instagram' }
    ],
    businessHours: {
      weekdays: '8:00 AM - 6:00 PM',
      saturday: '9:00 AM - 3:00 PM',
      sunday: 'Closed',
      holidays: 'Closed on public holidays'
    }
  };

  // Support/Inquiry Types
  inquiryTypes = [
    { value: 'product_inquiry', label: 'Product Information' },
    { value: 'order_status', label: 'Order Status' },
    { value: 'technical_support', label: 'Technical Support' },
    { value: 'bulk_purchase', label: 'Bulk Purchase' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'partnership', label: 'Partnership Inquiry' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^\\+?[0-9\\s]{8,15}$')]],
      company: [''],
      accountType: ['customer'],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.contactForm.invalid) {
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    const formData: ContactFormData = this.contactForm.value;
    
  }

  get f() {
    return this.contactForm.controls;
  }

  resetForm(): void {
    this.contactForm.reset();
    this.submitted = false;
    this.success = false;
    this.error = '';
    this.initForm();
  }
}