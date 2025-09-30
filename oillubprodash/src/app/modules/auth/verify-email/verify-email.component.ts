import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../cores/services/auth.service';

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
    // Get token from URL parameters
    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        this.token = params['token'] || null;
        
        if (!this.token) {
          this.isLoading = false;
          this.error = 'Invalid or missing verification token. Please check your email and use the link provided.';
          return;
        }
        
        // Verify email is handled automatically by Supabase when the user clicks the verification link
        // This component is mainly for displaying a success message and providing navigation options
        this.isLoading = false;
        this.isSuccess = true;
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