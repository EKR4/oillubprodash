import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../enviroments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Only add auth headers for Supabase API calls
  let authReq = req;
  if (req.url.includes(environment.supabase.url)) {
    const token = authService.getAccessToken();
    if (token) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle authentication errors (token expired or invalid)
      if (error.status === 401) {
        authService.logout().subscribe({
          next: (result) => {
            if (result.success) {
              router.navigateByUrl('/auth/login');
            }
          },
          error: (err) => {
            console.error('Error during logout:', err);
            router.navigateByUrl('/auth/login'); // Redirect anyway to prevent being stuck
          }
        });
      }
      return throwError(() => error);
    })
  );
};

// Add to app.config.ts:
// providers: [
//   provideHttpClient(
//     withInterceptors([authInterceptor])
//   )
// ]