import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, ReactiveFormsModule],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.scss'
})
export class InventoryListComponent {
  sortField: string = 'lastUpdated';
  sortDirection: 'asc' | 'desc' = 'desc';
  inventory: any[] = [];
  isLoading = false;
  searchControl = new FormControl('');
  selectedCategory: string | null = null;
  categories = [
    { id: 'engine_oil', label: 'Engine Oil' },
    { id: 'gear_oil', label: 'Gear Oil' },
    { id: 'hydraulic_oil', label: 'Hydraulic Oil' },
    { id: 'grease', label: 'Grease' }
  ];

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  filterByCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    // Implement filtering logic
  }

  getStockStatus(item: any): string {
    if (item.stockLevel <= item.lowStockThreshold) {
      return 'low-stock';
    } else if (item.stockLevel >= item.maxStockLevel) {
      return 'over-stock';
    }
    return 'normal';
  }

  getStockStatusColor(status: string): string {
    switch (status) {
      case 'low-stock':
        return 'text-red-500';
      case 'over-stock':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  }
}
