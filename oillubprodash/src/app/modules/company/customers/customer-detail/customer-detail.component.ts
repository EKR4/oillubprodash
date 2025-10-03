import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit {
  customerId: string | null = null;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get customer ID from route
    this.customerId = this.route.snapshot.paramMap.get('id');
    
    // Load customer details
    if (this.customerId) {
      this.loadCustomerDetails(this.customerId);
    }
  }

  private loadCustomerDetails(id: string): void {
    // Here we would load customer details from a service
    console.log(`Loading customer details for ID: ${id}`);
  }
}