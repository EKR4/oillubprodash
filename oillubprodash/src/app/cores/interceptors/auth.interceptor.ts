import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Clone the request and add auth header if user is logged in
  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${authService.getAccessToken()}`)
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid
        authService.logout().subscribe(() => {
          router.navigateByUrl('/auth/login');
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