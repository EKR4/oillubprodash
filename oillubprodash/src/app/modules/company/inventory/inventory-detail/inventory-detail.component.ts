import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface StockMovement {
  id: string;
  type: 'in' | 'out';
  quantity: number;
  date: Date;
  reason: string;
  reference: string;
}

interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  description: string;
  inStock: number;
  lowStockThreshold: number;
  reorderPoint: number;
  unitPrice: number;
  supplier: string;
  location: string;
  lastUpdated: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  movements: StockMovement[];
}

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.scss'
})
export class InventoryDetailComponent implements OnInit {
  itemId: string = '';
  item: InventoryItem | null = null;
  isLoading = true;
  stockForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.stockForm = this.fb.group({
      type: ['in', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      reference: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') || '';
    this.loadInventoryItem();
  }

  loadInventoryItem() {
    // TODO: Replace with actual API call
    setTimeout(() => {
      this.item = {
        id: this.itemId,
        productName: 'Premium Engine Oil',
        sku: 'OIL-001',
        category: 'oil',
        description: 'High-quality synthetic engine oil for optimal performance',
        inStock: 150,
        lowStockThreshold: 50,
        reorderPoint: 75,
        unitPrice: 49.99,
        supplier: 'OilCo Industries',
        location: 'Warehouse A - Shelf B12',
        lastUpdated: new Date(),
        status: 'in-stock',
        movements: [
          {
            id: '1',
            type: 'in',
            quantity: 100,
            date: new Date(),
            reason: 'Restock',
            reference: 'PO-2025-001'
          },
          {
            id: '2',
            type: 'out',
            quantity: 25,
            date: new Date(),
            reason: 'Order fulfillment',
            reference: 'ORD-2025-001'
          }
        ]
      };
      this.isLoading = false;
    }, 1000);
  }

  onSubmitStockMovement() {
    if (this.stockForm.valid) {
      // TODO: Implement stock movement submission
      console.log('Stock movement:', this.stockForm.value);
      this.stockForm.reset({
        type: 'in'
      });
    }
  }

  getStockStatusColor(status: InventoryItem['status']): string {
    const colors = {
      'in-stock': 'bg-green-200 text-green-800',
      'low-stock': 'bg-yellow-200 text-yellow-800',
      'out-of-stock': 'bg-red-200 text-red-800'
    };
    return colors[status] || '';
  }

  getMovementTypeColor(type: StockMovement['type']): string {
    return type === 'in' ? 'text-green-600' : 'text-red-600';
  }

  getStockStatus(item: InventoryItem): InventoryItem['status'] {
    if (item.inStock === 0) return 'out-of-stock';
    if (item.inStock <= item.lowStockThreshold) return 'low-stock';
    return 'in-stock';
  }
}