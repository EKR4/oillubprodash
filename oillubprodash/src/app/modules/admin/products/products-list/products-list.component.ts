import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReplacePipe } from '../../../../shared/pipes/replace.pipe';
import { Subscription } from 'rxjs';
import { 
  Product, 
  ProductCategory, 
  ViscosityGrade,
  ProductPackage,
  ProductCertification 
} from '../../../../cores/models/product';
import { SupabaseService } from '../../../../cores/services/supabase.service';

// Define product category constants for use in the component
const PRODUCT_CATEGORIES = {
  ENGINE_OIL: 'engine_oil' as ProductCategory,
  GEAR_OIL: 'gear_oil' as ProductCategory,
  HYDRAULIC_OIL: 'hydraulic_oil' as ProductCategory,
  GREASE: 'grease' as ProductCategory
};

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReplacePipe],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss']
})
export class ProductsListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  
  // Make Math available in template
  Math = Math;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  
  // Sorting
  sortField: string = 'created_at';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Filtering
  searchQuery: string = '';
  selectedCategory: ProductCategory | null = null;
  selectedBrand: string | null = null;
  filterActive: boolean | null = null;
  
  // Lists for filters
  categories: ProductCategory[] = [
    PRODUCT_CATEGORIES.ENGINE_OIL,
    PRODUCT_CATEGORIES.GEAR_OIL,
    PRODUCT_CATEGORIES.HYDRAULIC_OIL,
    PRODUCT_CATEGORIES.GREASE
  ];
  brands: string[] = [];
  
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadProducts(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    
    try {
      const supabase = this.supabaseService.getSupabase();
      
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!productsData) throw new Error('No products found');

      // Type assertion for products data
      const typedProducts = productsData as unknown as Array<Partial<Product> & { id: string }>;

      // Load related data for each product
      const productsWithDetails = await Promise.all(
        typedProducts.map(async (product) => {
          const [packagesData, certificationsData] = await Promise.all([
            supabase
              .from('product_packages')
              .select('*')
              .eq('product_id', product.id),
            supabase
              .from('product_certifications')
              .select('*')
              .eq('product_id', product.id)
          ]);

          // Type assertions for related data
          const packages = (packagesData.data || []) as unknown as ProductPackage[];
          const certifications = (certificationsData.data || []) as unknown as ProductCertification[];

          return {
            ...product,
            packages,
            certifications
          } as Product;
        })
      );

      this.products = productsWithDetails;
      this.extractFilterOptions();
      this.applyFilters();
      
    } catch (error: any) {
      this.errorMessage = `Error loading products: ${error.message || 'Unknown error'}`;
      console.error('Error loading products:', error);
    } finally {
      this.isLoading = false;
    }
  }

  extractFilterOptions(): void {
    // Extract unique brands
    this.brands = [...new Set(this.products.map(product => product.brand))];
  }
  
  applyFilters(): void {
    let filtered = [...this.products];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.viscosity_grade?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
    }
    
    // Apply brand filter
    if (this.selectedBrand) {
      filtered = filtered.filter(product => product.brand === this.selectedBrand);
    }
    
    // Apply active status filter
    if (this.filterActive !== null) {
      filtered = filtered.filter(product => product.is_active === this.filterActive);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[this.sortField as keyof Product];
      let bValue: any = b[this.sortField as keyof Product];
      
      // Handle nested properties
      if (this.sortField === 'stock') {
        aValue = this.getStockLevel(a);
        bValue = this.getStockLevel(b);
      }
      
      if (aValue === bValue) return 0;
      
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      return aValue < bValue ? -1 * direction : 1 * direction;
    });
    
    this.totalItems = filtered.length;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredProducts = filtered.slice(startIndex, startIndex + this.pageSize);
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending for most fields except name
      this.sortField = field;
      this.sortDirection = field === 'name' ? 'asc' : 'desc';
    }
    
    this.applyFilters();
  }
  
  onSearch(): void {
    this.currentPage = 1; // Reset to first page on new search
    this.applyFilters();
  }
  
  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.selectedBrand = null;
    this.filterActive = null;
    this.currentPage = 1;
    this.applyFilters();
  }
  
  onCategoryChange(category: ProductCategory | null): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.applyFilters();
  }
  
  onBrandChange(brand: string | null): void {
    this.selectedBrand = brand;
    this.currentPage = 1;
    this.applyFilters();
  }
  
  onStatusChange(active: boolean | null): void {
    this.filterActive = active;
    this.currentPage = 1;
    this.applyFilters();
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }
  
  getStockLevel(product: Product): number {
    return product.packages && product.packages.length > 0
      ? product.packages.reduce((sum, pkg) => sum + pkg.stock_level, 0)
      : 0;
  }
  
  getLowestPrice(product: Product): string {
    if (!product.packages || product.packages.length === 0) return 'N/A';
    
    const lowestPrice = Math.min(...product.packages.map(pkg => pkg.unit_price));
    return `$${lowestPrice.toFixed(2)}`;
  }
  
  getHighestPrice(product: Product): string {
    if (!product.packages || product.packages.length === 0) return 'N/A';
    
    const highestPrice = Math.max(...product.packages.map(pkg => pkg.unit_price));
    return `$${highestPrice.toFixed(2)}`;
  }
  
  createProduct(): void {
    this.router.navigate(['/admin/products/create']);
  }
  
  editProduct(productId: string): void {
    this.router.navigate(['/admin/products/edit', productId]);
  }
  
  viewProductDetails(productId: string): void {
    this.router.navigate(['/admin/products/detail', productId]);
  }
  
  async toggleProductStatus(product: Product, event: Event): Promise<void> {
    event.stopPropagation(); // Prevent row click
    
    try {
      const { error } = await this.supabaseService.getSupabase()
        .from('products')
        .update({ 
          is_active: !product.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (error) throw error;
      
      // Update local state
      product.is_active = !product.is_active;
      
    } catch (error: any) {
      this.errorMessage = `Error updating product status: ${error.message || 'Unknown error'}`;
      console.error('Error updating product status:', error);
    }
  }
  
  exportProductsList(): void {
    // Generate CSV data
    const headers = ['SKU', 'Name', 'Brand', 'Category', 'Stock Level', 'Price Range', 'Status'];
    const csvData = this.products.map(product => [
      product.sku,
      product.name,
      product.brand,
      product.category,
      this.getStockLevel(product),
      `${this.getLowestPrice(product)} - ${this.getHighestPrice(product)}`,
      product.is_active ? 'Active' : 'Inactive'
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}