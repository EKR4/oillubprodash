import { Injectable } from '@angular/core';
import { Observable, of, map, catchError, BehaviorSubject } from 'rxjs';
import { 
  Product, 
  ProductCategory, 
  ProductSpecifications,
  ProductPackage,
  ProductCertification,
  VehicleType
} from '../../cores/models/product';
import { SupabaseService } from '../../cores/services/supabase.service';

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

  constructor(private supabaseService: SupabaseService) {
    // Initialize categories
    this.categoriesSubject.next([
      { id: 'engine_oil', name: 'Engine Oil' },
      { id: 'gear_oil', name: 'Gear Oil' },
      { id: 'hydraulic_oil', name: 'Hydraulic Oil' },
      { id: 'grease', name: 'Grease' }
    ]);
  }

  /**
   * Load products from the database
   */
  loadProducts(category?: ProductCategory): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // In a real app, this would use the Supabase client to fetch products
    // For now, we'll use mock data
    setTimeout(() => {
      const products = this.getMockProducts();
      
      if (category) {
        const filtered = products.filter(p => p.category === category);
        this.productsSubject.next(filtered);
      } else {
        this.productsSubject.next(products);
      }
      
      this.isLoadingSubject.next(false);
    }, 800); // Simulate network delay
  }

  /**
   * Get a single product by ID
   */
  getProductById(id: string): Observable<Product | null> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // In a real app, this would fetch the product from Supabase
    return of(this.getMockProducts().find(p => p.id === id) || null).pipe(
      map(product => {
        this.isLoadingSubject.next(false);
        if (!product) {
          this.errorSubject.next('Product not found');
        }
        return product;
      }),
      catchError(err => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Error fetching product: ' + err.message);
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

    const termLower = term.toLowerCase();
    const filtered = this.getMockProducts().filter(p => 
      p.name.toLowerCase().includes(termLower) || 
      p.description.toLowerCase().includes(termLower)
    );

    setTimeout(() => {
      this.productsSubject.next(filtered);
      this.isLoadingSubject.next(false);
    }, 300);
  }

  /**
   * Get featured products for the home page
   */
  getFeaturedProducts(): Observable<Product[]> {
    // In a real app, this would fetch featured products from Supabase
    const featured = this.getMockProducts().filter(p => p.is_featured);
    return of(featured);
  }

  /**
   * Mock data for development
   */
  private getMockProducts(): Product[] {
    return [
      {
        id: '1',
        sku: 'LBM-EO-5W30-1',
        name: 'MaxPro Synthetic Engine Oil 5W-30',
        description: 'High-performance fully synthetic engine oil suitable for modern gasoline and diesel engines. Provides exceptional protection against wear and tear while improving fuel efficiency.',
        category: 'engine_oil',
        brand: 'LubriMax',
        viscosity_grade: '5W-30',
        image_url: 'https://example.com/products/engine-oil-5w30.jpg',
        is_active: true,
        is_featured: true,
        created_at: new Date(),
        created_by: 'system',
        specifications: {
          base_oil_type: 'synthetic',
          api_classification: 'API SN',
          acea_classification: 'ACEA A3/B4',
          oem_approvals: ['Mercedes-Benz 229.5', 'BMW LL-01'],
          flash_point: 225,
          pour_point: -42,
          density: 0.85,
          additives: ['Anti-wear', 'Detergent', 'Anti-oxidant']
        },
        packages: [
          {
            id: 'pkg-1-1',
            product_id: '1',
            size: '1L',
            unit_price: 24.99,
            currency: 'USD',
            weight_kg: 1.1,
            stock_level: 120,
            low_stock_threshold: 20,
            reorder_quantity: 50,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-1-2',
            product_id: '1',
            unit: '5L',
            unit_price: 99.99,
            currency: 'USD',
            weight_kg: 5.2,
            stock_level: 75,
            low_stock_threshold: 15,
            reorder_quantity: 30,
            is_available: true,
            size: 'other'
          }
        ],
        certifications: [
          {
            id: 'cert-1-1',
            product_id: '1',
            certification_type: 'KEBS',
            certification_number: 'KEBS-2023-001',
            issuing_body: 'Kenya Bureau of Standards',
            issue_date: new Date('2023-01-15'),
            expiry_date: new Date('2026-01-14'),
            is_active: true
          },
          {
            id: 'cert-1-2',
            product_id: '1',
            certification_type: 'API',
            certification_number: 'API-SN-78945',
            issuing_body: 'American Petroleum Institute',
            issue_date: new Date('2022-05-10'),
            is_active: true
          }
        ],
        compatible_vehicles: ['petrol', 'diesel', 'hybrid']
      },
      {
        id: '2',
        sku: 'LBM-GO-85W140-1',
        name: 'GearShield Heavy Duty 85W-140',
        description: 'Premium gear oil formulated for heavy-duty applications. Provides superior protection for gears operating under extreme pressure and high temperatures.',
        category: 'gear_oil',
        brand: 'LubriMax',
        viscosity_grade: 'other',
        image_url: 'https://example.com/products/gear-oil-85w140.jpg',
        is_active: true,
        is_featured: true,
        created_at: new Date(),
        created_by: 'system',
        specifications: {
          base_oil_type: 'mineral',
          api_classification: 'API GL-5',
          oem_approvals: ['MIL-L-2105D'],
          flash_point: 215,
          pour_point: -18,
          density: 0.91,
          additives: ['Extreme pressure', 'Anti-foam', 'Anti-corrosion']
        },
        packages: [
          {
            id: 'pkg-2-1',
            product_id: '2',
            size: '1L',
            unit_price: 19.99,
            currency: 'USD',
            weight_kg: 1.0,
            stock_level: 85,
            low_stock_threshold: 20,
            reorder_quantity: 40,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-2-2',
            product_id: '2',
            size: '5L',
            unit_price: 79.99,
            currency: 'USD',
            weight_kg: 5.0,
            stock_level: 50,
            low_stock_threshold: 10,
            reorder_quantity: 25,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-2-3',
            product_id: '2',
            size: '20L',
            unit_price: 289.99,
            currency: 'USD',
            weight_kg: 20.0,
            stock_level: 20,
            low_stock_threshold: 5,
            reorder_quantity: 10,
            is_available: true,
            unit: ''
          }
        ],
        certifications: [
          {
            id: 'cert-2-1',
            product_id: '2',
            certification_type: 'KEBS',
            certification_number: 'KEBS-2023-002',
            issuing_body: 'Kenya Bureau of Standards',
            issue_date: new Date('2023-02-10'),
            expiry_date: new Date('2026-02-09'),
            is_active: true
          }
        ],
        compatible_vehicles: ['commercial', 'agricultural']
      },
      {
        id: '3',
        sku: 'LBM-HO-ISO46-1',
        name: 'HydraFlow Premium Hydraulic Oil ISO 46',
        description: 'High-quality hydraulic oil designed for industrial and mobile hydraulic systems. Offers excellent wear protection and oxidation stability.',
        category: 'hydraulic_oil',
        brand: 'LubriMax',
        viscosity_grade: 'ISO 46',
        image_url: 'https://example.com/products/hydraulic-oil-iso46.jpg',
        is_active: true,
        is_featured: false,
        created_at: new Date(),
        created_by: 'system',
        specifications: {
          base_oil_type: 'mineral',
          oem_approvals: ['DIN 51524-2', 'ISO 11158'],
          flash_point: 220,
          pour_point: -25,
          density: 0.87,
          additives: ['Anti-wear', 'Anti-foam', 'Anti-oxidant']
        },
        packages: [
          {
            id: 'pkg-3-1',
            product_id: '3',
            size: '5L',
            unit_price: 59.99,
            currency: 'USD',
            weight_kg: 5.0,
            stock_level: 100,
            low_stock_threshold: 20,
            reorder_quantity: 40,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-3-2',
            product_id: '3',
            size: '20L',
            unit_price: 219.99,
            currency: 'USD',
            weight_kg: 20.0,
            stock_level: 30,
            low_stock_threshold: 8,
            reorder_quantity: 15,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-3-3',
            product_id: '3',
            size: '200L',
            unit_price: 1999.99,
            currency: 'USD',
            weight_kg: 210.0,
            stock_level: 10,
            low_stock_threshold: 2,
            reorder_quantity: 5,
            is_available: true,
            unit: ''
          }
        ],
        certifications: [
          {
            id: 'cert-3-1',
            product_id: '3',
            certification_type: 'KEBS',
            certification_number: 'KEBS-2023-003',
            issuing_body: 'Kenya Bureau of Standards',
            issue_date: new Date('2023-03-05'),
            expiry_date: new Date('2026-03-04'),
            is_active: true
          }
        ],
        compatible_vehicles: ['commercial', 'agricultural']
      },
      {
        id: '4',
        sku: 'LBM-GR-NLGI2-1',
        name: 'HeavyDuty Multi-Purpose Grease NLGI 2',
        description: 'Versatile lithium-complex grease for automotive and industrial applications. Provides excellent water resistance and mechanical stability.',
        category: 'grease',
        brand: 'LubriMax',
        viscosity_grade: 'NLGI 2',
        image_url: 'https://example.com/products/multi-grease-nlgi2.jpg',
        is_active: true,
        is_featured: true,
        created_at: new Date(),
        created_by: 'system',
        specifications: {
          base_oil_type: 'mineral',
          oem_approvals: ['DIN 51502', 'ISO 6743-9'],
          flash_point: 200,
          pour_point: -20,
          density: 0.9,
          additives: ['EP additives', 'Anti-rust', 'Anti-oxidant']
        },
        packages: [
          {
            id: 'pkg-4-1',
            product_id: '4',
            size: 'other',
            custom_size: '400g',
            unit_price: 14.99,
            currency: 'USD',
            weight_kg: 0.45,
            stock_level: 150,
            low_stock_threshold: 30,
            reorder_quantity: 60,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-4-2',
            product_id: '4',
            size: 'other',
            custom_size: '1kg',
            unit_price: 29.99,
            currency: 'USD',
            weight_kg: 1.1,
            stock_level: 80,
            low_stock_threshold: 20,
            reorder_quantity: 40,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-4-3',
            product_id: '4',
            size: 'other',
            custom_size: '5kg',
            unit_price: 129.99,
            currency: 'USD',
            weight_kg: 5.2,
            stock_level: 35,
            low_stock_threshold: 10,
            reorder_quantity: 20,
            is_available: true,
            unit: ''
          }
        ],
        certifications: [
          {
            id: 'cert-4-1',
            product_id: '4',
            certification_type: 'KEBS',
            certification_number: 'KEBS-2023-004',
            issuing_body: 'Kenya Bureau of Standards',
            issue_date: new Date('2023-01-25'),
            expiry_date: new Date('2026-01-24'),
            is_active: true
          }
        ],
        compatible_vehicles: ['petrol', 'diesel', 'commercial']
      },
      {
        id: '5',
        sku: 'LBM-EO-0W20-1',
        name: 'MaxPro Synthetic Engine Oil 0W-20',
        description: 'Ultra-premium fully synthetic engine oil for modern high-performance engines. Delivers outstanding fuel economy and engine protection.',
        category: 'engine_oil',
        brand: 'LubriMax',
        viscosity_grade: '0W-20',
        image_url: 'https://example.com/products/engine-oil-0w20.jpg',
        is_active: true,
        is_featured: true,
        created_at: new Date(),
        created_by: 'system',
        specifications: {
          base_oil_type: 'synthetic',
          api_classification: 'API SP',
          acea_classification: 'ILSAC GF-6',
          oem_approvals: ['GM dexos1'],
          flash_point: 230,
          pour_point: -45,
          density: 0.84,
          additives: ['Anti-wear', 'Friction modifier', 'Detergent', 'Anti-oxidant']
        },
        packages: [
          {
            id: 'pkg-5-1',
            product_id: '5',
            size: '1L',
            unit_price: 29.99,
            currency: 'USD',
            weight_kg: 1.0,
            stock_level: 75,
            low_stock_threshold: 15,
            reorder_quantity: 30,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-5-2',
            product_id: '5',
            size: '5L',
            unit_price: 139.99,
            currency: 'USD',
            weight_kg: 5.0,
            stock_level: 40,
            low_stock_threshold: 10,
            reorder_quantity: 20,
            is_available: true,
            unit: ''
          }
        ],
        certifications: [
          {
            id: 'cert-5-1',
            product_id: '5',
            certification_type: 'KEBS',
            certification_number: 'KEBS-2023-005',
            issuing_body: 'Kenya Bureau of Standards',
            issue_date: new Date('2023-02-15'),
            expiry_date: new Date('2026-02-14'),
            is_active: true
          }
        ],
        compatible_vehicles: ['petrol', 'hybrid']
      },
      {
        id: '6',
        sku: 'LBM-GO-ATF-1',
        name: 'TranSmooth Automatic Transmission Fluid',
        description: 'High-performance transmission fluid for modern automatic transmissions. Ensures smooth shifting and excellent wear protection.',
        category: 'gear_oil',
        brand: 'LubriMax',
        viscosity_grade: 'other',
        image_url: 'https://example.com/products/atf-fluid.jpg',
        is_active: true,
        is_featured: true,
        created_at: new Date(),
        created_by: 'system',
        specifications: {
          base_oil_type: 'synthetic',
          oem_approvals: ['DEXRON VI', 'MERCON LV', 'Toyota WS'],
          flash_point: 220,
          pour_point: -45,
          density: 0.85,
          additives: ['Friction modifier', 'Anti-oxidant', 'Anti-wear']
        },
        packages: [
          {
            id: 'pkg-6-1',
            product_id: '6',
            size: '1L',
            unit_price: 22.99,
            currency: 'USD',
            weight_kg: 1.0,
            stock_level: 90,
            low_stock_threshold: 20,
            reorder_quantity: 40,
            is_available: true,
            unit: ''
          },
          {
            id: 'pkg-6-2',
            product_id: '6',
            size: '5L',
            unit_price: 99.99,
            currency: 'USD',
            weight_kg: 5.0,
            stock_level: 45,
            low_stock_threshold: 10,
            reorder_quantity: 20,
            is_available: true,
            unit: ''
          }
        ],
        certifications: [
          {
            id: 'cert-6-1',
            product_id: '6',
            certification_type: 'KEBS',
            certification_number: 'KEBS-2023-006',
            issuing_body: 'Kenya Bureau of Standards',
            issue_date: new Date('2023-01-30'),
            expiry_date: new Date('2026-01-29'),
            is_active: true
          }
        ],
        compatible_vehicles: ['petrol', 'diesel', 'hybrid']
      }
    ];
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
        return `${pkg.currency} ${pkg.unit_price.toFixed(2)}`;
      }
    }
    
    // If no specific package is found or requested, return the price of the smallest package
    if (product.packages && product.packages.length > 0) {
      const smallest = product.packages.sort((a, b) => a.unit_price - b.unit_price)[0];
      return `${smallest.currency} ${smallest.unit_price.toFixed(2)}`;
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