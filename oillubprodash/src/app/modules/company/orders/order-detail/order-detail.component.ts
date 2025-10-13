import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Order } from '../../../../cores/models';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  orderId: string | null = null;
  order: Order | null = null;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get order ID from route
    this.orderId = this.route.snapshot.paramMap.get('id');
    
    // Load order details
    if (this.orderId) {
      this.loadOrderDetails(this.orderId);
    }
  }

  getStatusClass(status: string): string {
    const statusClasses = {
      'pending': 'status-pending',
      'processing': 'status-processing',
      'confirmed': 'status-confirmed',
      'packed': 'status-packed',
      'shipped': 'status-shipped',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled',
      'returned': 'status-returned',
      'refunded': 'status-refunded'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'status-default';
  }

  getPaymentStatusClass(status: string): string {
    const statusClasses = {
      'pending': 'payment-pending',
      'processing': 'payment-processing',
      'completed': 'payment-completed',
      'failed': 'payment-failed',
      'refunded': 'payment-refunded',
      'partially_refunded': 'payment-partially-refunded'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'payment-default';
  }

  printOrder(): void {
    window.print();
  }

  private loadOrderDetails(id: string): void {
    // Here we would load order details from a service
    console.log(`Loading order details for ID: ${id}`);
    // TODO: Replace with actual service call
    this.order = {
      id,
      order_number: `ORD-${id}`,
      user_id: 'dummy-user-id',
      items: [],
      subtotal: 0,
      tax_amount: 0,
      shipping_fee: 0,
      discount_amount: 0,
      total_amount: 0,
      currency: 'USD',
      status: 'pending',
      payment_status: 'pending',
      payment_details: {
        id: `PAY-${id}`,
        order_id: id,
        payment_method: 'mpesa',
        amount: 0,
        currency: 'USD',
        payment_provider: 'mpesa',
        status: 'pending',
        created_at: new Date()
      },
      shipping_details: {
        id: `SHIP-${id}`,
        order_id: id,
        delivery_method: 'shipping',
        shipping_address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
          is_default: false
        },
        status: 'pending',
        created_at: new Date()
      },
      notes: '',
      created_at: new Date(),
      is_bulk_order: false
    };
  }
}