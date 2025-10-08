import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  lastUpdated: Date;
}

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss'
})
export class ProductsListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  loading: boolean = true;
  searchQuery: string = '';
  selectedCategory: string = 'all';
  sortColumn: keyof Product = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  categories: string[] = ['Engine Oil', 'Transmission Fluid', 'Brake Fluid', 'Coolant'];

  constructor() {}

  ngOnInit(): void {
    // Simulate API call
    setTimeout(() => {
      this.products = this.getMockProducts();
      this.filteredProducts = [...this.products];
      this.loading = false;
    }, 1000);
  }

  getMockProducts(): Product[] {
    return [
      {
        id: '1',
        name: 'Premium Synthetic Oil',
        category: 'Engine Oil',
        price: 49.99,
        stock: 100,
        status: 'active',
        lastUpdated: new Date()
      },
      {
        id: '2',
        name: 'High Performance Transmission Fluid',
        category: 'Transmission Fluid',
        price: 39.99,
        stock: 75,
        status: 'active',
        lastUpdated: new Date()
      },
      {
        id: '3',
        name: 'DOT 4 Brake Fluid',
        category: 'Brake Fluid',
        price: 19.99,
        stock: 5,
        status: 'active',
        lastUpdated: new Date()
      },
      {
        id: '4',
        name: 'Long Life Coolant',
        category: 'Coolant',
        price: 29.99,
        stock: 50,
        status: 'inactive',
        lastUpdated: new Date()
      }
    ];
  }

  filterProducts(): void {
    this.filteredProducts = this.products
      .filter(product => 
        product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
        (this.selectedCategory === 'all' || product.category === this.selectedCategory)
      );
    this.sortProducts();
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
    this.filterProducts();
  }

  sortProducts(): void {
    this.filteredProducts.sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      return this.sortDirection === 'asc'
        ? (valueA < valueB ? -1 : 1)
        : (valueB < valueA ? -1 : 1);
    });
  }

  toggleSort(column: keyof Product): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortProducts();
  }

  getSortIcon(column: keyof Product): string {
    if (this.sortColumn !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  editProduct(id: string): void {
    // Navigate to edit page
    console.log(`Editing product ${id}`);
  }

  deleteProduct(id: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.products = this.products.filter(p => p.id !== id);
      this.filterProducts();
    }
  }
}
