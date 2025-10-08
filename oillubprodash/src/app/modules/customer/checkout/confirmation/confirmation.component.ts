import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../../../cores/models/order';
import { CartService } from '../../../../shared/services/cart.service';
import { ProductService } from '../../../../shared/services/product.service';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.scss']
})
export class ConfirmationComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  orderId: string | null = null;
  loading = true;
  error: string | null = null;
  
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.orderId = params['orderId'];
      if (this.orderId) {
        this.loadOrderDetails(this.orderId);
      } else {
        this.error = 'Order ID not found';
        this.loading = false;
      }
    });
    
    // Clear the cart after successful order
    this.cartService.clearCart();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadOrderDetails(orderId: string): void {
    // In a real application, you would fetch the order details from a service
    // For this example, we'll create a mock order
    setTimeout(() => {
      const estimatedDeliveryDate = this.getEstimatedDeliveryDate(5);
      const currentDate = new Date().toISOString();
      
      this.order = {
        id: orderId,
        order_number: `ORD-${Math.floor(Math.random() * 10000)}`,
        user_id: 'cust123',
        items: [
          {
            id: 'item1',
            order_id: orderId,
            product_id: 'prod1',
            product_name: 'MaxPro Engine Oil 5W-30',
            product_sku: 'OIL-5W30-4L',
            package_id: 'pkg1',
            package_size: '4L',
            quantity: 2,
            unit_price: 1200,
            subtotal: 2400,
            tax_amount: 384,
            discount_amount: 0,
            total_amount: 2784,
            currency: 'KES'
          },
          {
            id: 'item2',
            order_id: orderId,
            product_id: 'prod2',
            product_name: 'HeavyDuty Gear Oil 80W-90',
            product_sku: 'OIL-80W90-5L',
            package_id: 'pkg2',
            package_size: '5L',
            quantity: 1,
            unit_price: 1500,
            subtotal: 1500,
            tax_amount: 240,
            discount_amount: 0,
            total_amount: 1740,
            currency: 'KES'
          }
        ],
        subtotal: 3900,
        tax_amount: 624,
        shipping_fee: 300,
        discount_amount: 0,
        total_amount: 4824,
        currency: 'KES',
        status: 'delivered' as OrderStatus,
        payment_status: 'completed' as PaymentStatus,
        payment_details: {
          id: 'pay1',
          order_id: orderId,
          payment_method: 'card' as PaymentMethod,
          amount: 4824,
          currency: 'KES',
          transaction_id: 'txn_' + Math.random().toString(36).substring(2, 10),
          transaction_date: new Date(),
          payment_provider: 'stripe',
          card_last_four: '4242',
          card_brand: 'Visa',
          status: 'completed' as PaymentStatus,
          created_at: new Date()
        },
        shipping_details: {
          id: 'ship1',
          order_id: orderId,
          delivery_method: 'shipping',
          shipping_address: {
            street: 'John Doe, 123 Main St', // Include recipient name in address for display purposes
            city: 'Nairobi',
            postal_code: '00100',
            country: 'Kenya',
            is_default: true
          },
          tracking_number: 'TRACK' + Math.floor(Math.random() * 1000000),
          tracking_url: 'https://tracking.example.com/',
          shipping_carrier: 'Express Delivery',
          estimated_delivery_date: new Date(estimatedDeliveryDate),
          status: 'in_transit',
          created_at: new Date()
        },
        created_at: new Date(),
        updated_at: new Date(),
        is_bulk_order: false
      };
      
      this.loading = false;
    }, 1000);
  }

  getEstimatedDeliveryDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString();
  }

  formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatPrice(price: number): string {
    return `KES ${price.toLocaleString()}`;
  }

  continueShopping(): void {
    this.router.navigate(['/customer/products']);
  }

  viewOrderDetails(): void {
    this.router.navigate(['/customer/orders', this.orderId]);
  }

  downloadInvoice(): void {
    // In a real application, this would generate and download an invoice
    alert('Invoice download functionality would be implemented here');
  }

  trackOrder(): void {
    this.router.navigate(['/customer/orders/tracking', this.orderId]);
  }
}