import { Routes } from '@angular/router';
import { authGuard } from '../../cores/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { role: 'admin' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        title: 'Admin Dashboard'
      },
      // Companies section
      {
        path: 'companies',
        children: [
          {
            path: '',
            loadComponent: () => import('./companies/companies-list/companies-list.component').then(m => m.CompaniesListComponent),
            title: 'Companies'
          },
          {
            path: 'new',
            loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent),
            title: 'New Company'
          },
          {
            path: ':id',
            loadComponent: () => import('./companies/company-detail/company-detail.component').then(m => m.CompanyDetailComponent),
            title: 'Company Details'
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent),
            title: 'Edit Company'
          }
        ]
      },
      // Orders section
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () => import('./orders/orders-list/orders-list.component').then(m => m.OrdersListComponent),
            title: 'Orders'
          },
          {
            path: ':id',
            loadComponent: () => import('./orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent),
            title: 'Order Details'
          }
        ]
      },
      // Products section
      {
        path: 'products',
        children: [
          {
            path: '',
            loadComponent: () => import('./products/products-list/products-list.component').then(m => m.ProductsListComponent),
            title: 'Products'
          },
          {
            path: 'new',
            loadComponent: () => import('./products/product-form/product-form.component').then(m => m.ProductFormComponent),
            title: 'New Product'
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./products/product-form/product-form.component').then(m => m.ProductFormComponent),
            title: 'Edit Product'
          }
        ]
      },
      // Users section
      {
        path: 'users',
        children: [
          {
            path: '',
            loadComponent: () => import('./users/users-list/users-list.component').then(m => m.UsersListComponent),
            title: 'Users'
          },
          {
            path: 'new',
            loadComponent: () => import('./users/user-form/user-form.component').then(m => m.UserFormComponent),
            title: 'New User'
          },
          {
            path: ':id',
            loadComponent: () => import('./users/user-detail/user-detail.component').then(m => m.UserDetailComponent),
            title: 'User Details'
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./users/user-form/user-form.component').then(m => m.UserFormComponent),
            title: 'Edit User'
          }
        ]
      },
      // System section
      {
        path: 'system',
        children: [
          {
            path: 'settings',
            loadComponent: () => import('./system/settings/settings.component').then(m => m.SettingsComponent),
            title: 'System Settings'
          },
          {
            path: 'logs',
            loadComponent: () => import('./system/logs/logs.component').then(m => m.LogsComponent),
            title: 'System Logs'
          },
          {
            path: 'backup',
            loadComponent: () => import('./system/backup/backup.component').then(m => m.BackupComponent),
            title: 'System Backup'
          }
        ]
      },
      // Redirect empty path to dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];