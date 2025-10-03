import { Routes } from '@angular/router';
import { authGuard } from './cores/guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadChildren: () => import('./pages/routes').then(m => m.PUBLIC_ROUTES),
    pathMatch: 'prefix'
  },
  
  // Auth routes
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/routes').then(m => m.AUTH_ROUTES)
  },

  // Admin routes (protected)
  {
    path: 'admin',
    loadChildren: () => import('./modules/admin/routes').then(m => m.ADMIN_ROUTES),
    canActivate: [authGuard],
    data: { role: 'admin' }
  },

  // Profile route
  {
    path: 'profile',
    loadChildren: () => import('./modules/customer/account/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },

  // Product routes
  {
    path: 'product-catalog',
    loadChildren: () => import('./pages/product-catalog/product-catalog.component').then(m => m.ProductCatalogComponent)
  },
  {
    path: 'product-detail/:id',
    loadChildren: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },

  // Static pages
  {
    path: 'about',
    loadChildren: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'contact',
    loadChildren: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'faq',
    loadChildren: () => import('./pages/faq/faq.component').then(m => m.FaqComponent)
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
    loadChildren: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];