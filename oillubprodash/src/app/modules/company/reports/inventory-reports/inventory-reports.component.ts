import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface InventoryMetrics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  avgTurnoverRate: number;
  deadStock: number;
  fastMovingItems: number;
}

interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  daysUntilStockout: number;
  status: 'critical' | 'warning' | 'normal';
}

interface ProductPerformance {
  productName: string;
  sku: string;
  stockLevel: number;
  turnoverRate: number;
  revenue: number;
  profit: number;
  trend: number;
}

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './inventory-reports.component.html',
  styleUrl: './inventory-reports.component.scss'
})
export class InventoryReportsComponent implements OnInit {
  metrics: InventoryMetrics = {
    totalProducts: 234,
    totalValue: 567890,
    lowStockItems: 12,
    outOfStockItems: 3,
    avgTurnoverRate: 4.5,
    deadStock: 15,
    fastMovingItems: 45
  };

  timeRangeControl = new FormControl('30');
  categoryControl = new FormControl('all');

  stockAlerts: StockAlert[] = [
    {
      productId: '1',
      productName: 'Premium Engine Oil 5W-30',
      currentStock: 25,
      reorderPoint: 50,
      daysUntilStockout: 5,
      status: 'critical'
    },
    {
      productId: '2',
      productName: 'Synthetic Gear Oil 75W-90',
      currentStock: 45,
      reorderPoint: 60,
      daysUntilStockout: 12,
      status: 'warning'
    }
  ];

  topPerformers: ProductPerformance[] = [
    {
      productName: 'Premium Engine Oil 5W-30',
      sku: 'EO-5W30-1',
      stockLevel: 150,
      turnoverRate: 8.5,
      revenue: 45000,
      profit: 15000,
      trend: 12
    },
    {
      productName: 'Synthetic Gear Oil 75W-90',
      sku: 'GO-75W90-1',
      stockLevel: 120,
      turnoverRate: 6.8,
      revenue: 35000,
      profit: 12000,
      trend: 8
    }
  ];

  stockLevelData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Stock Level',
        data: [500, 480, 520, 490, 510, 485],
        borderColor: '#ffd700'
      }
    ]
  };

  stockDistributionData = {
    labels: ['Optimal', 'Low Stock', 'Overstock', 'Out of Stock'],
    datasets: [{
      data: [60, 15, 20, 5],
      backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#F44336']
    }]
  };

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

  getStatusColor(status: StockAlert['status']): string {
    const colors = {
      critical: 'bg-red-200 text-red-800',
      warning: 'bg-yellow-200 text-yellow-800',
      normal: 'bg-green-200 text-green-800'
    };
    return colors[status];
  }

  getDaysUntilStockoutColor(days: number): string {
    if (days <= 7) return 'text-red-600';
    if (days <= 14) return 'text-yellow-600';
    return 'text-green-600';
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
}
