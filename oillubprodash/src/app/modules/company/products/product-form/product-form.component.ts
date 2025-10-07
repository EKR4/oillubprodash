import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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