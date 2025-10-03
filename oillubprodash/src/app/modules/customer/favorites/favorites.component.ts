import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, map } from 'rxjs';
import { Product, ProductPackage, PackageSize } from '../../../cores/models/product';
import { CartService } from '../../../shared/services/cart.service';
import { ProductService } from '../../../shared/services/product.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  favorites: Product[] = [];
  isLoading = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.error = null;

    // Get user's favorite products from local storage or API
    const storedFavorites = localStorage.getItem('favorites') || '[]';
    const favoriteIds: string[] = JSON.parse(storedFavorites);

    if (favoriteIds.length === 0) {
      this.favorites = [];
      this.isLoading = false;
      return;
    }

    // Load full product details for each favorite
    this.productService.products$
      .pipe(
        takeUntil(this.destroy$),
        map((products: Product[]) => products.filter((p: Product) => favoriteIds.includes(p.id)))
      )
      .subscribe({
        next: (favorites: Product[]) => {
          this.favorites = favorites;
          this.isLoading = false;
        },
        error: (err: Error) => {
          this.error = 'Failed to load favorites';
          this.isLoading = false;
          console.error('Error loading favorites:', err);
        }
      });
  }

  async addToCart(product: Product): Promise<void> {
    try {
      // Get the smallest available package or use a default one
      const productPackage = product.packages.length > 0 
        ? product.packages[0] 
        : {
            id: 'default',
            product_id: product.id,
            size: '1L' as PackageSize,
            unit: 'L',
            unit_price: 0,
            currency: 'KES',
            weight_kg: 1,
            stock_level: 0,
            low_stock_threshold: 5,
            reorder_quantity: 10,
            is_available: true
          };
      
      await this.cartService.addToCart(product, productPackage);
      // Show success notification (implement notification service)
    } catch (err: unknown) {
      this.error = 'Failed to add item to cart';
      console.error('Error adding to cart:', err);
    }
  }

  async removeFromFavorites(productId: string): Promise<void> {
    try {
      const storedFavorites = localStorage.getItem('favorites') || '[]';
      const favoriteIds: string[] = JSON.parse(storedFavorites);
      const updatedFavorites = favoriteIds.filter(id => id !== productId);
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      
      this.favorites = this.favorites.filter(p => p.id !== productId);
      // Show success notification
    } catch (err: unknown) {
      this.error = 'Failed to remove from favorites';
      console.error('Error removing favorite:', err);
    }
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/customer/products', productId]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
