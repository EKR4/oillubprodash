import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../cores/services/supabase.service';
import { Order, OrderStatus, PaymentStatus, OrderWithRelations, DeliveryStatusUpdate, PaymentMethod } from '../../../../cores/models/order';
import { User } from '../../../../cores/models/user';
import { Company } from '../../../../cores/models/company';
import { switchMap, catchError, of, Subject, takeUntil, take, firstValueFrom } from 'rxjs';

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
      const supabase = this.supabase.getSupabase();
      const { data: rawOrderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!rawOrderData) throw new Error('Order not found');
      if (!this.isOrder(rawOrderData)) throw new Error('Invalid order data');

      // Load related data
      const [companyData, userData] = await Promise.all([
        rawOrderData.company_id ? this.loadCompanyData(rawOrderData.company_id) : null,
        this.loadUserData(rawOrderData.user_id)
      ]);

      // Cast to Order first to ensure type safety
      const baseOrder = rawOrderData as Order;
      
      // Convert string dates to Date objects
      const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr) : undefined;
      
      // Start with the base order data
      const orderData: OrderWithRelations = {
        ...baseOrder,
        // Format dates
        created_at: formatDate(baseOrder.created_at as unknown as string) || new Date(),
        updated_at: formatDate(baseOrder.updated_at as unknown as string),
        completed_at: formatDate(baseOrder.completed_at as unknown as string),
        cancelled_at: formatDate(baseOrder.cancelled_at as unknown as string),
        // Add related data
        company: companyData as Company,
        user: userData as User,
        // Initialize required fields
        payment_details: baseOrder.payment_details ? {
          ...baseOrder.payment_details,
          created_at: new Date(baseOrder.payment_details.created_at),
          updated_at: baseOrder.payment_details.updated_at ? new Date(baseOrder.payment_details.updated_at) : undefined,
          transaction_date: baseOrder.payment_details.transaction_date ? new Date(baseOrder.payment_details.transaction_date) : undefined
        } : {
          // Default payment details if none exist
          id: crypto.randomUUID(),
          order_id: baseOrder.id,
          payment_method: 'other',
          amount: baseOrder.total_amount,
          currency: baseOrder.currency,
          payment_provider: 'manual',
          status: baseOrder.payment_status,
          created_at: new Date()
        },
        shipping_details: baseOrder.shipping_details ? {
          ...baseOrder.shipping_details,
          created_at: new Date(baseOrder.shipping_details.created_at),
          updated_at: baseOrder.shipping_details.updated_at ? new Date(baseOrder.shipping_details.updated_at) : undefined,
          estimated_delivery_date: baseOrder.shipping_details.estimated_delivery_date ? new Date(baseOrder.shipping_details.estimated_delivery_date) : undefined,
          status_updates: (baseOrder.shipping_details.status_updates || []).map(update => ({
            ...update,
            timestamp: new Date(update.timestamp)
          }))
        } : {
          // Default shipping details if none exist
          id: crypto.randomUUID(),
          order_id: baseOrder.id,
          delivery_method: 'shipping',
          status: 'pending',
          tracking_number: undefined,
          shipping_carrier: undefined,
          status_updates: [],
          created_at: new Date()
        }
      };

      this.order = orderData;

    } catch (error: any) {
      this.error = error.message;
    }
  }

  private async loadCompanyData(companyId: string) {
    const supabase = this.supabase.getSupabase();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    return data;
  }

  private async loadUserData(userId: string) {
    const supabase = this.supabase.getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateOrderStatus(status: OrderStatus) {
    if (!this.order) return;
    
    this.statusUpdateLoading = true;
    try {
      const now = new Date();
      const updates: Record<string, any> = {
        status,
        updated_at: now.toISOString()
      };

      // Add timestamps based on status
      if (status === 'delivered') {
        updates['completed_at'] = now.toISOString();
      } else if (status === 'cancelled') {
        updates['cancelled_at'] = now.toISOString();
      }

      const supabase = this.supabase.getSupabase();
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', this.order.id);

      if (error) throw error;

      // Update local state
      this.order = {
        ...this.order,
        status,
        updated_at: new Date(),
        completed_at: status === 'delivered' ? new Date() : this.order.completed_at,
        cancelled_at: status === 'cancelled' ? new Date() : this.order.cancelled_at
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
      const now = new Date();
      const updates: Record<string, any> = {
        payment_status: status,
        updated_at: now.toISOString()
      };

      if (this.order.payment_details) {
        updates['payment_details'] = {
          ...this.order.payment_details,
          status,
          updated_at: now.toISOString()
        };
      }

      const supabase = this.supabase.getSupabase();
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', this.order.id);

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
      const currentUser = await firstValueFrom(this.supabase.currentUser$.pipe(take(1)));
      const userId = currentUser?.id || 'system';
      const now = new Date();

      const statusUpdate = {
        id: crypto.randomUUID(),
        shipping_id: this.order.shipping_details.id,
        status,
        timestamp: now.toISOString(),
        updated_by: userId
      };

      const updatedStatusUpdates = [
        ...(this.order.shipping_details.status_updates || []).map(update => ({
          ...update,
          timestamp: update.timestamp instanceof Date ? update.timestamp.toISOString() : update.timestamp
        })),
        statusUpdate
      ];

      const updates: Record<string, any> = {
        updated_at: now.toISOString(),
        shipping_details: {
          ...this.order.shipping_details,
          status,
          status_updates: updatedStatusUpdates,
          updated_at: now.toISOString()
        }
      };

      const supabase = this.supabase.getSupabase();
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', this.order.id);

      if (error) throw error;

      // Update local state with Date objects for the UI
      this.order.shipping_details.status = status;
      this.order.shipping_details.status_updates = [
        ...(this.order.shipping_details.status_updates || []),
        { ...statusUpdate, timestamp: now }
      ];
      this.order.shipping_details.updated_at = now;
      this.order.updated_at = now;

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