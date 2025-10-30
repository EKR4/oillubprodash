import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../../cores/services/auth.service';
import { User, UserRole } from '../../../cores/models/user';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  isLoading = true;
  isSuccess = false;
  error: string | null = null;
  token: string | null = null;
  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check for error hash parameter which could indicate verification failure
    const hash = window.location.hash;
    const errorParam = new URLSearchParams(hash.substring(1)).get('error_description');
    
    if (errorParam) {
      this.isLoading = false;
      this.error = decodeURIComponent(errorParam);
      return;
    }

    // Get token from URL parameters
    this.subscription.add(
      this.route.queryParams.subscribe(async params => {
        try {
          const token = params['token'] || null;
          
          if (!token) {
            this.isLoading = false;
            this.error = 'Invalid or missing verification token. Please check your email and use the link provided.';
            return;
          }

          // Wait for Supabase to handle the verification
          await this.authService.handleEmailVerification(token);
          
          // Show success state
          this.isLoading = false;
          this.isSuccess = true;
          
          // Check if user is logged in and redirect accordingly
          this.authService.currentUser$.pipe(take(1)).subscribe(user => {
            if (user) {
              this.redirectBasedOnRole(user.role);
            }
          });
        } catch (error) {
          this.isLoading = false;
          this.error = error instanceof Error ? error.message : 'An error occurred during verification';
        }
      })
    );
    
    // If user is already logged in, redirect to appropriate dashboard
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.redirectBasedOnRole(user.role);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'company':
        this.router.navigate(['/company/dashboard']);
        break;
      case 'customer':
      default:
        this.router.navigate(['/customer/dashboard']);
        break;
    }
  }
}