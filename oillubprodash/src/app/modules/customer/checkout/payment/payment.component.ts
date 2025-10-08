import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { Cart } from '../../../../cores/models/cart';
import { CartService } from '../../../../shared/services/cart.service';
import { PaymentService, PaymentResponse } from '../../../../shared/services/payment.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  isLoading = true;
  error: string | null = null;
  
  // Payment form
  paymentForm: FormGroup;
  
  // Payment methods
  paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      icon: 'mobile',
      description: 'Pay using your M-Pesa mobile money account'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: 'credit-card',
      description: 'Pay using your Visa, Mastercard, or other major cards'
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: 'bank',
      description: 'Pay directly from your bank account'
    }
  ];
  
  // Steps management
  steps = [
    { id: 'shipping', title: 'Shipping', active: false, completed: true },
    { id: 'payment', title: 'Payment', active: true, completed: false },
    { id: 'confirmation', title: 'Confirmation', active: false, completed: false }
  ];
  currentStep = 'payment';
  
  // Transaction
  processingPayment = false;
  transactionId: string | null = null;
  
  // Shipping data passed from previous step
  shippingData: any;
  
  // Subscriptions
  private cartSubscription: Subscription | null = null;
  
  constructor(
    private cartService: CartService,
    private mulaflowService: PaymentService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.paymentForm = this.fb.group({
      paymentMethod: ['mpesa', Validators.required],
      
      // M-Pesa specific fields
      phoneNumber: ['', [
        Validators.pattern(/^(?:\+254|0)[17]\d{8}$/)
      ]],
      
      // Card specific fields
      cardNumber: ['', [
        Validators.pattern(/^\d{16}$/)
      ]],
      cardholderName: [''],
      expiryDate: [''],
      cvv: ['', [
        Validators.pattern(/^\d{3,4}$/)
      ]],
      
      // Bank specific fields
      bankName: [''],
      accountNumber: [''],
      
      // Common fields
      savePaymentMethod: [false],
      billingAddressSameAsShipping: [true],
      
      // Billing address (only used if billingAddressSameAsShipping is false)
      billingAddress: this.fb.group({
        fullName: [''],
        address: [''],
        city: [''],
        postalCode: [''],
      })
    });
  }

  ngOnInit(): void {
    this.loadCartData();
    this.loadShippingData();
    
    // Update validators based on payment method
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      this.updateValidators(method);
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
  
  loadCartData(): void {
    this.isLoading = true;
    this.cartSubscription = this.cartService.cart$.subscribe(
      cart => {
        this.cart = cart;
        this.isLoading = false;
      },
      error => {
        this.error = 'Failed to load cart data. Please try again.';
        this.isLoading = false;
      }
    );
  }
  
  loadShippingData(): void {
    // In a real application, this would typically be stored in a service or state management
    // For this example, we're using the router state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.shippingData = navigation.extras.state['shippingData'];
    }
    
    // If no shipping data, redirect back to shipping step
    if (!this.shippingData) {
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }
  
  updateValidators(paymentMethod: string): void {
    // Clear all validators first
    this.paymentForm.get('phoneNumber')?.clearValidators();
    this.paymentForm.get('cardNumber')?.clearValidators();
    this.paymentForm.get('cardholderName')?.clearValidators();
    this.paymentForm.get('expiryDate')?.clearValidators();
    this.paymentForm.get('cvv')?.clearValidators();
    this.paymentForm.get('bankName')?.clearValidators();
    this.paymentForm.get('accountNumber')?.clearValidators();
    
    // Add validators based on payment method
    if (paymentMethod === 'mpesa') {
      this.paymentForm.get('phoneNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^(?:\+254|0)[17]\d{8}$/)
      ]);
    } else if (paymentMethod === 'card') {
      this.paymentForm.get('cardNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{16}$/)
      ]);
      this.paymentForm.get('cardholderName')?.setValidators([Validators.required]);
      this.paymentForm.get('expiryDate')?.setValidators([
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)
      ]);
      this.paymentForm.get('cvv')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{3,4}$/)
      ]);
    } else if (paymentMethod === 'bank') {
      this.paymentForm.get('bankName')?.setValidators([Validators.required]);
      this.paymentForm.get('accountNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{10,12}$/)
      ]);
    }
    
    // Update form control validity
    this.paymentForm.get('phoneNumber')?.updateValueAndValidity();
    this.paymentForm.get('cardNumber')?.updateValueAndValidity();
    this.paymentForm.get('cardholderName')?.updateValueAndValidity();
    this.paymentForm.get('expiryDate')?.updateValueAndValidity();
    this.paymentForm.get('cvv')?.updateValueAndValidity();
    this.paymentForm.get('bankName')?.updateValueAndValidity();
    this.paymentForm.get('accountNumber')?.updateValueAndValidity();
  }
  
  onSubmitPayment(): void {
    if (this.paymentForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.paymentForm.controls).forEach(key => {
        const control = this.paymentForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.processPayment();
  }
  
  processPayment(): void {
    if (!this.cart || !this.shippingData) {
      this.error = 'Missing cart or shipping information';
      return;
    }
    
    this.processingPayment = true;
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    
    // Prepare payment data based on method
    let paymentData: any = {
      amount: this.getTotal(),
      currency: this.cart.items[0]?.package.currency || 'KES',
      orderId: `ORD-${Date.now()}`,
      customerName: this.shippingData.fullName,
      customerEmail: this.shippingData.email,
      paymentMethod: paymentMethod,
      description: `Payment for order containing ${this.cart.items.length} items`
    };
    
    if (paymentMethod === 'mpesa') {
      paymentData.phoneNumber = this.paymentForm.get('phoneNumber')?.value;
    } else if (paymentMethod === 'card') {
      paymentData.cardDetails = {
        number: this.paymentForm.get('cardNumber')?.value,
        name: this.paymentForm.get('cardholderName')?.value,
        expiry: this.paymentForm.get('expiryDate')?.value,
        cvv: this.paymentForm.get('cvv')?.value
      };
    } else if (paymentMethod === 'bank') {
      paymentData.bankDetails = {
        bankName: this.paymentForm.get('bankName')?.value,
        accountNumber: this.paymentForm.get('accountNumber')?.value
      };
    }
    
    // Call appropriate MulaFlow payment service method based on selected payment method
    let paymentObservable: Observable<PaymentResponse>;
    
    if (paymentMethod === 'mpesa') {
      paymentObservable = this.mulaflowService.initiateMpesaPayment(
        this.getTotal(),
        this.paymentForm.get('phoneNumber')?.value,
        `Payment for order containing ${this.cart.items.length} items`,
        `ORD-${Date.now()}`,
        { customer: this.shippingData.fullName, email: this.shippingData.email }
      );
    } else if (paymentMethod === 'card') {
      paymentObservable = this.mulaflowService.initiateCardPayment(
        this.getTotal(),
        this.shippingData.email,
        `Payment for order containing ${this.cart.items.length} items`,
        `ORD-${Date.now()}`,
        { customer: this.shippingData.fullName }
      );
    } else {
      // Bank transfer (default to 'equity' if not specified)
      paymentObservable = this.mulaflowService.initiateBankPayment(
        this.getTotal(),
        'equity',  // This should be dynamically set based on selected bank
        this.paymentForm.get('accountNumber')?.value,
        `Payment for order containing ${this.cart.items.length} items`,
        `ORD-${Date.now()}`,
        { customer: this.shippingData.fullName, email: this.shippingData.email }
      );
    }
    
    paymentObservable.subscribe({
      next: (response: PaymentResponse) => {
        this.transactionId = response.transactionId;
        this.processingPayment = false;
        
        // Navigate to confirmation page with transaction details
        this.router.navigate(['../confirmation'], {
          relativeTo: this.route,
          state: {
            transactionId: this.transactionId,
            paymentMethod: paymentMethod,
            orderDetails: {
              items: this.cart?.items,
              shipping: this.shippingData,
              payment: this.paymentForm.value,
              total: this.getTotal()
            }
          }
        });
      },
      error: (error: Error) => {
        this.error = 'Payment processing failed. Please try again.';
        this.processingPayment = false;
      }
    });
  }
  
  returnToShipping(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
  
  formatPrice(amount: number, currency: string = 'KES'): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
  
  getSubtotal(): number {
    if (!this.cart || !this.cart.items) return 0;
    return this.cart.items.reduce((acc, item) => acc + item.quantity * item.package.unit_price, 0);
  }
  
  getShippingCost(): number {
    if (!this.shippingData || !this.shippingData.deliveryMethod) return 0;
    
    // In a real app, you would look up the shipping cost based on the selected method
    // For this example, we'll use a simple mapping
    const shippingCosts: {[key: string]: number} = {
      'standard': 500,
      'express': 1000,
      'pickup': 0
    };
    
    return shippingCosts[this.shippingData.deliveryMethod] || 0;
  }
  
  getTaxAmount(): number {
    return this.getSubtotal() * 0.16; // 16% VAT
  }
  
  getTotal(): number {
    return this.getSubtotal() + this.getShippingCost() + this.getTaxAmount();
  }
}