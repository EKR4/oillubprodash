import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface SalesMetrics {
  total: number;
  orderCount: number;
  averageOrderValue: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    quantity: number;
  }>;
}

interface InventoryMetrics {
  value: number;
  lowStock: number;
  outOfStock: number;
  topCategories: Array<{
    name: string;
    value: number;
    itemCount: number;
  }>;
}

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.scss']
})
export class ReportsDashboardComponent implements OnInit {
  isLoading = true;
  dateRange = new FormControl('7d');
  dateRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'ytd', label: 'Year to Date' }
  ];

  salesMetrics: SalesMetrics | null = null;
  inventoryMetrics: InventoryMetrics | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
    this.dateRange.valueChanges.subscribe(() => {
      this.loadDashboardData();
    });
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    // Simulated data loading
    setTimeout(() => {
      this.salesMetrics = {
        total: 250000,
        orderCount: 150,
        averageOrderValue: 1666.67,
        monthlyRevenue: [
          { month: 'Jan', revenue: 45000 },
          { month: 'Feb', revenue: 52000 },
          { month: 'Mar', revenue: 49000 },
          { month: 'Apr', revenue: 58000 },
          { month: 'May', revenue: 46000 }
        ],
        topProducts: [
          { id: '1', name: 'Premium Engine Oil', revenue: 25000, quantity: 500 },
          { id: '2', name: 'Brake Fluid', revenue: 18000, quantity: 300 },
          { id: '3', name: 'Transmission Fluid', revenue: 15000, quantity: 250 }
        ]
      };

      this.inventoryMetrics = {
        value: 750000,
        lowStock: 12,
        outOfStock: 5,
        topCategories: [
          { name: 'Engine Oil', value: 150000, itemCount: 45 },
          { name: 'Transmission Fluid', value: 95000, itemCount: 30 },
          { name: 'Brake Fluid', value: 75000, itemCount: 25 },
          { name: 'Coolant', value: 65000, itemCount: 20 },
          { name: 'Grease', value: 45000, itemCount: 15 }
        ]
      };

      this.isLoading = false;
    }, 1000);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }
}
