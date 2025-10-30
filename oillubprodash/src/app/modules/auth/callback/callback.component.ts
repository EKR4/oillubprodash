import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../cores/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertBadgeComponent } from '../../../shared/components/alert-badge/alert-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { UserRole } from '../../../cores/models/user';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterModule, AlertBadgeComponent, LoadingSpinnerComponent],
  templateUrl: './callback.component.html',
  styleUrls: ['./callback.component.scss']
})
export class AuthCallbackComponent implements OnInit {
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get the access token from the URL hash
    const hash = window.location.hash;
    if (!hash) {
      this.error = 'No authentication data found';
      this.loading = false;
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');

    if (!accessToken) {
      this.error = 'No access token found';
      this.loading = false;
      return;
    }

    // Handle the callback with error handling and redirect
    this.authService.handleCallback(accessToken)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ user, error }) => {
          if (error) {
            this.error = error.message;
            this.loading = false;
            return;
          }

          if (user) {
            this.redirectToDashboard(user.role);
          } else {
            this.error = 'User not found';
            this.loading = false;
          }
        },
        error: (error) => {
          this.error = error.message || 'An error occurred during authentication';
          this.loading = false;
        }
      });
  }

  private redirectToDashboard(role: UserRole) {
    this.authService.navigateAfterAuth(role);
  }
}