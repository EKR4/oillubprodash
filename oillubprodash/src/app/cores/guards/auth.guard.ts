import { inject } from '@angular/core';
import { Router, type CanActivateFn, UrlTree } from '@angular/router';
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
        // Return UrlTree instead of imperative navigation
        return router.createUrlTree(['/auth/login']);
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
        // Return appropriate UrlTree based on user's role
        let redirectUrl: string;
        
        switch (user.role) {
          case 'admin':
            redirectUrl = '/admin/dashboard';
            break;
          case 'company':
            redirectUrl = '/company/dashboard';
            break;
          case 'customer':
            redirectUrl = '/customer/dashboard';
            break;
          default:
            redirectUrl = '/';
            break;
        }
        
        return router.createUrlTree([redirectUrl]);
      }

      return true;
    })
  );
};