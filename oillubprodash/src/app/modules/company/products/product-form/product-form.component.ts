import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  productId: string | null = null;
  isEditMode = false;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Check if we're in edit mode
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.productId;
  }
}