import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from './cores/services/auth.service';
import { Observable, Subject, takeUntil, map } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  currentYear: number = new Date().getFullYear();
  title = 'OilLubProDash';
  mobileMenuOpen = false;
  userMenuOpen = false;
  
  isAuthenticated$: Observable<boolean>;
  currentUser$: Observable<User | null>;
  userRole$: Observable<string | null>;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated();
    this.currentUser$ = this.authService.currentUser$;
    this.userRole$ = this.authService.currentUser$.pipe(
      map((user: User | null) => user?.role || null)
    );
  }

  ngOnInit() {
    // Handle authentication state changes
    this.authService.isAuthenticated().pipe(
      takeUntil(this.destroy$)
    ).subscribe(isAuthenticated => {
      if (isAuthenticated) {
        // Redirect to appropriate dashboard based on user role
        const role = this.authService.getCurrentUser()?.role || 'customer';
        switch (role) {
          case 'admin':
            this.router.navigate(['/admin/dashboard']);
            break;
          case 'company':
            this.router.navigate(['/company/dashboard']);
            break;
          case 'customer':
            this.router.navigate(['/customer/dashboard']);
            break;
          default:
            this.router.navigate(['/']);
        }
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  async logout() {
    try {
      const result = await this.authService.logout().toPromise();
      if (result?.success) {
        this.userMenuOpen = false;
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
}