import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Product, ProductCategory } from '../../cores/models/product';
import { ProductService } from '../../shared/services/product.service';

interface CategoryModel {
  id: ProductCategory;
  name: string;
}

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-catalog.component.html',
  styleUrls: ['./product-catalog.component.scss']
})
export class ProductCatalogComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: CategoryModel[] = [
    { id: 'engine_oil', name: 'Engine Oil' },
    { id: 'gear_oil', name: 'Gear Oil' },
    { id: 'hydraulic_oil', name: 'Hydraulic Oil' },
    { id: 'grease', name: 'Grease' }
  ];
  brands: string[] = [];
  viscosityGrades: string[] = [];
  vehicleTypes: string[] = [];
  
  selectedCategory: CategoryModel | null = null;
  selectedBrands: string[] = [];
  selectedViscosities: string[] = [];
  selectedVehicleTypes: string[] = [];
  searchTerm: string = '';
  sortOption: string = 'name_asc';
  
  isLoading = false;
  error: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    
    // Subscribe to category param changes
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['category']) {
        const categoryId = params['category'] as ProductCategory;
        this.selectedCategory = this.categories.find(c => c.id === categoryId) || null;
      } else {
        this.selectedCategory = null;
      }
      
      this.loadProducts();
    });
    
    // Get categories from service and map to CategoryModel
    this.productService.categories$.pipe(takeUntil(this.destroy$)).subscribe(categories => {
      // Assuming service returns array of {id: string, name: string}
      this.categories = categories.map(cat => ({
        id: cat.id as ProductCategory,
        name: cat.name
      }));
    });
    
    // Handle loading state
    this.productService.isLoading$.pipe(takeUntil(this.destroy$)).subscribe(isLoading => {
      this.isLoading = isLoading;
    });
    
    // Handle errors
    this.productService.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      this.error = error;
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadProducts(): void {
    this.productService.products$.pipe(takeUntil(this.destroy$)).subscribe(products => {
      this.products = products;
      this.extractFilters();
      this.applyFilters();
    });
    
    this.productService.loadProducts(this.selectedCategory?.id);
  }
  
  extractFilters(): void {
    // Extract unique brands
    this.brands = [...new Set(this.products.map(p => p.brand))];
    
    // Extract unique viscosity grades
    this.viscosityGrades = [...new Set(this.products.map(p => p.viscosity_grade))];
    
    // Extract unique vehicle types
    const vehicleTypes = new Set<string>();
    this.products.forEach(p => {
      if (p.compatible_vehicles) {
        p.compatible_vehicles.forEach(v => vehicleTypes.add(v));
      }
    });
    this.vehicleTypes = [...vehicleTypes];
  }
  
  applyFilters(): void {
    // Start with all products
    this.filteredProducts = [...this.products];
    
    // Apply brand filter
    if (this.selectedBrands.length > 0) {
      this.filteredProducts = this.filteredProducts.filter(p => 
        this.selectedBrands.includes(p.brand)
      );
    }
    
    // Apply viscosity filter
    if (this.selectedViscosities.length > 0) {
      this.filteredProducts = this.filteredProducts.filter(p => 
        this.selectedViscosities.includes(p.viscosity_grade)
      );
    }
    
    // Apply vehicle type filter
    if (this.selectedVehicleTypes.length > 0) {
      this.filteredProducts = this.filteredProducts.filter(p => 
        p.compatible_vehicles?.some(v => this.selectedVehicleTypes.includes(v))
      );
    }
    
    // Apply search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      this.filteredProducts = this.filteredProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    this.applySorting();
  }
  
  applySorting(): void {
    switch (this.sortOption) {
      case 'name_asc':
        this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        this.filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price_asc':
        this.filteredProducts.sort((a, b) => {
          const aPrice = a.packages?.[0]?.unit_price || 0;
          const bPrice = b.packages?.[0]?.unit_price || 0;
          return aPrice - bPrice;
        });
        break;
      case 'price_desc':
        this.filteredProducts.sort((a, b) => {
          const aPrice = a.packages?.[0]?.unit_price || 0;
          const bPrice = b.packages?.[0]?.unit_price || 0;
          return bPrice - aPrice;
        });
        break;
      default:
        break;
    }
  }
  
  onCategoryChange(category: CategoryModel | null): void {
    if (category) {
      this.router.navigate(['/products/category', category.id]);
    } else {
      this.router.navigate(['/products']);
    }
  }
  
  onBrandChange(brand: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    
    if (checkbox.checked) {
      this.selectedBrands.push(brand);
    } else {
      const index = this.selectedBrands.indexOf(brand);
      if (index !== -1) {
        this.selectedBrands.splice(index, 1);
      }
    }
    
    this.applyFilters();
  }
  
  onViscosityChange(viscosity: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    
    if (checkbox.checked) {
      this.selectedViscosities.push(viscosity);
    } else {
      const index = this.selectedViscosities.indexOf(viscosity);
      if (index !== -1) {
        this.selectedViscosities.splice(index, 1);
      }
    }
    
    this.applyFilters();
  }
  
  onVehicleTypeChange(vehicleType: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    
    if (checkbox.checked) {
      this.selectedVehicleTypes.push(vehicleType);
    } else {
      const index = this.selectedVehicleTypes.indexOf(vehicleType);
      if (index !== -1) {
        this.selectedVehicleTypes.splice(index, 1);
      }
    }
    
    this.applyFilters();
  }
  
  onSearchChange(): void {
    this.applyFilters();
  }
  
  onSortChange(): void {
    this.applySorting();
  }
  
  onViewModeChange(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }
  
  clearFilters(): void {
    this.selectedBrands = [];
    this.selectedViscosities = [];
    this.selectedVehicleTypes = [];
    this.searchTerm = '';
    this.sortOption = 'name_asc';
    this.applyFilters();
  }
  
  getProductImage(product: Product): string {
    return this.productService.getProductImageUrl(product);
  }
  
  getFormattedPrice(product: Product): string {
    return this.productService.getFormattedPrice(product);
  }
  
  isProductInStock(product: Product): boolean {
    return this.productService.isInStock(product);
  }
  
  getAvailablePackageSizes(product: Product): string[] {
    return this.productService.getPackageSizes(product);
  }
}