import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Product, ProductCategory, ProductPackage } from '../../cores/models/product';
import { ProductService } from '../../shared/services/product.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  selectedPackage: ProductPackage | null = null;
  relatedProducts: Product[] = [];
  quantity: number = 1;
  isLoading = false;
  error: string | null = null;
  activeTab: 'description' | 'specifications' | 'reviews' = 'description';
  
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    
    // Get product ID from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.loadProduct(productId);
      } else {
        this.error = 'Product ID not found';
        this.isLoading = false;
      }
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
  
  loadProduct(productId: string): void {
    this.productService.getProductById(productId).pipe(takeUntil(this.destroy$)).subscribe(product => {
      this.product = product;
      
      // Select the first package by default
      if (product && product.packages && product.packages.length > 0) {
        this.selectedPackage = product.packages[0];
      }
      
      // Load related products (products in the same category)
      if (product) {
        this.loadRelatedProducts(product.category);
      }
      
      this.isLoading = false;
    });
  }
  
  loadRelatedProducts(category: string): void {
    this.productService.products$.pipe(takeUntil(this.destroy$)).subscribe(products => {
      this.relatedProducts = products
        .filter(p => p.category === category && p.id !== this.product?.id)
        .slice(0, 4); // Limit to 4 related products
    });
    
    // Convert string to ProductCategory type using type assertion
    // This is safe because we know the category comes from a valid product
    this.productService.loadProducts(category as ProductCategory);
  }
  
  selectPackage(pkg: ProductPackage): void {
    this.selectedPackage = pkg;
  }
  
  isPackageSelected(pkg: ProductPackage): boolean {
    return this.selectedPackage?.id === pkg.id;
  }
  
  isPackageInStock(pkg: ProductPackage): boolean {
    return pkg.stock_level > 0 && pkg.is_available;
  }
  
  getFormattedPrice(pkg: ProductPackage): string {
    return `${pkg.currency} ${pkg.unit_price.toFixed(2)}`;
  }
  
  incrementQuantity(): void {
    if (this.selectedPackage && this.quantity < this.selectedPackage.stock_level) {
      this.quantity++;
    }
  }
  
  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
  
  addToCart(): void {
    // To be implemented with a CartService
    console.log('Added to cart:', {
      product: this.product,
      package: this.selectedPackage,
      quantity: this.quantity
    });
    
    // Show a toast notification
    alert('Product added to cart'); // This would be replaced with a proper toast component
  }
  
  getProductImage(product: Product): string {
    return this.productService.getProductImageUrl(product);
  }
  
  setActiveTab(tab: 'description' | 'specifications' | 'reviews'): void {
    this.activeTab = tab;
  }
  
  getOEMApprovalsList(): string[] {
    return this.product?.specifications?.oem_approvals || [];
  }
  
  // Helper methods for certification checks
  hasKebsCertification(): boolean {
    return this.product?.certifications?.some(cert => 
      cert.certification_type === 'KEBS' && cert.is_active
    ) || false;
  }
  
  hasIsoCertification(): boolean {
    return this.product?.certifications?.some(cert => 
      cert.certification_type === 'ISO' && cert.is_active
    ) || false;
  }
}