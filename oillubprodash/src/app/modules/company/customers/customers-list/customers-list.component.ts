import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

interface Customer {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: Date;
  status: 'active' | 'inactive';
  type: 'retail' | 'wholesale';
  tags: string[];
}

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss'
})
export class CustomersListComponent implements OnInit {
  customers: Customer[] = [];
  searchControl = new FormControl('');
  isLoading = false;
  selectedStatus = 'all';
  selectedType = 'all';
  sortField: 'name' | 'totalOrders' | 'totalSpent' | 'lastOrder' = 'lastOrder';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusFilters = [
    { id: 'all', name: 'All Customers' },
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' }
  ];

  typeFilters = [
    { id: 'all', name: 'All Types' },
    { id: 'retail', name: 'Retail' },
    { id: 'wholesale', name: 'Wholesale' }
  ];

  constructor() {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchCustomers(value || '');
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading = true;
    // TODO: Replace with actual API call
    setTimeout(() => {
      this.customers = [
        {
          id: '1',
          name: 'John Doe',
          companyName: 'Auto Parts Pro',
          email: 'john@autoproparts.com',
          phone: '+1 (555) 123-4567',
          totalOrders: 45,
          totalSpent: 12500.75,
          lastOrder: new Date(),
          status: 'active',
          type: 'wholesale',
          tags: ['VIP', 'Early Adopter']
        },
        // Add more mock customers as needed
      ];
      this.isLoading = false;
    }, 1000);
  }

  searchCustomers(query: string) {
    // TODO: Implement search logic
    this.loadCustomers();
  }

  filterByStatus(status: string) {
    this.selectedStatus = status;
    this.loadCustomers();
  }

  filterByType(type: string) {
    this.selectedType = type;
    this.loadCustomers();
  }

  sortBy(field: typeof this.sortField) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.loadCustomers();
  }

  getStatusColor(status: Customer['status']): string {
    return status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
  }

  getCustomerTypeColor(type: Customer['type']): string {
    return type === 'wholesale' ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}
