import { Routes } from '@angular/router';
import { authGuard } from '../../cores/guards/auth.guard';

export const COMPANY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { role: 'company' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/company-dashboard.component').then(m => m.CompanyDashboardComponent)
      },
      // Orders section
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () => import('./orders/orders-list/orders-list.component').then(m => m.OrdersListComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
          }
        ]
      },
      // Products section
      {
        path: 'products',
        children: [
          {
            path: '',
            loadComponent: () => import('./products/products-list/products-list.component').then(m => m.ProductsListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./products/product-form/product-form.component').then(m => m.ProductFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./products/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./products/product-form/product-form.component').then(m => m.ProductFormComponent)
          }
        ]
      },
      // Inventory section
      {
        path: 'inventory',
        children: [
          {
            path: '',
            loadComponent: () => import('./inventory/inventory-list/inventory-list.component').then(m => m.InventoryListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./inventory/inventory-form/inventory-form.component').then(m => m.InventoryFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./inventory/inventory-detail/inventory-detail.component').then(m => m.InventoryDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./inventory/inventory-form/inventory-form.component').then(m => m.InventoryFormComponent)
          }
        ]
      },
      // Customers section
      {
        path: 'customers',
        children: [
          {
            path: '',
            loadComponent: () => import('./customers/customers-list/customers-list.component').then(m => m.CustomersListComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./customers/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent)
          }
        ]
      },
      // Reports section
      {
        path: 'reports',
        children: [
          {
            path: '',
            loadComponent: () => import('./reports/reports-dashboard/reports-dashboard.component').then(m => m.ReportsDashboardComponent)
          },
          {
            path: 'sales',
            loadComponent: () => import('./reports/sales-reports/sales-reports.component').then(m => m.SalesReportsComponent)
          },
          {
            path: 'inventory',
            loadComponent: () => import('./reports/inventory-reports/inventory-reports.component').then(m => m.InventoryReportsComponent)
          },
          {
            path: 'customers',
            loadComponent: () => import('./reports/customer-reports/customer-reports.component').then(m => m.CustomerReportsComponent)
          }
        ]
      },
      // Other sections
      {
        path: 'compliance',
        loadComponent: () => import('./compliance/compliance.component').then(m => m.ComplianceComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then(m => m.CompanySettingsComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
