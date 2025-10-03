import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  orderId: string | null = null;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get order ID from route
    this.orderId = this.route.snapshot.paramMap.get('id');
    
    // Load order details
    if (this.orderId) {
      this.loadOrderDetails(this.orderId);
    }
  }

  private loadOrderDetails(id: string): void {
    // Here we would load order details from a service
    console.log(`Loading order details for ID: ${id}`);
  }
}