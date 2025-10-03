import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Cart } from '../../../cores/models/cart';
import { CartService } from '../../../shared/services/cart.service';

interface CheckoutStep {
  id: string;
  title: string;
  completed: boolean;
  active: boolean;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Checkout flow
  currentStep = 'shipping';
  steps: CheckoutStep[] = [
    { id: 'shipping', title: 'Shipping', completed: false, active: true },
    { id: 'payment', title: 'Payment', completed: false, active: false },
    { id: 'confirmation', title: 'Confirmation', completed: false, active: false }
  ];
  
  // Form controls
  shippingForm: FormGroup;
  
  // Delivery options
  deliveryOptions = [
    { id: 'standard', name: 'Standard Delivery', price: 500, description: '3-5 business days', eta: '3-5 days' },
    { id: 'express', name: 'Express Delivery', price: 1000, description: '1-2 business days', eta: '1-2 days' },
    { id: 'pickup', name: 'Pickup from Store', price: 0, description: 'Collect from our warehouse', eta: 'Same day' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    // Initialize forms
    this.shippingForm = this.formBuilder.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      deliveryMethod: ['standard', [Validators.required]],
      instructions: ['']
    });
  }

  ngOnInit(): void {
    this.loadCart();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCart(): void {
    this.isLoading = true;
    
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart) => {
          this.cart = cart;
          
          if (!cart || !cart.items || cart.items.length === 0) {
            // Redirect to cart page if cart is empty
            this.router.navigate(['/customer/cart']);
          }
          
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load cart. Please try again.';
          this.isLoading = false;
          console.error('Error loading cart:', err);
        }
      });
  }
  
  goToStep(stepId: string): void {
    if (this.currentStep === 'shipping' && stepId === 'payment') {
      if (!this.shippingForm.valid) {
        // Mark all fields as touched to show validation errors
        Object.keys(this.shippingForm.controls).forEach(key => {
          const control = this.shippingForm.get(key);
          control?.markAsTouched();
        });
        return;
      }
    }
    
    // Update steps
    this.steps.forEach(step => {
      if (step.id === this.currentStep) {
        step.completed = true;
        step.active = false;
      }
      if (step.id === stepId) {
        step.active = true;
      }
    });
    
    this.currentStep = stepId;
    
    // Navigate to the appropriate route
    this.router.navigate(['/customer/checkout', stepId]);
  }
  
  onSubmitShipping(): void {
    if (this.shippingForm.valid) {
      this.goToStep('payment');
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.shippingForm.controls).forEach(key => {
        const control = this.shippingForm.get(key);
        control?.markAsTouched();
      });
    }
  }
  
  getDeliveryMethod(): any {
    const deliveryMethodId = this.shippingForm.get('deliveryMethod')?.value;
    return this.deliveryOptions.find(option => option.id === deliveryMethodId);
  }
  
  getSubtotal(): number {
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
      return 0;
    }
    
    return this.cart.items.reduce((total, item) => {
      return total + (item.quantity * item.package.unit_price);
    }, 0);
  }
  
  getShippingCost(): number {
    const deliveryMethod = this.getDeliveryMethod();
    return deliveryMethod ? deliveryMethod.price : 0;
  }
  
  getTaxAmount(): number {
    // Calculate tax (16% VAT)
    return this.getSubtotal() * 0.16;
  }
  
  getTotal(): number {
    return this.getSubtotal() + this.getTaxAmount() + this.getShippingCost();
  }
  
  formatPrice(price: number, currency: string = 'KES'): string {
    return `${currency} ${price.toFixed(2)}`;
  }
  
  returnToCart(): void {
    this.router.navigate(['/customer/cart']);
  }
}