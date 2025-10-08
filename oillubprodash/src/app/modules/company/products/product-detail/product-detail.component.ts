import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { Product, ProductPackage } from '../../../../cores/models/product';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  productId: string | null = null;
  product: Product | null = null;
  loading: boolean = true;
  quantity: number = 1;
  selectedPackage: ProductPackage | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    
    if (this.productId) {
      this.loadProductDetails(this.productId);
    }
  }

  private loadProductDetails(id: string): void {
    // Simulated product data - replace with actual service call
    setTimeout(() => {
      try {
        this.product = {
          id: id,
          sku: 'EO-5W30-5L',
          name: 'Premium Engine Oil',
          description: 'High-performance synthetic engine oil suitable for all types of engines.',
          brand: 'OilTech Pro',
          category: 'engine_oil',
          viscosity_grade: '5W-30',
          is_active: true,
          created_at: new Date(),
          created_by: 'system',
          image_url: 'assets/product-1.jpg',
          specifications: {
            base_oil_type: 'synthetic',
            api_classification: 'API SP',
            acea_classification: 'ACEA A3/B4',
            oem_approvals: ['MB-Approval 229.5', 'BMW LL-01']
          },
          packages: [
            {
              id: '1',
              product_id: id,
              size: '5L',
              unit: 'L',
              unit_price: 49.99,
              currency: 'USD',
              weight_kg: 5.2,
              stock_level: 150,
              low_stock_threshold: 20,
              reorder_quantity: 50,
              is_available: true
            }
          ],
          certifications: [
            {
              id: '1',
              product_id: id,
              certification_type: 'API',
              certification_number: 'API-SP-2021',
              issuing_body: 'API',
              issue_date: new Date(),
              expiry_date: new Date(2026, 0, 1),
              is_active: true
            }
          ],
          compatible_vehicles: ['petrol', 'diesel'],
          benefits: [
            'Superior engine protection',
            'Improved fuel economy',
            'Extended drain intervals'
          ],
          recommended_for: [
            'Modern gasoline engines',
            'Light-duty diesel engines'
          ]
        };
        this.selectedPackage = this.product.packages[0];

      } catch (error) {
        console.error('Error loading product:', error);
        this.router.navigate(['../'], { relativeTo: this.route });
      } finally {
        this.loading = false;
      }  
    }, 1000);
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
    if (!this.product) return;
    
    try {
      // Implement cart functionality
      console.log(`Adding ${this.quantity} items to cart`);
      // Show success message or navigate to cart
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Show error message to user
    }
  }
}