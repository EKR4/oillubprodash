import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  grossProfit: number;
  profitMargin: number;
  canceledOrders: number;
  returnRate: number;
}

interface SalesByCategory {
  category: string;
  revenue: number;
  orders: number;
  growth: number;
}

interface TopProduct {
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  trend: number;
}

interface SalesChannel {
  name: string;
  orders: number;
  revenue: number;
  percentage: number;
}

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sales-reports.component.html',
  styleUrl: './sales-reports.component.scss'
})
export class SalesReportsComponent implements OnInit {
  metrics: SalesMetrics = {
    totalRevenue: 456789,
    totalOrders: 1234,
    averageOrderValue: 370,
    grossProfit: 178900,
    profitMargin: 39.2,
    canceledOrders: 23,
    returnRate: 2.1
  };

  timeRangeControl = new FormControl('30');
  categoryControl = new FormControl('all');

  salesTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [42000, 45000, 48000, 46000, 52000, 50000],
        borderColor: '#ffd700'
      },
      {
        label: 'Orders',
        data: [180, 195, 210, 200, 225, 215],
        borderColor: '#4CAF50'
      }
    ]
  };

  salesByCategory: SalesByCategory[] = [
    { category: 'Engine Oils', revenue: 156000, orders: 450, growth: 12.5 },
    { category: 'Gear Oils', revenue: 98000, orders: 320, growth: 8.2 },
    { category: 'Lubricants', revenue: 78000, orders: 280, growth: 15.3 },
    { category: 'Filters', revenue: 45000, orders: 180, growth: -2.1 }
  ];

  topProducts: TopProduct[] = [
    {
      name: 'Premium Engine Oil 5W-30',
      sku: 'EO-5W30-1',
      unitsSold: 450,
      revenue: 45000,
      profit: 18000,
      trend: 15
    },
    {
      name: 'Synthetic Gear Oil 75W-90',
      sku: 'GO-75W90-1',
      unitsSold: 320,
      revenue: 35000,
      profit: 14000,
      trend: 8
    }
  ];

  salesChannels: SalesChannel[] = [
    { name: 'Direct Sales', orders: 580, revenue: 215000, percentage: 45 },
    { name: 'Distributors', orders: 420, revenue: 156000, percentage: 32 },
    { name: 'Online Store', orders: 234, revenue: 85789, percentage: 23 }
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadReportData();
  }

  loadReportData() {
    // TODO: Implement API call to fetch report data
  }

  updateTimeRange(range: string) {
    this.timeRangeControl.setValue(range);
    this.loadReportData();
  }

  updateCategory(category: string) {
    this.categoryControl.setValue(category);
    this.loadReportData();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getGrowthClass(value: number): string {
    return value >= 0 ? 'positive' : 'negative';
  }

  getChannelColor(index: number): string {
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0'];
    return colors[index % colors.length];
  }
}
