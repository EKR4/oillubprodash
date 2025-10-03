import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  productId: string | null = null;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get product ID from route
    this.productId = this.route.snapshot.paramMap.get('id');
    
    // Load product details
    if (this.productId) {
      this.loadProductDetails(this.productId);
    }
  }

  private loadProductDetails(id: string): void {
    // Here we would load product details from a service
    console.log(`Loading product details for ID: ${id}`);
  }
}