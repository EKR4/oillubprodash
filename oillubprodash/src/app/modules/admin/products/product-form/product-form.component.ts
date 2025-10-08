import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReplacePipe } from '../../../../shared/pipes/replace.pipe';
import { Subscription, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { Product, ProductCategory, ProductPackage, ProductCertification, ViscosityGrade, ProductSpecifications } from '../../../../cores/models/product';
import { SupabaseService } from '../../../../cores/services/supabase.service';

// Define product category constants for use in the component
const PRODUCT_CATEGORIES = {
  ENGINE_OIL: 'engine_oil' as ProductCategory,
  GEAR_OIL: 'gear_oil' as ProductCategory,
  HYDRAULIC_OIL: 'hydraulic_oil' as ProductCategory,
  GREASE: 'grease' as ProductCategory
};

// Define viscosity grade options based on the ViscosityGrade type
const VISCOSITY_GRADES = {
  ENGINE_OIL: ['0W-20', '0W-30', '5W-30', '5W-40', '10W-30', '10W-40', '15W-40', '20W-50'] as ViscosityGrade[],
  GEAR_OIL: ['SAE 90', 'SAE 140', 'other'] as ViscosityGrade[],
  HYDRAULIC_OIL: ['ISO 32', 'ISO 46', 'ISO 68', 'other'] as ViscosityGrade[],
  GREASE: ['NLGI 1', 'NLGI 2', 'NLGI 3', 'other'] as ViscosityGrade[]
};

type BaseOilType = 'synthetic' | 'mineral' | 'semi_synthetic';
type VehicleType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

interface ProductFormValue {
  name: string;
  description: string;
  brand: string;
  category: ProductCategory;
  image_url: string;
  sku: string;
  packages: ProductPackage[];
  specifications: {
    base_oil_type: BaseOilType;
    viscosity_grade: ViscosityGrade;
    additives: string[];
    api_classification: string;
    flash_point: number | null;
    pour_point: number | null;
  };
  certifications: ProductCertification[];
  benefits: string[];
  recommended_for: string[];
  is_active: boolean;
  viscosity_grade: ViscosityGrade;
  compatible_vehicles: VehicleType[];
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ReplacePipe],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit, OnDestroy {
  productForm!: FormGroup;
  isEditMode = false;
  productId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Options for dropdowns
  categories = Object.values(PRODUCT_CATEGORIES);
  viscosityGrades: ViscosityGrade[] = [];
  brands: string[] = ['SuperLube', 'MaxOil', 'EcoLub', 'TechnoLube', 'ProTech'];
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProductData();
    
    // Update viscosity grades when category changes
    this.subscriptions.add(
      this.productForm.get('category')?.valueChanges.subscribe(category => {
        this.updateViscosityGradeOptions(category);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      brand: ['', Validators.required],
      category: [PRODUCT_CATEGORIES.ENGINE_OIL, Validators.required],
      image_url: [''],
      sku: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]{5,20}$/)]],
      packages: this.fb.array([this.createPackageFormGroup()]),
      specifications: this.fb.group({
        base_oil_type: ['synthetic'],
        viscosity_grade: [''],
        additives: [[]],
        api_classification: [''],
        flash_point: [null],
        pour_point: [null]
      }),
      certifications: this.fb.array([]),
      benefits: [[]],
      recommended_for: [[]],
      is_active: [true],
      viscosity_grade: [''],
      compatible_vehicles: [[]]
    });
    
    // Initialize viscosity grades based on default category
    this.updateViscosityGradeOptions(PRODUCT_CATEGORIES.ENGINE_OIL);
  }

  private createPackageFormGroup(): FormGroup {
    return this.fb.group({
      size: ['', Validators.required],
      unit: ['L', Validators.required],
      unit_price: [null, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', Validators.required],
      stock_level: [0, [Validators.required, Validators.min(0)]],
      weight_kg: [null, [Validators.required, Validators.min(0.01)]],
      barcode: [''],
      low_stock_threshold: [10, [Validators.required, Validators.min(1)]],
      reorder_quantity: [20, [Validators.required, Validators.min(1)]],
      is_available: [true, Validators.required]
    });
  }

  private createCertificationFormGroup(): FormGroup {
    return this.fb.group({
      certification_type: ['', Validators.required],
      certification_number: ['', Validators.required],
      issuing_body: ['', Validators.required],
      issue_date: [new Date(), Validators.required],
      is_active: [true]
    });
  }

  private updateViscosityGradeOptions(category: ProductCategory): void {
    switch(category) {
      case PRODUCT_CATEGORIES.ENGINE_OIL:
        this.viscosityGrades = VISCOSITY_GRADES.ENGINE_OIL;
        break;
      case PRODUCT_CATEGORIES.GEAR_OIL:
        this.viscosityGrades = VISCOSITY_GRADES.GEAR_OIL;
        break;
      case PRODUCT_CATEGORIES.HYDRAULIC_OIL:
        this.viscosityGrades = VISCOSITY_GRADES.HYDRAULIC_OIL;
        break;
      case PRODUCT_CATEGORIES.GREASE:
        this.viscosityGrades = VISCOSITY_GRADES.GREASE;
        break;
      default:
        this.viscosityGrades = [];
    }
    
    // Update the viscosity_grade value in both places
    const newGrade = this.viscosityGrades.length > 0 ? this.viscosityGrades[0] : '';
    this.productForm.get('viscosity_grade')?.setValue(newGrade);
    this.productForm.get('specifications.viscosity_grade')?.setValue(newGrade);
  }

  private async loadProductData(): Promise<void> {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.productId;
    
    if (this.isEditMode && this.productId) {
      this.isLoading = true;
      
      try {
        // Load product data from Supabase
        const supabase = this.supabaseService.getSupabase();
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', this.productId)
          .single();

        if (error) {
          this.errorMessage = error.message;
          return;
        }

        if (!product) {
          this.errorMessage = 'Product not found';
          return;
        }

        // Load related data
        const [packagesData, certificationsData] = await Promise.all([
          supabase
            .from('product_packages')
            .select('*')
            .eq('product_id', this.productId),
          supabase
            .from('product_certifications')
            .select('*')
            .eq('product_id', this.productId)
        ]);

        if (packagesData.error) throw packagesData.error;
        if (certificationsData.error) throw certificationsData.error;

        const typedProduct = product as unknown as Product;
        const packages = packagesData.data as unknown as ProductPackage[];
        const certifications = certificationsData.data as unknown as ProductCertification[];

        const fullProduct: Product = {
          ...typedProduct,
          packages: packages || [],
          certifications: certifications || []
        };

        this.populateForm(fullProduct);
      } catch (error: any) {
        this.errorMessage = error.message || 'Failed to load product data';
      } finally {
        this.isLoading = false;
      }
    }
  }

  private populateForm(product: Product): void {
    // Reset form arrays first
    this.packagesFormArray.clear();
    this.certificationsFormArray.clear();
    
    // Add packages
    if (product.packages && product.packages.length > 0) {
      product.packages.forEach(pkg => {
        this.packagesFormArray.push(this.fb.group({
          size: [pkg.size, Validators.required],
          unit: [pkg.unit || 'L', Validators.required],
          unit_price: [pkg.unit_price, [Validators.required, Validators.min(0.01)]],
          currency: [pkg.currency, Validators.required],
          stock_level: [pkg.stock_level, [Validators.required, Validators.min(0)]],
          weight_kg: [pkg.weight_kg, [Validators.required, Validators.min(0.01)]],
          barcode: [pkg.barcode || ''],
          low_stock_threshold: [pkg.low_stock_threshold, [Validators.required, Validators.min(1)]],
          reorder_quantity: [pkg.reorder_quantity, [Validators.required, Validators.min(1)]],
          is_available: [pkg.is_available, Validators.required]
        }));
      });
    }
    
    // Add certifications
    if (product.certifications && product.certifications.length > 0) {
      product.certifications.forEach(cert => {
        this.certificationsFormArray.push(this.fb.group({
          certification_type: [cert.certification_type, Validators.required],
          certification_number: [cert.certification_number, Validators.required],
          issuing_body: [cert.issuing_body, Validators.required],
          issue_date: [cert.issue_date, Validators.required],
          is_active: [cert.is_active]
        }));
      });
    }
    
    // Update the form values, excluding the arrays which we've already handled
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      image_url: product.image_url,
      sku: product.sku,
      specifications: product.specifications,
      benefits: product.benefits,
      recommended_for: product.recommended_for,
      is_active: product.is_active,
      viscosity_grade: product.viscosity_grade,
      compatible_vehicles: product.compatible_vehicles
    });
    
    // Update viscosity grade options based on category
    this.updateViscosityGradeOptions(product.category);
  }

  get packagesFormArray(): FormArray {
    return this.productForm.get('packages') as FormArray;
  }

  get certificationsFormArray(): FormArray {
    return this.productForm.get('certifications') as FormArray;
  }

  addPackage(): void {
    this.packagesFormArray.push(this.createPackageFormGroup());
  }

  removePackage(index: number): void {
    this.packagesFormArray.removeAt(index);
  }

  addCertification(): void {
    this.certificationsFormArray.push(this.createCertificationFormGroup());
  }

  removeCertification(index: number): void {
    this.certificationsFormArray.removeAt(index);
  }

  addArrayItem(formControlName: string, value: string): void {
    const control = this.productForm.get(formControlName);
    const currentValues = control?.value as string[] || [];
    
    if (value && !currentValues.includes(value)) {
      control?.setValue([...currentValues, value]);
    }
  }

  removeArrayItem(formControlName: string, index: number): void {
    const control = this.productForm.get(formControlName);
    const currentValues = control?.value as string[] || [];
    
    if (index >= 0 && index < currentValues.length) {
      const newValues = [...currentValues];
      newValues.splice(index, 1);
      control?.setValue(newValues);
    }
  }

  private async updateRelatedData(productId: string, productData: Partial<Product>): Promise<void> {
    const supabase = this.supabaseService.getSupabase();
    
    // Update packages
    if (productData.packages) {
      // Delete existing packages
      const { error: deletePackagesError } = await supabase
        .from('product_packages')
        .delete()
        .eq('product_id', productId);
      
      if (deletePackagesError) throw deletePackagesError;

      // Insert new packages
      if (productData.packages.length > 0) {
        const { error: packagesError } = await supabase
          .from('product_packages')
          .insert(productData.packages.map(pkg => ({ ...pkg, product_id: productId })));
        
        if (packagesError) throw packagesError;
      }
    }

    // Update certifications
    if (productData.certifications) {
      // Delete existing certifications
      const { error: deleteCertError } = await supabase
        .from('product_certifications')
        .delete()
        .eq('product_id', productId);
      
      if (deleteCertError) throw deleteCertError;

      // Insert new certifications
      if (productData.certifications.length > 0) {
        const { error: certError } = await supabase
          .from('product_certifications')
          .insert(productData.certifications.map(cert => ({ ...cert, product_id: productId })));
        
        if (certError) throw certError;
      }
    }
  }

  private async createRelatedData(productId: string, productData: Partial<Product>): Promise<void> {
    const supabase = this.supabaseService.getSupabase();
    
    // Create packages
    if (productData.packages && productData.packages.length > 0) {
      const { error: packagesError } = await supabase
        .from('product_packages')
        .insert(productData.packages.map(pkg => ({ ...pkg, product_id: productId })));
      
      if (packagesError) throw packagesError;
    }

    // Create certifications
    if (productData.certifications && productData.certifications.length > 0) {
      const { error: certificationsError } = await supabase
        .from('product_certifications')
        .insert(productData.certifications.map(cert => ({ ...cert, product_id: productId })));
      
      if (certificationsError) throw certificationsError;
    }
  }

  private prepareProductData(): Partial<Product> {
    const formValue = this.productForm.value as ProductFormValue;
    
    // Ensure viscosity_grade is consistent
    if (formValue.specifications) {
      formValue.specifications.viscosity_grade = formValue.viscosity_grade;
    }
    
    return {
      name: formValue.name,
      description: formValue.description,
      brand: formValue.brand,
      category: formValue.category,
      image_url: formValue.image_url,
      sku: formValue.sku,
      packages: formValue.packages,
      specifications: formValue.specifications as ProductSpecifications,
      certifications: formValue.certifications,
      benefits: formValue.benefits,
      recommended_for: formValue.recommended_for,
      is_active: formValue.is_active,
      viscosity_grade: formValue.viscosity_grade,
      compatible_vehicles: formValue.compatible_vehicles
    };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          } else {
            c.markAsTouched();
          }
        });
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      return;
    }
    
    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    
    try {
      const productData = this.prepareProductData();

      const supabase = this.supabaseService.getSupabase();
      
      if (this.isEditMode && this.productId) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.productId);

        if (updateError) throw updateError;

        // Update packages and certifications
        await this.updateRelatedData(this.productId, productData);

        this.successMessage = 'Product updated successfully!';
      } else {
        // Create new product
        const currentUser = await firstValueFrom(this.supabaseService.currentUser$.pipe(take(1)));
        
        const { data: newProduct, error: createError } = await supabase
          .from('products')
          .insert({
            ...productData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: currentUser?.id || 'system'
          })
          .select()
          .single();

        if (createError) throw createError;
        if (!newProduct) throw new Error('Failed to create product');

        // Create packages and certifications
        await this.createRelatedData(newProduct.id as string, productData);

        this.successMessage = 'Product created successfully!';
        
        // Navigate after a short delay
        setTimeout(() => {
          this.router.navigate(['/admin/products']);
        }, 1500);
      }
    } catch (error: any) {
      this.errorMessage = `Error ${this.isEditMode ? 'updating' : 'creating'} product: ${error.message || 'Unknown error'}`;
      console.error('Error saving product:', error);
    } finally {
      this.isSaving = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }
}