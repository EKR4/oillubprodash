import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Product, ProductCategory, ProductPackage } from '../../../../cores/models/product';
import { ProductService } from '../../../../shared/services/product.service';
import { CartService } from '../../../../shared/services/cart.service';
import { AuthService } from '../../../../cores/services/auth.service';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss']
})
export class ProductsListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: { id: ProductCategory; name: string; description: string; icon: string }[] = [
    { 
      id: 'engine_oil', 
      name: 'Engine Oil', 
      description: 'High-performance engine oils for all vehicle types',
      icon: 'engine-icon.svg'
    },
    { 
      id: 'gear_oil', 
      name: 'Gear Oil', 
      description: 'Specialized lubricants for gears and transmissions',
      icon: 'gear-icon.svg'
    },
    { 
      id: 'hydraulic_oil', 
      name: 'Hydraulic Oil', 
      description: 'Premium hydraulic fluids for industrial applications',
      icon: 'hydraulic-icon.svg'
    },
    { 
      id: 'grease', 
      name: 'Grease', 
      description: 'Long-lasting grease for various mechanical components',
      icon: 'grease-icon.svg'
    }
  ];
  
  selectedCategory: ProductCategory | null = null;
  searchQuery: string = '';
  sortOption: 'name' | 'price_low' | 'price_high' | 'newest' = 'name';
  isLoading: boolean = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    
    // Check if a category was passed in the route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const categoryParam = params['category'] as ProductCategory;
      if (categoryParam && this.isValidCategory(categoryParam)) {
        this.selectedCategory = categoryParam;
        this.loadProductsByCategory(categoryParam);
      } else {
        this.loadAllProducts();
      }
    });
    
    // Subscribe to loading state
    this.productService.isLoading$.pipe(takeUntil(this.destroy$)).subscribe(isLoading => {
      this.isLoading = isLoading;
    });
    
    // Subscribe to error state
    this.productService.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      this.error = error;
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private isValidCategory(category: string): boolean {
    return this.categories.some(cat => cat.id === category);
  }
  
  loadAllProducts(): void {
    this.productService.loadProducts();
    this.productService.products$.pipe(takeUntil(this.destroy$)).subscribe(products => {
      this.products = products;
      this.filteredProducts = [...products];
      this.applyFilters();
      this.isLoading = false;
    });
  }
  
  loadProductsByCategory(category: ProductCategory): void {
    this.productService.loadProducts(category);
    this.productService.products$.pipe(takeUntil(this.destroy$)).subscribe(products => {
      this.products = products;
      this.filteredProducts = [...products];
      this.applyFilters();
      this.isLoading = false;
    });
  }
  
  selectCategory(category: ProductCategory | null): void {
    this.selectedCategory = category;
    
    if (category) {
      this.router.navigate(['/customer/products/category', category]);
    } else {
      this.router.navigate(['/customer/products']);
      this.loadAllProducts();
    }
  }
  
  onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.selectCategory(value === '' ? null : value as ProductCategory);
  }
  
  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortOption = target.value as 'name' | 'price_low' | 'price_high' | 'newest';
    this.applyFilters();
  }
  
  onSearch(): void {
    this.applyFilters();
  }
  
  applyFilters(): void {
    // First, filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredProducts = this.products.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        (product.meta_tags && product.meta_tags.some(tag => tag.toLowerCase().includes(query)))
      );
    } else {
      this.filteredProducts = [...this.products];
    }
    
    // Then sort the results
    this.sortProducts();
  }
  
  sortProducts(): void {
    switch (this.sortOption) {
      case 'name':
        this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_low':
        this.filteredProducts.sort((a, b) => {
          const aPrice = a.packages.length > 0 ? a.packages[0].unit_price : 0;
          const bPrice = b.packages.length > 0 ? b.packages[0].unit_price : 0;
          return aPrice - bPrice;
        });
        break;
      case 'price_high':
        this.filteredProducts.sort((a, b) => {
          const aPrice = a.packages.length > 0 ? a.packages[0].unit_price : 0;
          const bPrice = b.packages.length > 0 ? b.packages[0].unit_price : 0;
          return bPrice - aPrice;
        });
        break;
      case 'newest':
        this.filteredProducts.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
    }
  }
  
  getProductImage(product: Product): string {
    return this.productService.getProductImageUrl(product);
  }
  
  addToCart(product: Product): void {
    // Select the first package by default
    if (product.packages && product.packages.length > 0) {
      this.cartService.addToCart(product, product.packages[0], 1).subscribe(() => {
        // Show success notification (to be replaced with a proper toast component)
        alert(`Added ${product.name} to cart`);
      });
    }
  }
  
  addToFavorites(product: Product): void {
    // Implementation to be added
    console.log('Added to favorites:', product);
    alert(`Added ${product.name} to favorites`);
  }
  
  getCategoryName(categoryId: ProductCategory): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  }
}