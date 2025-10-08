import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

interface InventoryItem {
  id?: string;
  productName: string;
  category: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  location: string;
  unitPrice: number;
  supplier: string;
  lastRestocked: Date;
  notes: string;
}

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './inventory-form.component.html',
  styleUrls: ['./inventory-form.component.scss']
})
export class InventoryFormComponent implements OnInit {
  inventoryId: string | null = null;
  isEditMode = false;
  inventoryForm: FormGroup;
  loading = false;
  submitted = false;
  
  categories = [
    'Engine Oil',
    'Transmission Fluid',
    'Brake Fluid',
    'Coolant',
    'Power Steering Fluid',
    'Grease',
    'Other'
  ];

  locations = [
    'Main Warehouse',
    'Storage Room A',
    'Storage Room B',
    'Workshop',
    'Display Area'
  ];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.inventoryForm = this.createForm();
  }

  ngOnInit(): void {
    this.inventoryId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.inventoryId;
    
    if (this.isEditMode) {
      this.loading = true;
      // Simulated API call to get inventory item
      setTimeout(() => {
        this.loadInventoryItem({
          id: this.inventoryId!,
          productName: 'Premium Engine Oil',
          category: 'Engine Oil',
          quantity: 100,
          minQuantity: 20,
          maxQuantity: 200,
          location: 'Main Warehouse',
          unitPrice: 29.99,
          supplier: 'OilTech Industries',
          lastRestocked: new Date(),
          notes: 'High demand product'
        });
        this.loading = false;
      }, 1000);
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0)]],
      minQuantity: ['', [Validators.required, Validators.min(0)]],
      maxQuantity: ['', [Validators.required, Validators.min(0)]],
      location: ['', Validators.required],
      unitPrice: ['', [Validators.required, Validators.min(0)]],
      supplier: ['', Validators.required],
      lastRestocked: ['', Validators.required],
      notes: ['']
    }, {
      validators: [this.quantityRangeValidator]
    });
  }

  quantityRangeValidator(group: FormGroup) {
    const min = group.get('minQuantity')?.value;
    const max = group.get('maxQuantity')?.value;
    const qty = group.get('quantity')?.value;

    if (min && max && min > max) {
      return { minGreaterThanMax: true };
    }

    if (qty && (qty < min || qty > max)) {
      return { quantityOutOfRange: true };
    }

    return null;
  }

  loadInventoryItem(item: InventoryItem) {
    this.inventoryForm.patchValue({
      productName: item.productName,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity,
      location: item.location,
      unitPrice: item.unitPrice,
      supplier: item.supplier,
      lastRestocked: new Date(item.lastRestocked).toISOString().split('T')[0],
      notes: item.notes
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.inventoryForm.valid) {
      this.loading = true;
      const formData = this.inventoryForm.value;
      
      // Simulated API call
      setTimeout(() => {
        console.log('Saving inventory item:', formData);
        this.loading = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      }, 1000);
    }
  }

  resetForm() {
    if (confirm('Are you sure you want to reset the form? All changes will be lost.')) {
      this.submitted = false;
      if (this.isEditMode) {
        this.ngOnInit();
      } else {
        this.inventoryForm.reset();
      }
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.inventoryForm.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;
    if (errors['required']) return `${controlName} is required`;
    if (errors['min']) return `${controlName} must be greater than or equal to ${errors['min'].min}`;
    if (errors['minlength']) return `${controlName} must be at least ${errors['minlength'].requiredLength} characters`;
    
    return 'Invalid value';
  }
}