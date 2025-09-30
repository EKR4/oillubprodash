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
    loadChildren: () => import('./modules/admin/routes').then(m => m.ADMIN_ROUTES),
    canActivate: [authGuard],
    data: { role: 'admin' }
  },

  // Redirect empty path to home
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },

  // Wildcard route for 404
  {
    path: '**',
    redirectTo: '/home'
  }
];