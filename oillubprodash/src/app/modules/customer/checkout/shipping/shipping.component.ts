import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Cart } from '../../../cores/models/cart';
import { CartService } from '../../../cart.service';

@Component({
  selector: 'app-shipping',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './shipping.component.html',
  styleUrls: ['./shipping.component.scss']
})
export class ShippingComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  isLoading = true;
  error: string | null = null;
  
  // Shipping form
  shippingForm: FormGroup;
  
  // Steps management
  steps = [
    { id: 'shipping', title: 'Shipping', active: true, completed: false },
    { id: 'payment', title: 'Payment', active: false, completed: false },
    { id: 'confirmation', title: 'Confirmation', active: false, completed: false }
  ];
  currentStep = 'shipping';
  
  // Delivery options
  deliveryOptions = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      price: 500,
      eta: '3-5 business days',
      description: 'Standard delivery to your address'
    },
    {
      id: 'express',
      name: 'Express Delivery',
      price: 1000,
      eta: '1-2 business days',
      description: 'Expedited delivery to your address'
    },
    {
      id: 'pickup',
      name: 'Store Pickup',
      price: 0,
      eta: 'Same day',
      description: 'Pickup from our store location'
    }
  ];
  
  // Countries
  countries = [
    { code: 'KE', name: 'Kenya' },
    { code: 'UG', name: 'Uganda' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'ET', name: 'Ethiopia' }
  ];
  
  // Cities by country
  citiesByCountry: { [key: string]: string[] } = {
    'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
    'UG': ['Kampala', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara'],
    'TZ': ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Zanzibar'],
    'RW': ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi'],
    'ET': ['Addis Ababa', 'Dire Dawa', 'Mek\'ele', 'Gondar', 'Bahir Dar']
  };
  
  // Available cities based on selected country
  availableCities: string[] = [];
  
  // Subscriptions
  private cartSubscription: Subscription | null = null;
  
  constructor(
    private cartService: CartService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.shippingForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(?:\+254|0)[17]\d{8}$/)]],
      address: ['', [Validators.required]],
      country: ['KE', [Validators.required]],
      city: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      deliveryMethod: ['standard', [Validators.required]],
      instructions: ['']
    });
    
    // Update available cities when country changes
    this.shippingForm.get('country')?.valueChanges.subscribe(country => {
      this.availableCities = this.citiesByCountry[country] || [];
      this.shippingForm.get('city')?.setValue('');
    });
    
    // Initialize available cities
    this.availableCities = this.citiesByCountry['KE'] || [];
  }

  ngOnInit(): void {
    this.loadCartData();
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
        
        // If cart is empty, redirect to cart page
        if (!cart || !cart.items || cart.items.length === 0) {
          this.router.navigate(['/customer/cart']);
        }
      },
      error => {
        this.error = 'Failed to load cart data. Please try again.';
        this.isLoading = false;
      }
    );
  }
  
  onSubmitShipping(): void {
    if (this.shippingForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.shippingForm.controls).forEach(key => {
        const control = this.shippingForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    // Navigate to payment page with shipping data
    this.router.navigate(['../payment'], {
      relativeTo: this.route,
      state: {
        shippingData: this.shippingForm.value
      }
    });
  }
  
  returnToCart(): void {
    this.router.navigate(['/customer/cart']);
  }
  
  getDeliveryOption(id: string): any {
    return this.deliveryOptions.find(option => option.id === id);
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
    const deliveryMethodId = this.shippingForm.get('deliveryMethod')?.value;
    const deliveryOption = this.getDeliveryOption(deliveryMethodId);
    return deliveryOption ? deliveryOption.price : 0;
  }
  
  getTaxAmount(): number {
    return this.getSubtotal() * 0.16; // 16% VAT
  }
  
  getTotal(): number {
    return this.getSubtotal() + this.getShippingCost() + this.getTaxAmount();
  }
}