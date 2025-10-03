import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Order, OrderStatus } from '../../../../cores/models/order';
import { AuthService } from '../../../../cores/services/auth.service';
import { OrderService } from '../../../../shared/services/order.service';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss']
})
export class OrdersListComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  isLoading = false;
  error: string | null = null;
  statusColors: Record<OrderStatus, string> = {
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

  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = null;

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (!user) {
            this.error = 'User not authenticated';
            this.isLoading = false;
            return;
          }

          this.orderService.getUserOrders(user.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (orders: Order[]) => {
                this.orders = orders;
                this.isLoading = false;
              },
              error: (err: Error) => {
                this.error = 'Failed to load orders';
                this.isLoading = false;
                console.error('Error loading orders:', err);
              }
            });
        },
        error: (err) => {
          this.error = 'Authentication error';
          this.isLoading = false;
          console.error('Auth error:', err);
        }
      });
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/customer/orders', orderId]);
  }

  trackOrder(orderId: string): void {
    this.router.navigate(['/customer/orders', orderId, 'tracking']);
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

  getStatusClass(status: OrderStatus): string {
    return this.statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
