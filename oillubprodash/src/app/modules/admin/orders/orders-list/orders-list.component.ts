import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../cores/services/supabase.service';
import { Order, OrderStatus, OrderWithRelations } from '../../../../cores/models/order';
import { User } from '../../../../cores/models/user';
import { Company } from '../../../../cores/models/company';
import { Subject, takeUntil } from 'rxjs';

interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

interface FilterOption {
  column: string;
  operator: string;
  value: string | Date | OrderStatus;
}

interface QueryOptions {
  select: string;
  range: {
    from: number;
    to: number;
  };
  order: {
    column: string;
    ascending: boolean;
  };
  filters: FilterOption[];
  count?: boolean;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss'
})
export class OrdersListComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Make Math available in template
  readonly Math = Math;

  // Orders data
  orders: OrderWithRelations[] = [];
  loading = true;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalOrders = 0;
  totalPages = 0;

  // Filters
  filters: OrderFilters = {};
  statusOptions: OrderStatus[] = [
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

  // Sorting
  sortField: keyof Order = 'created_at';
  sortAscending = false;

  ngOnInit() {
    this.loadOrders();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isUser(data: unknown): data is User {
    return data !== null && 
           typeof data === 'object' && 
           'id' in data && 
           'email' in data &&
           'role' in data;
  }

  private isCompany(data: unknown): data is Company {
    return data !== null && 
           typeof data === 'object' && 
           'id' in data && 
           'name' in data &&
           'business_registration_number' in data;
  }

  private isOrder(data: unknown): data is Order {
    return data !== null && 
           typeof data === 'object' && 
           'id' in data && 
           'order_number' in data;
  }

  private buildQueryOptions(): QueryOptions {
    const options: QueryOptions = {
      select: '*',
      range: {
        from: (this.currentPage - 1) * this.pageSize,
        to: (this.currentPage * this.pageSize) - 1
      },
      order: {
        column: this.sortField,
        ascending: this.sortAscending
      },
      filters: []
    };

    // Add filters
    if (this.filters.status) {
      options.filters.push({
        column: 'status',
        operator: 'eq',
        value: this.filters.status
      });
    }

    if (this.filters.dateFrom) {
      options.filters.push({
        column: 'created_at',
        operator: 'gte',
        value: this.filters.dateFrom.toISOString()
      });
    }

    if (this.filters.dateTo) {
      options.filters.push({
        column: 'created_at',
        operator: 'lte',
        value: this.filters.dateTo.toISOString()
      });
    }

    if (this.filters.search) {
      options.filters.push({
        column: 'order_number',
        operator: 'ilike',
        value: `%${this.filters.search}%`
      });
    }

    return options;
  }

  async loadOrders() {
    this.loading = true;
    this.error = null;

    try {
      const options = this.buildQueryOptions();

      // Get orders with relations
      const supabase = this.supabase.getSupabase();
      
      // Get orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order(options.order.column, { ascending: options.order.ascending })
        .range(options.range.from, options.range.to);

      if (ordersError) throw ordersError;
      if (!Array.isArray(ordersData)) throw new Error('Invalid orders data');

      // Load related data for each order
      const ordersWithRelations = await Promise.all(
        ordersData.map(async (orderData) => {
          if (!this.isOrder(orderData)) return null;
          
          // Cast to Order after type guard
          const order = orderData as Order;
          
          const [userResponse, companyResponse] = await Promise.all([
            supabase
              .from('users')
              .select('*')
              .eq('id', order.user_id)
              .single(),
            order.company_id ? 
              supabase
                .from('companies')
                .select('*')
                .eq('id', order.company_id)
                .single() :
              Promise.resolve({ data: null, error: null })
          ]);

          // Type check the related data
          const user = userResponse.data && this.isUser(userResponse.data) ? userResponse.data : undefined;
          const company = companyResponse.data && this.isCompany(companyResponse.data) ? companyResponse.data : undefined;

          // Convert string dates to Date objects
          const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr) : undefined;

          const orderWithRelations: OrderWithRelations = {
            ...order,
            created_at: new Date(order.created_at),
            updated_at: formatDate(order.updated_at as unknown as string),
            completed_at: formatDate(order.completed_at as unknown as string),
            cancelled_at: formatDate(order.cancelled_at as unknown as string),
            user,
            company
          };

          return orderWithRelations;
        })
      );

      // Filter out any null values from failed loads
      this.orders = ordersWithRelations.filter((order): order is OrderWithRelations => order !== null);

      // Get total count
      const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      if (!count) {
        throw new Error('Invalid count data');
      }
      this.totalOrders = count;
      this.totalPages = Math.ceil(this.totalOrders / this.pageSize);

    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
      const { error } = await this.supabase.getSupabase()
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      const orderIndex = this.orders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        this.orders[orderIndex] = {
          ...this.orders[orderIndex],
          status,
          updated_at: new Date()
        };
      }

    } catch (error: any) {
      this.error = error.message;
    }
  }

  // Filter handlers
  applyFilters() {
    this.currentPage = 1; // Reset to first page
    this.loadOrders();
  }

  clearFilters() {
    this.filters = {};
    this.loadOrders();
  }

  // Sorting handlers
  updateSort(field: keyof Order) {
    if (this.sortField === field) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortField = field;
      this.sortAscending = true;
    }
    this.loadOrders();
  }

  // Pagination handlers
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadOrders();
    }
  }

  // Navigation
  viewOrderDetails(orderId: string) {
    this.router.navigate(['/admin/orders', orderId]);
  }

  // Helper methods
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
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
      case 'packed':
        return 'bg-indigo-100 text-indigo-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'returned':
      case 'refunded':
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
}