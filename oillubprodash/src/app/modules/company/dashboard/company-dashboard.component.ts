import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../cores/models';
import { AuthService } from '../../../cores/services/auth.service';
import { SupabaseService } from '../../../cores/services/supabase.service';

interface InventorySummary {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface SalesSummary {
  daily: number;
  weekly: number;
  monthly: number;
  yearToDate: number;
  previousMonth: number;
  percentChange: number;
}

interface PopularProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  stock: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  date: Date;
  items: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

interface LowStockAlert {
  id: string;
  name: string;
  currentStock: number;
  minRequired: number;
  packageSize: string;
  critical: boolean;
}

interface ComplianceItem {
  id: string;
  type: string;
  status: 'valid' | 'expiring' | 'expired';
  expiryDate: Date;
  authority: string;
}

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-dashboard.component.html',
  styleUrls: ['./company-dashboard.component.scss']
})
export class CompanyDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentUser: User | null = null;
  companyName = '';
  
  // Make Math available in template
  Math = Math;
  
  // Dashboard data
  inventorySummary: InventorySummary = {
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  };

  salesSummary: SalesSummary = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearToDate: 0,
    previousMonth: 0,
    percentChange: 0
  };

  popularProducts: PopularProduct[] = [];
  recentOrders: RecentOrder[] = [];
  lowStockAlerts: LowStockAlert[] = [];
  complianceItems: ComplianceItem[] = [];
  
  // Chart data
  monthlySalesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };

  categoryDistribution = {
    labels: ['Engine Oil', 'Gear Oil', 'Hydraulic Oil', 'Grease', 'Other'],
    values: [0, 0, 0, 0, 0]
  };

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadCompanyData();
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
        
        // Redirect if not company role
        if (user && user.role !== 'company') {
          // Handle non-company user (redirect will be handled by guard)
        } else if (user) {
          this.companyName = user.full_name || 'Your Company';
          this.loadCompanyData();
        }
      });
  }

  private async loadCompanyData(): Promise<void> {
    if (!this.currentUser) return;
    
    try {
      await Promise.all([
        this.loadInventorySummary(),
        this.loadSalesSummary(),
        this.loadPopularProducts(),
        this.loadRecentOrders(),
        this.loadLowStockAlerts(),
        this.loadComplianceItems()
      ]);
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  }

  private async loadInventorySummary(): Promise<void> {
    try {
      // Get company products
      const { data: products, error: productsError } = await this.supabaseService.getSupabase()
        .from('products')
        .select(`
          id,
          packages (
            id,
            size,
            stock_level
          )
        `)
        .eq('company_id', this.currentUser?.company_id);
      
      if (!productsError && products) {
        this.inventorySummary.totalProducts = products.length;
        
        let totalStock = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        
        products.forEach(product => {
          product.packages.forEach((pkg: any) => {
            totalStock += pkg.stock_level;
            if (pkg.stock_level === 0) {
              outOfStockCount++;
            } else if (pkg.stock_level < 10) {
              lowStockCount++;
            }
          });
        });
        
        this.inventorySummary.totalStock = totalStock;
        this.inventorySummary.lowStockCount = lowStockCount;
        this.inventorySummary.outOfStockCount = outOfStockCount;
      } else {
        // Mock data for development
        this.inventorySummary = {
          totalProducts: 48,
          totalStock: 1250,
          lowStockCount: 8,
          outOfStockCount: 3
        };
      }
    } catch (error) {
      console.error('Error loading inventory summary:', error);
    }
  }

  private async loadSalesSummary(): Promise<void> {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfPrevMonth = new Date(firstDayOfMonth.getTime() - 1);
      const firstDayOfPrevMonth = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1);
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
      
      // Format dates for Supabase queries
      const todayStr = today.toISOString().split('T')[0];
      const weekAgoStr = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
      const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
      const firstDayOfPrevMonthStr = firstDayOfPrevMonth.toISOString().split('T')[0];
      const lastDayOfPrevMonthStr = lastDayOfPrevMonth.toISOString().split('T')[0];
      const firstDayOfYearStr = firstDayOfYear.toISOString().split('T')[0];
      
      // Get daily sales
      const { data: dailySales, error: dailyError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select('total_amount')
        .eq('company_id', this.currentUser?.company_id)
        .gte('created_at', todayStr);
      
      // Get weekly sales
      const { data: weeklySales, error: weeklyError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select('total_amount')
        .eq('company_id', this.currentUser?.company_id)
        .gte('created_at', weekAgoStr);
      
      // Get monthly sales
      const { data: monthlySales, error: monthlyError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select('total_amount')
        .eq('company_id', this.currentUser?.company_id)
        .gte('created_at', firstDayOfMonthStr);
      
      // Get year-to-date sales
      const { data: yearSales, error: yearError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select('total_amount')
        .eq('company_id', this.currentUser?.company_id)
        .gte('created_at', firstDayOfYearStr);
      
      // Get previous month sales
      const { data: prevMonthSales, error: prevMonthError } = await this.supabaseService.getSupabase()
        .from('orders')
        .select('total_amount')
        .eq('company_id', this.currentUser?.company_id)
        .gte('created_at', firstDayOfPrevMonthStr)
        .lte('created_at', lastDayOfPrevMonthStr);
      
      // Calculate totals and percent change
      if (!dailyError && !weeklyError && !monthlyError && !yearError && !prevMonthError) {
        const dailyTotal = dailySales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const weeklyTotal = weeklySales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const monthlyTotal = monthlySales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const yearTotal = yearSales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const prevMonthTotal = prevMonthSales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        
        // Calculate percent change
        let percentChange = 0;
        if (prevMonthTotal > 0) {
          percentChange = ((monthlyTotal - prevMonthTotal) / prevMonthTotal) * 100;
        }
        
        this.salesSummary = {
          daily: dailyTotal,
          weekly: weeklyTotal,
          monthly: monthlyTotal,
          yearToDate: yearTotal,
          previousMonth: prevMonthTotal,
          percentChange: percentChange
        };
        
        // Load chart data
        await this.loadMonthlySalesChart();
      } else {
        // Mock data for development
        this.salesSummary = {
          daily: 18500,
          weekly: 124000,
          monthly: 520000,
          yearToDate: 6250000,
          previousMonth: 485000,
          percentChange: 7.2
        };
        
        // Mock chart data
        this.monthlySalesData.values = [
          430000, 520000, 410000, 480000, 530000, 620000, 
          580000, 520000, 640000, 590000, 540000, 520000
        ];
        
        this.categoryDistribution.values = [45, 25, 15, 10, 5];
      }
    } catch (error) {
      console.error('Error loading sales summary:', error);
    }
  }

  private async loadMonthlySalesChart(): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      const monthlySales = Array(12).fill(0);
      
      for (let month = 0; month < 12; month++) {
        const firstDayOfMonth = new Date(currentYear, month, 1);
        const lastDayOfMonth = new Date(currentYear, month + 1, 0);
        
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];
        
        const { data, error } = await this.supabaseService.getSupabase()
          .from('orders')
          .select('total_amount')
          .eq('company_id', this.currentUser?.company_id)
          .gte('created_at', firstDayStr)
          .lte('created_at', lastDayStr);
        
        if (!error && data) {
          monthlySales[month] = data.reduce((sum, order) => sum + order.total_amount, 0);
        }
      }
      
      this.monthlySalesData.values = monthlySales;
      
      // Load category distribution
      await this.loadCategoryDistribution();
    } catch (error) {
      console.error('Error loading monthly sales chart:', error);
    }
  }

  private async loadCategoryDistribution(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('products')
        .select('category')
        .eq('company_id', this.currentUser?.company_id);
      
      if (!error && data) {
        const categories = {
          'engine_oil': 0,
          'gear_oil': 0,
          'hydraulic_oil': 0,
          'grease': 0,
          'other': 0
        };
        
        data.forEach(product => {
          if (categories.hasOwnProperty(product.category)) {
            categories[product.category as keyof typeof categories]++;
          } else {
            categories.other++;
          }
        });
        
        const total = Object.values(categories).reduce((sum: number, val: number) => sum + val, 0);
        if (total > 0) {
          this.categoryDistribution.values = [
            (categories.engine_oil / total) * 100,
            (categories.gear_oil / total) * 100,
            (categories.hydraulic_oil / total) * 100,
            (categories.grease / total) * 100,
            (categories.other / total) * 100
          ];
        }
      }
    } catch (error) {
      console.error('Error loading category distribution:', error);
    }
  }

  private async loadPopularProducts(): Promise<void> {
    try {
      // This would typically join products with order items to calculate popularity
      const { data, error } = await this.supabaseService.getSupabase()
        .from('products')
        .select(`
          id,
          name,
          category,
          order_items (
            quantity,
            price
          ),
          packages (
            stock_level
          )
        `)
        .eq('company_id', this.currentUser?.company_id)
        .order('name');
      
      if (!error && data) {
        this.popularProducts = data.map(product => {
          const sales = product.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          const revenue = product.order_items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
          const stock = product.packages?.reduce((sum, pkg) => sum + pkg.stock_level, 0) || 0;
          
          return {
            id: product.id,
            name: product.name,
            category: product.category,
            sales: sales,
            stock: stock,
            revenue: revenue
          };
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      } else {
        // Mock data for development
        this.popularProducts = [
          { id: '1', name: 'MaxPro Engine Oil 5W-30', category: 'engine_oil', sales: 1250, stock: 48, revenue: 125000 },
          { id: '2', name: 'GearShield 80W-90', category: 'gear_oil', sales: 980, stock: 52, revenue: 98000 },
          { id: '3', name: 'HydroFlow Premium', category: 'hydraulic_oil', sales: 840, stock: 35, revenue: 84000 },
          { id: '4', name: 'MaxPro Diesel Engine Oil 15W-40', category: 'engine_oil', sales: 760, stock: 42, revenue: 76000 },
          { id: '5', name: 'HeavyDuty Grease', category: 'grease', sales: 620, stock: 28, revenue: 62000 }
        ];
      }
    } catch (error) {
      console.error('Error loading popular products:', error);
    }
  }

  private async loadRecentOrders(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('orders')
        .select(`
          id,
          user_profiles (
            full_name,
            email
          ),
          created_at,
          total_amount,
          status,
          order_items (
            id
          )
        `)
        .eq('company_id', this.currentUser?.company_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && data) {
        this.recentOrders = data.map(order => ({
          id: order.id,
          customer: order.user_profiles ? (
              Array.isArray(order.user_profiles) 
                ? (order.user_profiles[0]?.full_name || order.user_profiles[0]?.email || 'Unknown Customer')
                : ((order.user_profiles as any).full_name || (order.user_profiles as any).email || 'Unknown Customer')
            ) : 'Unknown Customer',
          date: new Date(order.created_at),
          items: order.order_items?.length || 0,
          total: order.total_amount,
          status: order.status
        }));
      } else {
        // Mock data for development
        this.recentOrders = [
          { id: 'ORD-001', customer: 'John Smith', date: new Date(Date.now() - 3600000), items: 3, total: 12500, status: 'pending' },
          { id: 'ORD-002', customer: 'Alice Johnson', date: new Date(Date.now() - 86400000), items: 2, total: 8200, status: 'processing' },
          { id: 'ORD-003', customer: 'Robert Brown', date: new Date(Date.now() - 172800000), items: 5, total: 24600, status: 'shipped' },
          { id: 'ORD-004', customer: 'Jane Davis', date: new Date(Date.now() - 259200000), items: 1, total: 4800, status: 'delivered' },
          { id: 'ORD-005', customer: 'Michael Wilson', date: new Date(Date.now() - 345600000), items: 4, total: 18500, status: 'delivered' }
        ];
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  }

  private async loadLowStockAlerts(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('products')
        .select(`
          id,
          name,
          packages (
            id,
            size,
            stock_level,
            min_stock_level
          )
        `)
        .eq('company_id', this.currentUser?.company_id);
      
      if (!error && data) {
        const lowStockItems: LowStockAlert[] = [];
        
        data.forEach(product => {
          product.packages.forEach((pkg: any) => {
            if (pkg.stock_level < pkg.min_stock_level) {
              lowStockItems.push({
                id: product.id,
                name: product.name,
                currentStock: pkg.stock_level,
                minRequired: pkg.min_stock_level,
                packageSize: pkg.size,
                critical: pkg.stock_level < (pkg.min_stock_level / 2)
              });
            }
          });
        });
        
        this.lowStockAlerts = lowStockItems.sort((a, b) => {
          // Sort by critical first, then by stock level (ascending)
          if (a.critical !== b.critical) {
            return a.critical ? -1 : 1;
          }
          return a.currentStock - b.currentStock;
        });
      } else {
        // Mock data for development
        this.lowStockAlerts = [
          { id: '1', name: 'MaxPro Engine Oil 5W-30', currentStock: 2, minRequired: 10, packageSize: '5L', critical: true },
          { id: '2', name: 'HydroFlow Premium', currentStock: 3, minRequired: 15, packageSize: '20L', critical: true },
          { id: '3', name: 'GearShield 80W-90', currentStock: 8, minRequired: 15, packageSize: '1L', critical: false },
          { id: '4', name: 'HeavyDuty Grease', currentStock: 5, minRequired: 8, packageSize: '500g', critical: false }
        ];
      }
    } catch (error) {
      console.error('Error loading low stock alerts:', error);
    }
  }

  private async loadComplianceItems(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('compliance_certificates')
        .select('*')
        .eq('company_id', this.currentUser?.company_id)
        .order('expiry_date');
      
      if (!error && data) {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        this.complianceItems = data.map(cert => {
          const expiryDate = new Date(cert.expiry_date);
          let status: 'valid' | 'expiring' | 'expired';
          
          if (expiryDate < today) {
            status = 'expired';
          } else if (expiryDate < thirtyDaysFromNow) {
            status = 'expiring';
          } else {
            status = 'valid';
          }
          
          return {
            id: cert.id,
            type: cert.certificate_type,
            status: status,
            expiryDate: expiryDate,
            authority: cert.issuing_authority
          };
        });
      } else {
        // Mock data for development
        const today = new Date();
        const expired = new Date(today);
        expired.setDate(today.getDate() - 10);
        
        const expiring = new Date(today);
        expiring.setDate(today.getDate() + 20);
        
        const valid = new Date(today);
        valid.setMonth(today.getMonth() + 6);
        
        this.complianceItems = [
          { id: '1', type: 'KEBS Certification', status: 'valid', expiryDate: valid, authority: 'Kenya Bureau of Standards' },
          { id: '2', type: 'ISO 9001', status: 'expiring', expiryDate: expiring, authority: 'International Organization for Standardization' },
          { id: '3', type: 'EPRA License', status: 'expired', expiryDate: expired, authority: 'Energy and Petroleum Regulatory Authority' }
        ];
      }
    } catch (error) {
      console.error('Error loading compliance items:', error);
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

  formatDateTime(date: Date): string {
    return date.toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expiring': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPercentChangeClass(value: number): string {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  }

  getPercentChangeIcon(value: number): string {
    return value >= 0 ? 'trending-up' : 'trending-down';
  }
}