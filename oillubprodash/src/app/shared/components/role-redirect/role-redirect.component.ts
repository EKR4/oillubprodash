import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../cores/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-role-redirect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-redirect.component.html',
  styleUrls: ['./role-redirect.component.scss']
})
export class RoleRedirectComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  
  message = 'Redirecting...';

  ngOnInit() {
    // First check if this is an auth callback
    const fragment = this.route.snapshot.fragment;
    if (fragment) {
      this.handleAuthCallback(fragment);
    } else {
      this.handleRoleRedirect();
    }
  }

  private async handleAuthCallback(fragment: string) {
    try {
      this.message = 'Verifying authentication...';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (!accessToken) {
        throw new Error('No access token found');
      }

      // Set the session in Supabase
      const { data, error } = await this.authService.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });

      if (error) throw error;

      // Clear the URL fragment
      this.router.navigate([], {
        relativeTo: this.route,
        replaceUrl: true
      });

      if (data?.user) {
        this.message = 'Authentication successful, redirecting...';
        await this.handleRoleRedirect();
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      this.message = 'Authentication failed. Redirecting to login...';
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    }
  }

  private async handleRoleRedirect() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const redirectMap: { [key: string]: string } = {
        admin: '/admin/dashboard',
        company: '/company/dashboard',
        customer: '/customer/dashboard'
      };

      const redirectPath = redirectMap[currentUser.role] || '/customer/dashboard';
      
      // Small delay to ensure smooth transition
      setTimeout(() => {
        this.router.navigate([redirectPath], { replaceUrl: true });
      }, 500);
    } catch (error) {
      console.error('Role redirect error:', error);
      this.message = 'Session expired. Redirecting to login...';
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    }
  }
}