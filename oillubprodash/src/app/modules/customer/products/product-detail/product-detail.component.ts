import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { Product, ProductCategory, ProductPackage } from '../../../../cores/models/product';
import { CartItem } from '../../../../cores/models/cart';
import { ProductService } from '../../../../shared/services/product.service';
import { CartService } from '../../../../shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get product ID from route and load product data
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const productId = params['id'];
        if (!productId) {
          throw new Error('Product ID not found');
        }
        this.isLoading = true;
        return this.productService.getProductById(productId);
      })
    ).subscribe({
      next: (product: Product | null) => {
        if (!product) return;
        this.product = product;
        // Select first package by default
        if (product.packages?.length > 0) {
          this.selectedPackage = product.packages[0];
        }
        this.isLoading = false;
        this.loadRelatedProducts(product?.category || 'unknown');
      },
      error: (error) => {
        this.error = 'Failed to load product details. Please try again.';
        this.isLoading = false;
        console.error('Error loading product:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRelatedProducts(category: ProductCategory): void {
    this.productService.loadProducts(category);
    this.productService.products$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
        next: (products: Product[]) => {
          this.relatedProducts = products
            .filter((p: Product) => p.id !== this.product?.id)
            .slice(0, 4);
        },
        error: (error: Error) => {
          console.error('Error loading related products:', error);
        }
      });
  }

  selectPackage(pkg: ProductPackage): void {
    this.selectedPackage = pkg;
    // Reset quantity when changing package
    this.quantity = 1;
  }

  incrementQuantity(): void {
    if (this.selectedPackage && this.quantity < (this.selectedPackage.stock_level || 999999)) {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getMinPrice(product: Product): number {
    return Math.min(...product.packages.map(pkg => pkg.unit_price));
  }

  addToCart(): void {
    if (this.product && this.selectedPackage) {
      const cartItem: CartItem = {
        id: crypto.randomUUID(),
        product_id: this.product.id,
        product: this.product,
        package_id: this.selectedPackage.id,
        package: this.selectedPackage,
        price: this.selectedPackage.unit_price,
        quantity: this.quantity,
        added_at: new Date(),
        updated_at: new Date()
      };
      this.cartService.addToCart(this.product, this.selectedPackage, this.quantity);
      // Navigate to cart
      this.router.navigate(['/customer/cart']);
    }
  }

  backToProducts(): void {
    this.router.navigate(['/customer/products']);
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/customer/products', productId]);
  }

  getProductImage(product: Product): string {
    return product.image_url || 'assets/images/placeholder.jpg';
  }

  setActiveTab(tab: 'description' | 'specifications' | 'reviews'): void {
    this.activeTab = tab;
  }

  isPackageSelected(pkg: ProductPackage): boolean {
    return this.selectedPackage?.id === pkg.id;
  }

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

  addToFavorites(): void {
    // Implementation to be added
    console.log('Added to favorites:', this.product);
    alert('Product added to favorites');
  }
}