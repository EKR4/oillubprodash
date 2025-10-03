import { Injectable } from '@angular/core';
import { Observable, of, map, catchError, BehaviorSubject, from, switchMap, forkJoin, take } from 'rxjs';
import { 
  Product, 
  ProductCategory, 
  ProductSpecifications,
  ProductPackage,
  ProductCertification,
  VehicleType,
  ViscosityGrade,
  ProductsResponse
} from '../../cores/models/product';
import { SupabaseService } from '../../cores/services/supabase.service';
import { AuthService } from '../../cores/services/auth.service';
import { User } from '../../cores/models/user';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();
  private categoriesSubject = new BehaviorSubject<{id: string, name: string}[]>([]);
  public categories$ = this.categoriesSubject.asObservable();
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();
  private readonly DEFAULT_CURRENCY = 'KES'; // Using KES (Kenyan Shillings) consistently

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    // Initialize categories
    this.categoriesSubject.next([
      { id: 'engine_oil', name: 'Engine Oil' },
      { id: 'gear_oil', name: 'Gear Oil' },
      { id: 'hydraulic_oil', name: 'Hydraulic Oil' },
      { id: 'grease', name: 'Grease' }
    ]);
  }

  /**
   * Load products from Supabase with company_id filtering
   */
  loadProducts(category?: ProductCategory): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Get current user's company_id for filtering
    this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        // Build query - Use RPC function for proper filtering
        if (category) {
          return from(this.supabaseService.getSupabase()
            .rpc('get_products_by_category', { 
              category_param: category,
              company_id_param: user?.role === 'company' ? user?.company_id : null
            }));
        } else {
          return from(this.supabaseService.getSupabase()
            .rpc('get_company_products', { 
              company_id_param: user?.role === 'company' ? user?.company_id : null
            }));
        }
      }),
      switchMap(({ data: baseProducts, error: baseError }) => {
        if (baseError) {
          throw new Error(baseError.message);
        }
        
        if (!baseProducts || baseProducts.length === 0) {
          return of([]);
        }
        
        // Define base product type for better type safety
        type BaseProductRecord = {
          id: string;
          sku: string;
          name: string;
          description: string;
          brand: string;
          category: string;
          viscosity_grade: string;
          company_id?: string;
          created_at: string;
          updated_at?: string;
          created_by: string;
          updated_by?: string;
          is_active: boolean;
          is_featured?: boolean;
          [key: string]: any; // Allow for additional properties
        };

        // Get related data for each product
        const productRequests = baseProducts.map((baseProduct: BaseProductRecord) => {
          // Get specifications
          const specificationsQuery = this.supabaseService.getSupabase()
            .from('product_specifications')
            .select('*')
            .eq('product_id', baseProduct.id)
            .single();
          
          // Get packages
          const packagesQuery = this.supabaseService.getSupabase()
            .from('product_packages')
            .select('*')
            .eq('product_id', baseProduct.id);
          
          // Get certifications
          const certificationsQuery = this.supabaseService.getSupabase()
            .from('product_certifications')
            .select('*')
            .eq('product_id', baseProduct.id);
          
          // Get compatible vehicles
          const vehiclesQuery = this.supabaseService.getSupabase()
            .from('product_compatible_vehicles')
            .select('*')
            .eq('product_id', baseProduct.id);
          
          return forkJoin({
            base: of(baseProduct),
            specs: from(specificationsQuery),
            packages: from(packagesQuery),
            certs: from(certificationsQuery),
            vehicles: from(vehiclesQuery)
          }).pipe(
            map(({ base, specs, packages, certs, vehicles }) => {
              // Map to complete Product object
              const product: Product = {
                ...base,
                // Cast string types to their proper enum types
                category: base.category as ProductCategory,
                viscosity_grade: base.viscosity_grade as ViscosityGrade,
                specifications: specs.data || {},
                packages: packages.data || [],
                certifications: certs.data || [],
                compatible_vehicles: vehicles.data?.map(v => v.vehicle_type as VehicleType) || [],
                created_at: new Date(base.created_at),
                updated_at: base.updated_at ? new Date(base.updated_at) : undefined
              };
              
              // Ensure all packages use KES currency
              if (product.packages) {
                product.packages.forEach(pkg => {
                  pkg.currency = this.DEFAULT_CURRENCY;
                });
              }
              
              return product;
            }),
            catchError(err => {
              console.error(`Error loading details for product ${baseProduct.id}:`, err);
              return of(null);
            })
          );
        });
        
        // Properly type the observable before applying operators
        return (forkJoin(productRequests) as Observable<(Product | null)[]>).pipe(
          map(products => products.filter(p => p !== null) as Product[])
        );
      })
    ).subscribe({
      next: (products) => {
        this.productsSubject.next(products);
        this.isLoadingSubject.next(false);
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.errorSubject.next(err.message);
        this.isLoadingSubject.next(false);
      }
    });
  }

  /**
   * Get a single product by ID
   */
  getProductById(id: string): Observable<Product | null> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);
    
    return from(this.supabaseService.getSupabase()
      .from('products')
      .select(`
        *,
        specifications:product_specifications(*),
        packages:product_packages(*),
        certifications:product_certifications(*),
        compatible_vehicles:product_compatible_vehicles(vehicle_type)
      `)
      .eq('id', id)
      .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Product not found');
        
        // Map the response to a Product object
        const product: Product = {
          ...data,
          compatible_vehicles: data.compatible_vehicles?.map((v: any) => v.vehicle_type as VehicleType) || [],
          created_at: new Date(data.created_at),
          updated_at: data.updated_at ? new Date(data.updated_at) : undefined
        };
        
        // Ensure all packages use KES currency
        if (product.packages) {
          product.packages.forEach(pkg => {
            pkg.currency = this.DEFAULT_CURRENCY;
          });
        }
        
        this.isLoadingSubject.next(false);
        return product;
      }),
      catchError(err => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Error fetching product: ' + err.message);
        console.error('Error fetching product:', err);
        return of(null);
      })
    );
  }

  /**
   * Search products by name or description
   */
  searchProducts(term: string): void {
    if (!term.trim()) {
      this.loadProducts();
      return;
    }

    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Get current user's company_id for filtering
    this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        const termLower = term.toLowerCase();
        let query = this.supabaseService.getSupabase()
          .from('products')
          .select(`
            *,
            specifications:product_specifications(*),
            packages:product_packages(*),
            certifications:product_certifications(*),
            compatible_vehicles:product_compatible_vehicles(vehicle_type)
          `)
          .or(`name.ilike.%${termLower}%,description.ilike.%${termLower}%`)
          .eq('is_active', true);
          
        // Add company filtering for company users
        if (user?.role === 'company' && user?.company_id) {
          query = query.eq('company_id', user.company_id);
        }
        
        return from(query);
      }),
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        
        // Map the response to Product objects
        const products = (data || []).map(item => {
          const product: Product = {
            ...item,
            compatible_vehicles: item.compatible_vehicles?.map((v: any) => v.vehicle_type as VehicleType) || [],
            created_at: new Date(item.created_at),
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined
          };
          
          // Ensure all packages use KES currency
          if (product.packages) {
            product.packages.forEach(pkg => {
              pkg.currency = this.DEFAULT_CURRENCY;
            });
          }
          
          return product;
        });
        
        return products;
      })
    ).subscribe({
      next: (products) => {
        this.productsSubject.next(products);
        this.isLoadingSubject.next(false);
      },
      error: (err) => {
        console.error('Error searching products:', err);
        this.errorSubject.next(err.message);
        this.isLoadingSubject.next(false);
      }
    });
  }

  /**
   * Get featured products for the home page
   */
  getFeaturedProducts(): Observable<Product[]> {
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        let query = this.supabaseService.getSupabase()
          .from('products')
          .select(`
            *,
            specifications:product_specifications(*),
            packages:product_packages(*),
            certifications:product_certifications(*),
            compatible_vehicles:product_compatible_vehicles(vehicle_type)
          `)
          .eq('is_featured', true)
          .eq('is_active', true)
          .limit(6);
          
        // Add company filtering for company users
        if (user?.role === 'company' && user?.company_id) {
          query = query.eq('company_id', user.company_id);
        }
        
        return from(query);
      }),
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        
        // Map the response to Product objects
        const products = (data || []).map(item => {
          const product: Product = {
            ...item,
            compatible_vehicles: item.compatible_vehicles?.map((v: any) => v.vehicle_type as VehicleType) || [],
            created_at: new Date(item.created_at),
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined
          };
          
          // Ensure all packages use KES currency
          if (product.packages) {
            product.packages.forEach(pkg => {
              pkg.currency = this.DEFAULT_CURRENCY;
            });
          }
          
          return product;
        });
        
        return products;
      }),
      catchError(err => {
        console.error('Error fetching featured products:', err);
        return of([]);
      })
    );
  }

  /**
   * Helper function to get product image URL (with fallback)
   */
  getProductImageUrl(product: Product): string {
    return product.image_url || 'assets/images/product-placeholder.jpg';
  }

  /**
   * Get formatted price with currency
   */
  getFormattedPrice(product: Product, packageSize?: string): string {
    if (packageSize && product.packages) {
      const pkg = product.packages.find(p => p.size === packageSize || p.custom_size === packageSize);
      if (pkg) {
        return `${this.DEFAULT_CURRENCY} ${pkg.unit_price.toFixed(2)}`;
      }
    }
    
    // If no specific package is found or requested, return the price of the smallest package
    if (product.packages && product.packages.length > 0) {
      const smallest = product.packages.sort((a, b) => a.unit_price - b.unit_price)[0];
      return `${this.DEFAULT_CURRENCY} ${smallest.unit_price.toFixed(2)}`;
    }
    
    return 'Price not available';
  }

  /**
   * Check if a product is in stock
   */
  isInStock(product: Product, packageSize?: string): boolean {
    if (packageSize && product.packages) {
      const pkg = product.packages.find(p => p.size === packageSize || p.custom_size === packageSize);
      return pkg ? pkg.stock_level > 0 && pkg.is_available : false;
    }
    
    // If no specific package is requested, check if any package is in stock
    return product.packages ? product.packages.some(p => p.stock_level > 0 && p.is_available) : false;
  }

  /**
   * Get available package sizes for a product
   */
  getPackageSizes(product: Product): string[] {
    if (!product.packages) return [];
    
    return product.packages
      .filter(p => p.is_available)
      .map(p => p.custom_size || p.size);
  }
}