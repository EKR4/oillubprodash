import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';

interface VerificationResult {
  serialNumber: string;
  isAuthentic: boolean;
  productName: string;
  category: string;
  manufactureDate: Date;
  warrantyStatus: 'Active' | 'Expired' | 'Pending';
}

@Component({
  selector: 'app-verify-product',
  templateUrl: './verify-product.component.html',
  styleUrls: ['./verify-product.component.scss']
})
export class VerifyProductComponent implements OnInit {
  verifyForm: FormGroup;
  isSubmitting = false;
  private verificationResultSubject = new BehaviorSubject<VerificationResult | null>(null);
  verificationResult$ = this.verificationResultSubject.asObservable();
  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  constructor(private fb: FormBuilder) {
    this.verifyForm = this.fb.group({
      serialNumber: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    if (this.verifyForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorSubject.next(null);

      try {
        // Simulated API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const serialNumber = this.verifyForm.get('serialNumber')?.value;
        // Simulate a verification result
        const result: VerificationResult = {
          serialNumber,
          isAuthentic: true,
          productName: 'Premium Lubricant X-1000',
          category: 'Engine Oil',
          manufactureDate: new Date(2023, 5, 15),
          warrantyStatus: 'Active'
        };

        this.verificationResultSubject.next(result);
      } catch (error) {
        this.errorSubject.next('Failed to verify product. Please try again.');
        console.error('Error verifying product:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  getStatusClass(isAuthentic: boolean): string {
    return isAuthentic
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }

  getWarrantyClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}


