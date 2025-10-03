import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { Order, OrderStatus } from '../../../../cores/models/order';
import { OrderService } from '../../../../shared/services/order.service';

interface TrackingStep {
  status: OrderStatus;
  title: string;
  description: string;
  timestamp?: Date;
  completed: boolean;
}

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-tracking.component.html',
  styleUrls: ['./order-tracking.component.scss']
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  isLoading = false;
  error: string | null = null;
  trackingSteps: TrackingStep[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrderTracking();
  }

  loadOrderTracking(): void {
    this.isLoading = true;
    this.error = null;

    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => this.orderService.getOrderById(params['id']))
    ).subscribe({
      next: (order) => {
        if (!order) {
          this.error = 'Order not found';
          this.isLoading = false;
          return;
        }
        this.order = order;
        this.generateTrackingSteps(order);
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.error = 'Failed to load order tracking';
        this.isLoading = false;
        console.error('Error loading order tracking:', err);
      }
    });
  }

  generateTrackingSteps(order: Order): void {
    const statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
    const currentStatusIndex = statuses.indexOf(order.status);

    this.trackingSteps = statuses.map((status, index) => ({
      status,
      title: this.getStatusTitle(status),
      description: this.getStatusDescription(status),
      timestamp: index <= currentStatusIndex ? new Date() : undefined,
      completed: index <= currentStatusIndex
    }));
  }

  getStatusTitle(status: OrderStatus): string {
    const titles: Record<OrderStatus, string> = {
      pending: 'Order Placed',
      confirmed: 'Order Confirmed',
      processing: 'Processing',
      packed: 'Packed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
      refunded: 'Refunded'
    };
    return titles[status] || status;
  }

  getStatusDescription(status: OrderStatus): string {
    const descriptions: Record<OrderStatus, string> = {
      pending: 'Your order has been placed and is awaiting confirmation',
      confirmed: 'We have confirmed your order and payment',
      processing: 'Your order is being processed in our warehouse',
      packed: 'Your order has been packed and is ready for shipping',
      shipped: 'Your order is on its way to you',
      delivered: 'Your order has been delivered',
      cancelled: 'This order has been cancelled',
      returned: 'This order has been returned',
      refunded: 'A refund has been processed for this order'
    };
    return descriptions[status] || '';
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  backToOrder(): void {
    this.router.navigate(['/customer/orders', this.order?.id]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
