import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { Order, OrderItem } from '../../../../cores/models/order';
import { OrderService } from '../../../../shared/services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrder();
  }

  loadOrder(): void {
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
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.error = 'Failed to load order';
        this.isLoading = false;
        console.error('Error loading order:', err);
      }
    });
  }

  trackOrder(): void {
    if (this.order) {
      this.router.navigate(['/customer/orders', this.order.id, 'tracking']);
    }
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      packed: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-800',
      refunded: 'bg-orange-100 text-orange-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  calculateItemTotal(item: OrderItem): number {
    return item.quantity * item.unit_price;
  }

  backToOrders(): void {
    this.router.navigate(['/customer/orders']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
