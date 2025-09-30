import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data['role'] as UserRole | UserRole[];

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // Check if user is authenticated
      if (!user) {
        router.navigateByUrl('/auth/login');
        return false;
      }

      // If no specific role is required, allow access
      if (!requiredRole) {
        return true;
      }

      // Check if user has required role
      const hasRole = Array.isArray(requiredRole)
        ? requiredRole.includes(user.role)
        : user.role === requiredRole;

      if (!hasRole) {
        // Redirect to appropriate dashboard based on user's role
        switch (user.role) {
          case 'admin':
            router.navigateByUrl('/admin/dashboard');
            break;
          case 'company':
            router.navigateByUrl('/company/dashboard');
            break;
          case 'customer':
            router.navigateByUrl('/customer/dashboard');
            break;
          default:
            router.navigateByUrl('/');
            break;
        }
        return false;
      }

      return true;
    })
  );
};