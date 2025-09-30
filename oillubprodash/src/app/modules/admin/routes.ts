import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { authGuard } from '../../cores/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { role: 'admin' },
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        title: 'Admin Dashboard'
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