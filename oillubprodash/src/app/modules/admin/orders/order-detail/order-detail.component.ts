import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../cores/services/supabase.service';
import { Order, OrderStatus, PaymentStatus } from '../../../cores/models/order';
import { switchMap, catchError, of, Subject, takeUntil, take } from 'rxjs';

interface OrderWithRelations extends Order {
  company?: any;
  user?: any;
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  order: OrderWithRelations | null = null;
  loading = true;
  error: string | null = null;
  statusUpdateLoading = false;

  // Status options for dropdowns
  orderStatuses: OrderStatus[] = [
    'pending',
    'processing',
    'confirmed',
    'packed',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
    'refunded'
  ];

  paymentStatuses: PaymentStatus[] = [
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'partially_refunded'
  ];

  ngOnInit() {
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        if (!params['id']) {
          throw new Error('Order ID is required');
        }
        return this.loadOrderData(params['id']);
      }),
      catchError(error => {
        this.error = error.message;
        return of(null);
      })
    ).subscribe(() => {
      this.loading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isOrder(data: unknown): data is Order {
    return data !== null && 
           typeof data === 'object' && 
           'id' in data && 
           'order_number' in data;
  }

  private async loadOrderData(orderId: string): Promise<void> {
    try {
      const { data: orderData, error: orderError } = await this.supabase
        .getItemById('orders', orderId);

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');
      if (!this.isOrder(orderData)) throw new Error('Invalid order data');

      // Load related data
      const [companyData, userData] = await Promise.all([
        orderData.company_id ? this.loadCompanyData(orderData.company_id) : null,
        this.loadUserData(orderData.user_id)
      ]);

      // Cast to Order first to ensure type safety
      const baseOrder = orderData as Order;
      
      this.order = {
        id: baseOrder.id,
        order_number: baseOrder.order_number,
        user_id: baseOrder.user_id,
        company_id: baseOrder.company_id,
        items: baseOrder.items,
        subtotal: baseOrder.subtotal,
        tax_amount: baseOrder.tax_amount,
        shipping_fee: baseOrder.shipping_fee,
        discount_amount: baseOrder.discount_amount,
        total_amount: baseOrder.total_amount,
        currency: baseOrder.currency,
        status: baseOrder.status,
        payment_status: baseOrder.payment_status,
        payment_details: baseOrder.payment_details,
        shipping_details: baseOrder.shipping_details,
        notes: baseOrder.notes,
        created_at: baseOrder.created_at,
        updated_at: baseOrder.updated_at,
        completed_at: baseOrder.completed_at,
        cancelled_at: baseOrder.cancelled_at,
        loyalty_points_earned: baseOrder.loyalty_points_earned,
        loyalty_points_used: baseOrder.loyalty_points_used,
        is_bulk_order: baseOrder.is_bulk_order,
        metadata: baseOrder.metadata,
        // Add related data
        company: companyData,
        user: userData
      };

    } catch (error: any) {
      this.error = error.message;
    }
  }

  private async loadCompanyData(companyId: string) {
    const { data, error } = await this.supabase
      .getItemById('companies', companyId);
    
    if (error) throw error;
    return data;
  }

  private async loadUserData(userId: string) {
    const { data, error } = await this.supabase
      .getItemById('users', userId);
    
    if (error) throw error;
    return data;
  }

  async updateOrderStatus(status: OrderStatus) {
    if (!this.order) return;
    
    this.statusUpdateLoading = true;
    try {
      const updates: Partial<Order> = {
        status,
        updated_at: new Date()
      };

      // Add timestamps based on status
      if (status === 'delivered') {
        updates.completed_at = new Date();
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date();
      }

      const { error } = await this.supabase
        .updateItem('orders', this.order.id, updates);

      if (error) throw error;

      // Update local state
      this.order = {
        ...this.order,
        ...updates
      };

    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.statusUpdateLoading = false;
    }
  }

  async updatePaymentStatus(status: PaymentStatus) {
    if (!this.order) return;
    
    this.statusUpdateLoading = true;
    try {
      const updates = {
        payment_status: status,
        'payment_details.status': status,
        'payment_details.updated_at': new Date(),
        updated_at: new Date()
      };

      const { error } = await this.supabase
        .updateItem('orders', this.order.id, updates);

      if (error) throw error;

      // Update local state
      if (this.order.payment_details) {
        this.order.payment_details.status = status;
        this.order.payment_details.updated_at = new Date();
      }
      this.order.payment_status = status;
      this.order.updated_at = new Date();

    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.statusUpdateLoading = false;
    }
  }

  async updateShippingStatus(status: 'pending' | 'preparing' | 'ready_for_pickup' | 'in_transit' | 'delivered' | 'failed') {
    if (!this.order?.shipping_details) return;
    
    this.statusUpdateLoading = true;
    try {
      // Get current user ID
      const currentUser = await this.supabase.currentUser$.pipe(take(1)).toPromise();
      const userId = currentUser?.id || 'system';

      const statusUpdate = {
        id: crypto.randomUUID(),
        shipping_id: this.order.shipping_details.id,
        status,
        timestamp: new Date(),
        updated_by: userId
      };

      const updates = {
        'shipping_details.status': status,
        'shipping_details.status_updates': [
          ...(this.order.shipping_details.status_updates || []),
          statusUpdate
        ],
        'shipping_details.updated_at': new Date(),
        updated_at: new Date()
      };

      const { error } = await this.supabase
        .updateItem('orders', this.order.id, updates);

      if (error) throw error;

      // Update local state
      this.order.shipping_details.status = status;
      this.order.shipping_details.status_updates = [
        ...(this.order.shipping_details.status_updates || []),
        statusUpdate
      ];
      this.order.shipping_details.updated_at = new Date();
      this.order.updated_at = new Date();

    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.statusUpdateLoading = false;
    }
  }

  getStatusLabel(status: string): string {
    return status.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
      case 'packed':
      case 'ready_for_pickup':
        return 'bg-indigo-100 text-indigo-800';
      case 'shipped':
      case 'in_transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'returned':
      case 'refunded':
      case 'partially_refunded':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}