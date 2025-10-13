import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Cart, CartItem, CartSummary } from '../../../cores/models/cart';
import { CartService } from '../../../shared/services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  cartSummary: CartSummary | null = null;
  isLoading = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private readonly TAX_RATE = 0.16; // 16% VAT
  private readonly SHIPPING_THRESHOLD = 5000; // Free shipping above KES 5000

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCartData();
  }

  private loadCartData(): void {
    // Subscribe to cart updates
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart) => {
          this.cart = cart;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load cart data. Please try again.';
          console.error('Cart loading error:', error);
          this.isLoading = false;
        }
      });

    // Subscribe to cart summary updates
    this.cartService.cartSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.cartSummary = summary;
        },
        error: (error) => {
          console.error('Cart summary loading error:', error);
        }
      });
  }

  // Utility Functions
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  getProductImageUrl(item: CartItem): string {
    return item.product?.image_urls?.[0] || 'assets/images/product-placeholder.jpg';
  }

  // Cart Operations
  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity < 1) return;
    
    try {
      this.isLoading = true;
      await this.cartService.updateQuantity(itemId, quantity);
    } catch (error) {
      this.error = 'Failed to update quantity';
      console.error('Quantity update error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async removeItem(itemId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this item?')) return;
    
    try {
      this.isLoading = true;
      await this.cartService.removeFromCart(itemId);
    } catch (error) {
      this.error = 'Failed to remove item';
      console.error('Item removal error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async clearCart(): Promise<void> {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    
    try {
      this.isLoading = true;
      await this.cartService.clearCart();
    } catch (error) {
      this.error = 'Failed to clear cart';
      console.error('Cart clear error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Navigation Functions
  async proceedToCheckout(): Promise<void> {
    if (!this.cart?.items?.length) {
      this.error = 'Your cart is empty';
      return;
    }
    await this.router.navigate(['/customer/checkout']);
  }

  async continueShopping(): Promise<void> {
    await this.router.navigate(['/customer/products']);
  }

  // Calculation Functions
  getItemSubtotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  getSubtotal(): number {
    if (!this.cart?.items?.length) return 0;
    return this.cart.items.reduce((total, item) => total + this.getItemSubtotal(item), 0);
  }

  getShippingCost(): number {
    const subtotal = this.getSubtotal();
    return subtotal >= this.SHIPPING_THRESHOLD ? 0 : 500; // KES 500 shipping below threshold
  }

  getTax(): number {
    return this.getSubtotal() * this.TAX_RATE;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getShippingCost() + this.getTax();
  }

  getTotalItems(): number {
    if (!this.cart?.items?.length) return 0;
    return this.cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}