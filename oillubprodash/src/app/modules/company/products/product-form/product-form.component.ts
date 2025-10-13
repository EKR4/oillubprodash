import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  productId: string | null = null;
  isEditing = false;
  isLoading = false;
  submitted = false;
  productForm: FormGroup;
  imagePreview: string[] = [];
  categories: any[] = [];
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      categoryId: ['', [Validators.required]],
      stock: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      specifications: this.fb.array([]),
      basicInfo: this.fb.group({
        sku: ['', Validators.required],
        brand: ['', Validators.required],
        basePrice: [0, [Validators.required, Validators.min(0)]],
        stockQuantity: [0, [Validators.required, Validators.min(0)]],
        minStockLevel: [0, [Validators.required, Validators.min(0)]]
      })
    });
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditing = !!this.productId;
    if (this.isEditing) {
      this.loadProduct();
    }
    this.loadCategories();
  }

  private loadCategories(): void {
    // TODO: Replace with actual API call
    this.categories = [
      { id: 'engine_oil', name: 'Engine Oil' },
      { id: 'transmission_fluid', name: 'Transmission Fluid' },
      { id: 'brake_fluid', name: 'Brake Fluid' },
      { id: 'coolant', name: 'Coolant' },
      { id: 'grease', name: 'Grease' }
    ];
  }

  private async loadProduct(): Promise<void> {
    if (!this.productId) return;
    this.isLoading = true;
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Simulated product data
      const productData = {
        name: 'Sample Product',
        description: 'Sample Description',
        categoryId: 'engine_oil',
        stock: 100,
        minStock: 10,
        specifications: [
          { name: 'Viscosity', value: '5W-30' },
          { name: 'Volume', value: '5L' }
        ]
      };
      this.productForm.patchValue(productData);
      productData.specifications.forEach(spec => {
        this.addSpecification(spec);
      });
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get specificationsArray(): FormArray {
    return this.productForm.get('specifications') as FormArray;
  }

  addSpecification(spec?: { name: string, value: string }): void {
    const specGroup = this.fb.group({
      name: [spec?.name || '', Validators.required],
      value: [spec?.value || '', Validators.required]
    });
    this.specificationsArray.push(specGroup);
  }

  removeSpecification(index: number): void {
    this.specificationsArray.removeAt(index);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.productForm.valid) {
      this.isLoading = true;
      try {
        const formData = this.productForm.value;
        // TODO: Save product
        console.log(formData);
      } catch (error) {
        console.error('Error submitting form:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.imagePreview.length < 5) {
      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          this.imagePreview.push(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeImage(index: number): void {
    this.imagePreview.splice(index, 1);
  }
}