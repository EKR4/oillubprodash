import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnRate: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  repeatPurchaseRate: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    fill?: boolean;
  }[];
}

@Component({
  selector: 'app-customer-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './customer-reports.component.html',
  styleUrl: './customer-reports.component.scss'
})
export class CustomerReportsComponent implements OnInit {
  metrics: CustomerMetrics = {
    totalCustomers: 1234,
    activeCustomers: 987,
    newCustomers: 45,
    churnRate: 2.5,
    averageOrderValue: 750,
    customerLifetimeValue: 15000,
    repeatPurchaseRate: 68
  };

  timeRangeControl = new FormControl('30');
  segmentControl = new FormControl('all');

  customerGrowthData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Total Customers',
      data: [1000, 1050, 1150, 1200, 1250, 1234],
      borderColor: '#ffd700',
      fill: false
    }]
  };

  customerSegmentationData: ChartData = {
    labels: ['Wholesale', 'Retail', 'Distributor'],
    datasets: [{
      label: 'Customer Segments',
      data: [45, 35, 20],
      backgroundColor: ['#4CAF50', '#2196F3', '#9C27B0']
    }]
  };

  revenueBySegmentData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Wholesale',
        data: [50000, 55000, 52000, 58000, 56000, 60000],
        borderColor: '#4CAF50',
        fill: false
      },
      {
        label: 'Retail',
        data: [30000, 32000, 35000, 34000, 36000, 38000],
        borderColor: '#2196F3',
        fill: false
      }
    ]
  };

  customerRetentionData: ChartData = {
    labels: ['0-3', '4-6', '7-12', '13-24', '24+'],
    datasets: [{
      label: 'Customer Age (months)',
      data: [150, 280, 420, 320, 180],
      backgroundColor: ['#FF9800', '#F44336', '#4CAF50', '#2196F3', '#9C27B0']
    }]
  };

  topCustomers = [
    { name: 'Auto Parts Pro', orders: 145, revenue: 125000, growth: 12 },
    { name: 'MechTech Solutions', orders: 98, revenue: 85000, growth: 8 },
    { name: 'Fleet Masters', orders: 78, revenue: 72000, growth: 15 },
    { name: 'Garage Experts', orders: 65, revenue: 58000, growth: 5 },
    { name: 'Industrial Oils Inc', orders: 52, revenue: 45000, growth: 10 }
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadReportData();
  }

  loadReportData() {
    // TODO: Implement API call to fetch report data
    // This would update all the charts and metrics
  }

  updateTimeRange(range: string) {
    this.timeRangeControl.setValue(range);
    this.loadReportData();
  }

  updateSegment(segment: string) {
    this.segmentControl.setValue(segment);
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
}
