import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { User, Product, ProductCategory } from '../../../cores/models';
import { AuthService } from '../../../cores/services/auth.service';
import { SupabaseService } from '../../../cores/services/supabase.service';

interface CustomerSummary {
  totalOrders: number;
  pendingOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
}

interface Order {
  id: string;
  date: Date;
  items: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking?: string;
}

interface LoyaltyInfo {
  points: number;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  nextLevel: 'Silver' | 'Gold' | 'Platinum' | 'Max';
  pointsToNextLevel: number;
  discountRate: number;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.scss']
})
export class CustomerDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentUser: User | null = null;
  
  // Dashboard data
  customerSummary: CustomerSummary = {
    totalOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0
  };

  recentOrders: Order[] = [];
  recommendedProducts: Product[] = [];
  loyaltyInfo: LoyaltyInfo = {
    points: 0,
    level: 'Bronze',
    nextLevel: 'Silver',
    pointsToNextLevel: 100,
    discountRate: 0
  };

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        
        // Redirect if not customer role
        if (user && user.role !== 'customer') {
          // Handle non-customer user (redirect will be handled by guard)
        } else if (user) {
          this.loadCustomerData();
        }
      });
  }

  private async loadCustomerData(): Promise<void> {
    if (!this.currentUser) return;
    
    try {
      await Promise.all([
        this.loadCustomerSummary(),
        this.loadRecentOrders(),
        this.loadLoyaltyInfo(),
        this.loadRecommendedProducts()
      ]);
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  }

  private async loadCustomerSummary(): Promise<void> {
    try {
      // Get all orders for the current user
      const { data: orders, error: ordersError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          order_items (
            id
          )
        `)
        .eq('user_id', this.currentUser?.id);
      
      if (!ordersError && orders) {
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => 
          ['pending', 'processing', 'shipped'].includes(order.status)
        ).length;
        
        const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
        
        // Get loyalty points
        const { data: loyaltyData, error: loyaltyError } = await this.supabaseService.getSupabase()
          .from('user_profiles')
          .select('loyalty_points')
          .eq('user_id', this.currentUser?.id)
          .single();
        
        const loyaltyPoints = !loyaltyError && loyaltyData ? loyaltyData.loyalty_points : 0;
        
        this.customerSummary = {
          totalOrders,
          pendingOrders,
          totalSpent,
          loyaltyPoints
        };
      } else {
        // Mock data for development
        this.customerSummary = {
          totalOrders: 8,
          pendingOrders: 2,
          totalSpent: 45000,
          loyaltyPoints: 450
        };
      }
    } catch (error) {
      console.error('Error loading customer summary:', error);
    }
  }

  private async loadRecentOrders(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('orders')
        .select(`
          id,
          created_at,
          total_amount,
          status,
          tracking_number,
          order_items (
            id
          )
        `)
        .eq('user_id', this.currentUser?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && data) {
        this.recentOrders = data.map(order => ({
          id: order.id,
          date: new Date(order.created_at),
          items: order.order_items?.length || 0,
          total: order.total_amount,
          status: order.status,
          tracking: order.tracking_number
        }));
      } else {
        // Mock data for development
        this.recentOrders = [
          { id: 'ORD-001', date: new Date(Date.now() - 3600000), items: 3, total: 12500, status: 'pending' },
          { id: 'ORD-002', date: new Date(Date.now() - 604800000), items: 2, total: 8200, status: 'processing', tracking: 'TRK123456' },
          { id: 'ORD-003', date: new Date(Date.now() - 2592000000), items: 5, total: 24600, status: 'delivered' },
          { id: 'ORD-004', date: new Date(Date.now() - 5184000000), items: 1, total: 4800, status: 'delivered' }
        ];
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  }

  private async loadLoyaltyInfo(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('user_profiles')
        .select('loyalty_points, loyalty_level')
        .eq('user_id', this.currentUser?.id)
        .single();
      
      if (!error && data) {
        const points = data.loyalty_points || 0;
        const currentLevel = data.loyalty_level || 'Bronze';
        
        // Define loyalty levels and thresholds
        const loyaltyLevels = {
          'Bronze': { threshold: 0, discount: 0, next: 'Silver', nextThreshold: 100 },
          'Silver': { threshold: 100, discount: 5, next: 'Gold', nextThreshold: 250 },
          'Gold': { threshold: 250, discount: 10, next: 'Platinum', nextThreshold: 500 },
          'Platinum': { threshold: 500, discount: 15, next: 'Max', nextThreshold: null }
        };
        
        const level = currentLevel as 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
        const nextLevel = loyaltyLevels[level].next as 'Silver' | 'Gold' | 'Platinum' | 'Max';
        const pointsToNext = loyaltyLevels[level].nextThreshold ? 
          Math.max(0, loyaltyLevels[level].nextThreshold - points) : 0;
        
        this.loyaltyInfo = {
          points,
          level,
          nextLevel,
          pointsToNextLevel: pointsToNext,
          discountRate: loyaltyLevels[level].discount
        };
      } else {
        // Mock data for development
        this.loyaltyInfo = {
          points: 180,
          level: 'Silver',
          nextLevel: 'Gold',
          pointsToNextLevel: 70,
          discountRate: 5
        };
      }
    } catch (error) {
      console.error('Error loading loyalty info:', error);
    }
  }

  private async loadRecommendedProducts(): Promise<void> {
    try {
      // First get user's order history to build recommendations
      const { data: orderItems, error: orderItemsError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select(`
          order_items (
            product_id
          )
        `)
        .eq('user_id', this.currentUser?.id);
      
      let productQuery = this.supabaseService.getSupabase()
        .from('products')
        .select(`
          id,
          name,
          description,
          brand,
          category,
          image_url,
          packages (
            id,
            size,
            price,
            stock_level
          )
        `)
        .order('created_at', { ascending: false })
        .limit(4);
      
      // If user has order history, try to recommend related products
      if (!orderItemsError && orderItems && orderItems.length > 0) {
        // Extract product categories from order history
        const purchasedProductIds = new Set<string>();
        const categoriesToRecommend = new Set<string>();
        
        orderItems.forEach(order => {
          order.order_items?.forEach((item: any) => {
            if (item.product_id) {
              purchasedProductIds.add(item.product_id);
            }
          });
        });
        
        // Get categories of purchased products
        if (purchasedProductIds.size > 0) {
          const { data: purchasedProducts, error: productsError } = await this.supabaseService.getSupabase()
            .from('products')
            .select('category')
            .in('id', Array.from(purchasedProductIds));
          
          if (!productsError && purchasedProducts) {
            purchasedProducts.forEach(product => {
              if (product.category) {
                categoriesToRecommend.add(product.category);
              }
            });
          }
        }
        
        // Modify query to filter by similar categories if we have any
        if (categoriesToRecommend.size > 0) {
          productQuery = productQuery.in('category', Array.from(categoriesToRecommend));
          
          // Exclude already purchased products
          if (purchasedProductIds.size > 0) {
            productQuery = productQuery.not('id', 'in', Array.from(purchasedProductIds));
          }
        }
      }
      
      // Execute the query
      const { data: products, error: productsError } = await productQuery;
      
      if (!productsError && products) {
        // Map the response data to match the Product interface structure
        this.recommendedProducts = products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          brand: p.brand,
          category: p.category as ProductCategory,
          image_url: p.image_url,
          sku: (p as any).sku || `SKU-${p.id}`,
          packages: (p.packages || []).map(pkg => ({
            id: pkg.id || `pkg-${p.id}-${Math.random().toString(36).substring(2, 7)}`,
            product_id: p.id,
            size: pkg.size || '1L',
            unit: p.category === 'grease' ? 'g' : 'L', // Default unit based on category
            unit_price: (pkg as any).price || 0,
            currency: 'KES', // Default currency
            weight_kg: 1.0, // Default weight
            stock_level: pkg.stock_level || 0,
            low_stock_threshold: 10,
            reorder_quantity: 20,
            is_available: true
          })),
          specifications: (p as any).specifications || {},
          certifications: (p as any).certifications || [],
          benefits: (p as any).benefits || [],
          recommended_for: (p as any).recommended_for || [],
          is_active: (p as any).is_active !== undefined ? (p as any).is_active : true,
          created_at: (p as any).created_at ? new Date((p as any).created_at) : new Date(),
          updated_at: (p as any).updated_at ? new Date((p as any).updated_at) : new Date(),
          viscosity_grade: (p as any).viscosity_grade || ((p as any).specifications?.viscosity_grade || ''),
          oem_approvals: (p as any).oem_approvals || [],
          // Add missing required properties from Product interface
          created_by: (p as any).created_by || 'system',
          compatible_vehicles: (p as any).compatible_vehicles || []
        }));
      } else {
        // Mock data for development
        const now = new Date();
        this.recommendedProducts = [
          {
            id: '1',
            sku: 'MP-EO-5W30-1',
            name: 'MaxPro Engine Oil 5W-30',
            description: 'Premium synthetic engine oil for ultimate engine protection',
            brand: 'MaxPro',
            category: 'engine_oil',
            viscosity_grade: '5W-30',
            image_url: '/assets/images/products/engine-oil-1.jpg',
            is_active: true,
            created_at: now,
            created_by: 'system',
            packages: [
              { 
                id: '1-1', 
                product_id: '1',
                size: '1L', 
                unit_price: 1500, 
                currency: 'KES',
                unit: 'L', // Add unit property
                weight_kg: 1.1,
                stock_level: 25,
                low_stock_threshold: 10,
                reorder_quantity: 50,
                is_available: true
              },
              { 
                id: '1-2', 
                product_id: '1',
                size: '5L', 
                unit_price: 6500, 
                currency: 'KES',
                unit: 'L', // Add unit property
                weight_kg: 5.2,
                stock_level: 15,
                low_stock_threshold: 5,
                reorder_quantity: 20,
                is_available: true
              }
            ],
            specifications: {
              base_oil_type: 'synthetic',
              api_classification: 'API SN',
              acea_classification: 'ACEA A3/B4',
              flash_point: 220,
              pour_point: -42,
              density: 0.855,
              additives: ['Anti-wear', 'Anti-oxidant', 'Detergent', 'Dispersant']
            },
            certifications: [
              {
                id: 'cert-1',
                product_id: '1',
                certification_type: 'KEBS',
                certification_number: 'KEBS-123456',
                issuing_body: 'Kenya Bureau of Standards',
                issue_date: new Date(now.getFullYear(), now.getMonth() - 6, 1),
                is_active: true
              }
            ],
            compatible_vehicles: ['petrol', 'diesel', 'hybrid'],
            meta_tags: ['synthetic', 'engine oil', 'motor oil', '5W-30']
          },
          {
            id: '2',
            sku: 'GS-GO-80W90-1',
            name: 'GearShield 80W-90',
            description: 'Heavy-duty gear oil for transmissions and differentials',
            brand: 'GearShield',
            category: 'gear_oil',
            viscosity_grade: 'SAE 90',
            image_url: '/assets/images/products/gear-oil-1.jpg',
            is_active: true,
            created_at: now,
            created_by: 'system',
            packages: [
              { 
                id: '2-1', 
                product_id: '2',
                size: '1L', 
                unit_price: 1200, 
                currency: 'KES',
                unit: 'L', // Add unit property
                weight_kg: 1.1,
                stock_level: 18,
                low_stock_threshold: 8,
                reorder_quantity: 40,
                is_available: true
              },
              { 
                id: '2-2', 
                product_id: '2',
                size: '5L', 
                unit_price: 5500, 
                currency: 'KES',
                unit: 'L', // Add unit property
                weight_kg: 5.2,
                stock_level: 10,
                low_stock_threshold: 5,
                reorder_quantity: 20,
                is_available: true
              }
            ],
            specifications: {
              base_oil_type: 'mineral',
              api_classification: 'API GL-5',
              flash_point: 215,
              pour_point: -15,
              density: 0.905,
              additives: ['Extreme pressure', 'Anti-wear', 'Anti-corrosion']
            },
            certifications: [
              {
                id: 'cert-2',
                product_id: '2',
                certification_type: 'KEBS',
                certification_number: 'KEBS-234567',
                issuing_body: 'Kenya Bureau of Standards',
                issue_date: new Date(now.getFullYear(), now.getMonth() - 4, 15),
                is_active: true
              }
            ],
            compatible_vehicles: ['petrol', 'diesel', 'commercial'],
            meta_tags: ['gear oil', 'transmission oil', 'differential oil', '80W-90']
          },
          {
            id: '3',
            sku: 'HF-HO-ISO46-1',
            name: 'HydroFlow Premium',
            description: 'High-performance hydraulic oil for industrial applications',
            brand: 'HydroFlow',
            category: 'hydraulic_oil',
            viscosity_grade: 'ISO 46',
            image_url: '/assets/images/products/hydraulic-oil-1.jpg',
            is_active: true,
            created_at: now,
            created_by: 'system',
            packages: [
              { 
                id: '3-1', 
                product_id: '3',
                size: '5L', 
                unit_price: 4800, 
                currency: 'KES',
                unit: 'L', // Add unit property
                weight_kg: 5.2,
                stock_level: 12,
                low_stock_threshold: 5,
                reorder_quantity: 15,
                is_available: true
              },
              { 
                id: '3-2', 
                product_id: '3',
                size: '20L', 
                unit_price: 18000, 
                currency: 'KES',
                unit: 'L', // Add unit property
                weight_kg: 20.5,
                stock_level: 8,
                low_stock_threshold: 3,
                reorder_quantity: 10,
                is_available: true
              }
            ],
            specifications: {
              base_oil_type: 'mineral',
              flash_point: 210,
              pour_point: -21,
              density: 0.875,
              additives: ['Anti-wear', 'Anti-oxidant', 'Anti-foam', 'Rust inhibitor']
            },
            certifications: [
              {
                id: 'cert-3',
                product_id: '3',
                certification_type: 'ISO',
                certification_number: 'ISO-345678',
                issuing_body: 'International Organization for Standardization',
                issue_date: new Date(now.getFullYear(), now.getMonth() - 8, 10),
                is_active: true
              }
            ],
            compatible_vehicles: ['commercial', 'agricultural'],
            meta_tags: ['hydraulic oil', 'industrial oil', 'ISO 46', 'machinery']
          },
          {
            id: '4',
            sku: 'MP-GR-NLGI2-1',
            name: 'HeavyDuty Grease',
            description: 'Multi-purpose grease for heavy-duty applications',
            brand: 'MaxPro',
            category: 'grease',
            viscosity_grade: 'NLGI 2',
            image_url: '/assets/images/products/grease-1.jpg',
            is_active: true,
            created_at: now,
            created_by: 'system',
            packages: [
              { 
                id: '4-1', 
                product_id: '4',
                size: 'other', 
                custom_size: '500g',
                unit_price: 850, 
                unit: 'g', // Add unit property
                currency: 'KES',
                weight_kg: 0.55,
                stock_level: 30,
                low_stock_threshold: 10,
                reorder_quantity: 50,
                is_available: true
              },
              { 
                id: '4-2', 
                product_id: '4',
                size: 'other', 
                custom_size: '1kg',
                unit_price: 1600, 
                unit: 'g', // Add unit property
                currency: 'KES',
                weight_kg: 1.1,
                stock_level: 15,
                low_stock_threshold: 5,
                reorder_quantity: 25,
                is_available: true
              }
            ],
            specifications: {
              base_oil_type: 'mineral',
              flash_point: 230,
              pour_point: -10,
              density: 0.900,
              additives: ['Extreme pressure', 'Anti-wear', 'Anti-corrosion']
            },
            certifications: [
              {
                id: 'cert-4',
                product_id: '4',
                certification_type: 'KEBS',
                certification_number: 'KEBS-456789',
                issuing_body: 'Kenya Bureau of Standards',
                issue_date: new Date(now.getFullYear(), now.getMonth() - 5, 20),
                is_active: true
              }
            ],
            compatible_vehicles: ['petrol', 'diesel', 'commercial', 'agricultural'],
            meta_tags: ['grease', 'lithium grease', 'multipurpose grease', 'NLGI 2', 'bearing grease']
          }
        ];
      }
    } catch (error) {
      console.error('Error loading recommended products:', error);
    }
  }

  // Utility Methods for the Template
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-KE').format(num);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getProductImage(product: any): string {
    return product.image_url || `/assets/images/products/default-${product.category}.jpg`;
  }

  getProductPrice(product: any): number {
    if (!product.packages || product.packages.length === 0) {
      return 0;
    }
    return Math.min(...product.packages.map((pkg: any) => pkg.price));
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'engine_oil': return 'Engine Oil';
      case 'gear_oil': return 'Gear Oil';
      case 'hydraulic_oil': return 'Hydraulic Oil';
      case 'grease': return 'Grease';
      default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }

  getLoyaltyLevelClass(level: string): string {
    switch (level) {
      case 'Bronze': return 'bg-amber-100 text-amber-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Platinum': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  calculateLoyaltyProgress(): number {
    if (this.loyaltyInfo.pointsToNextLevel === 0) {
      return 100;
    }
    
    const currentLevelPoints = (() => {
      switch (this.loyaltyInfo.level) {
        case 'Bronze': return 0;
        case 'Silver': return 100;
        case 'Gold': return 250;
        case 'Platinum': return 500;
        default: return 0;
      }
    })();
    
    const nextLevelPoints = (() => {
      switch (this.loyaltyInfo.nextLevel) {
        case 'Silver': return 100;
        case 'Gold': return 250;
        case 'Platinum': return 500;
        case 'Max': return this.loyaltyInfo.points; // Already at max
        default: return 100;
      }
    })();
    
    const range = nextLevelPoints - currentLevelPoints;
    const pointsInRange = this.loyaltyInfo.points - currentLevelPoints;
    
    return Math.round((pointsInRange / range) * 100);
  }
}