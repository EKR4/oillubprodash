import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Order, OrderStatus, PaymentStatus, OrderWithRelations } from '../../../../cores/models';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DatePipe],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss'
})
export class OrdersListComponent implements OnInit {
  isLoading = false;
  orders: OrderWithRelations[] = [];
  searchControl = new FormControl('');
  selectedStatus: OrderStatus | 'all' = 'all';
  sortField: 'date' | 'total' | 'status' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusFilters: Array<{ id: OrderStatus | 'all', label: string }> = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  ngOnInit(): void {
    this.loadOrders();
    this.setupSearchSubscription();
  }

  private loadOrders(): void {
    // TODO: Implement order loading logic
  }

  private setupSearchSubscription(): void {
    this.searchControl.valueChanges.subscribe(value => {
      // TODO: Implement search logic
    });
  }

  sortBy(field: 'date' | 'total' | 'status'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.loadOrders();
  }

  filterByStatus(status: OrderStatus | 'all'): void {
    this.selectedStatus = status;
    this.loadOrders();
  }

  getStatusColor(status: OrderStatus): string {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-800',
      refunded: 'bg-red-100 text-red-800',
      packed: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  getPaymentStatusColor(status: PaymentStatus): string {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
      partially_refunded: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  printOrder(orderId: string): void {
    window.print();
  }
}
