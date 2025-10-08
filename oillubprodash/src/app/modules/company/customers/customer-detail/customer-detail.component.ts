import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';

interface CustomerOrder {
  id: string;
  date: Date;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: number;
}

interface CustomerAddress {
  type: 'billing' | 'shipping';
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  type: 'individual' | 'business';
  status: 'active' | 'inactive';
  customerSince: Date;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  creditLimit?: number;
  currentBalance: number;
  paymentTerms?: string;
  taxId?: string;
  notes?: string;
  lastPurchase?: Date;
  totalPurchases: number;
  preferredPaymentMethod?: string;
}

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit {
  customerId: string | null = null;
  customer: Customer | null = null;
  loading: boolean = true;
  activeTab: 'overview' | 'orders' | 'addresses' | 'billing' = 'overview';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    
    if (this.customerId) {
      this.loadCustomerDetails(this.customerId);
    }
  }

  private loadCustomerDetails(id: string): void {
    // Simulated API call
    setTimeout(() => {
      this.customer = {
        id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1 (555) 123-4567',
        company: 'Smith Automotive',
        type: 'business',
        status: 'active',
        customerSince: new Date('2024-01-15'),
        addresses: [
          {
            type: 'billing',
            street: '123 Business Ave',
            city: 'Chicago',
            state: 'IL',
            postalCode: '60601',
            country: 'USA',
            isDefault: true
          },
          {
            type: 'shipping',
            street: '456 Warehouse Rd',
            city: 'Chicago',
            state: 'IL',
            postalCode: '60602',
            country: 'USA',
            isDefault: true
          }
        ],
        orders: [
          {
            id: 'ORD-001',
            date: new Date('2025-09-30'),
            status: 'delivered',
            total: 2499.99,
            items: 5
          },
          {
            id: 'ORD-002',
            date: new Date('2025-10-05'),
            status: 'processing',
            total: 1299.99,
            items: 3
          }
        ],
        creditLimit: 10000,
        currentBalance: 1299.99,
        paymentTerms: 'Net 30',
        taxId: 'TAX-123456789',
        notes: 'Premium customer, requires specific delivery schedule',
        lastPurchase: new Date('2025-10-05'),
        totalPurchases: 3799.98,
        preferredPaymentMethod: 'Credit Card'
      };
      this.loading = false;
    }, 1000);
  }

  setActiveTab(tab: 'overview' | 'orders' | 'addresses' | 'billing'): void {
    this.activeTab = tab;
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'active': return 'var(--success-color)';
      case 'inactive': return 'var(--error-color)';
      case 'pending': return 'var(--warning-color)';
      case 'processing': return 'var(--primary-color)';
      case 'shipped': return 'var(--info-color)';
      case 'delivered': return 'var(--success-color)';
      case 'cancelled': return 'var(--error-color)';
      default: return 'var(--text-color)';
    }
  }

  editCustomer(): void {
    if (this.customerId) {
      this.router.navigate(['../edit', this.customerId], { relativeTo: this.route });
    }
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

}