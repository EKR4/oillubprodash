import { Routes } from '@angular/router';
import { authGuard } from './cores/guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadChildren: () => import('./pages/routes').then(m => m.PUBLIC_ROUTES)
  },
  
  // Auth routes
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/routes').then(m => m.AUTH_ROUTES)
  },

  // Admin routes (protected)
  {
    path: 'admin',
    loadChildren: () => import('./modules/admin/routes').then(m => m.ADMIN_ROUTES)
  },

  // Company routes (protected)
  {
    path: 'company',
    loadChildren: () => import('./modules/company/routes').then(m => m.COMPANY_ROUTES)
  },

  // Customer routes (protected)
  {
    path: 'customer',
    loadChildren: () => import('./modules/customer/routes').then(m => m.CUSTOMER_ROUTES)
  },

  // Redirect authenticated users based on role
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        resolve: {
          role: () => localStorage.getItem('userRole') || 'customer'
        },
        loadComponent: () => import('./shared/components/role-redirect/role-redirect.component')
          .then(m => m.RoleRedirectComponent)
      }
    ]
  },

  // Home redirect
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },

  // Not found - with proper status code handling
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component')
      .then(m => m.NotFoundComponent)
  }
];