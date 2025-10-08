import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../../../cores/models/user';
import { SupabaseService } from '../../../../cores/services/supabase.service';

// Define UserRole enum for consistency with user-form component
enum UserRole {
  ADMIN = 'admin',
  COMPANY = 'company',
  CUSTOMER = 'customer'
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit, OnDestroy {
  userId: string | null = null;
  user: any = null;
  isLoading = true;
  errorMessage: string | null = null;
  activityLogs: any[] = [];
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    
    if (!this.userId) {
      this.errorMessage = 'User ID not provided';
      this.isLoading = false;
      return;
    }
    
    this.loadUserData();
    this.loadUserActivityLogs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadUserData(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Mock implementation since supabaseService.getUser is missing
      // In a real application, this would call the actual service method
      // const { data: user, error } = await this.supabaseService.getUser(this.userId);
      
      // Mock data for demonstration
      const mockResponse = {
        data: {
          id: this.userId,
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1234567890',
          role: UserRole.CUSTOMER,
          is_active: true,
          company_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          profile_image_url: null
        },
        error: null
      };
      
      const { data: user, error } = mockResponse;
      
      if (error) {
        throw error;
      }
      
      this.user = user;
      
    } catch (error: any) {
      this.errorMessage = `Error loading user: ${error.message || 'Unknown error'}`;
      console.error('Error loading user:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadUserActivityLogs(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Mock implementation
      // In a real application, this would call an actual service method
      // const { data, error } = await this.supabaseService.getUserActivityLogs(this.userId);
      
      // Mock data for demonstration
      const mockLogs = [
        {
          id: '1',
          user_id: this.userId,
          action: 'login',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        {
          id: '2',
          user_id: this.userId,
          action: 'profile_update',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        {
          id: '3',
          user_id: this.userId,
          action: 'password_change',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      ];
      
      this.activityLogs = mockLogs;
      
    } catch (error: any) {
      console.error('Error loading user activity logs:', error);
    }
  }

  async toggleUserStatus(): Promise<void> {
    if (!this.user) return;
    
    try {
      this.isLoading = true;
      
      // Mock implementation
      // In a real application, this would call an actual service method
      // const { error } = await this.supabaseService.updateUser(this.userId, { is_active: !this.user.is_active });
      
      // Mock response
      const mockResponse = { error: null };
      const { error } = mockResponse;
      
      if (error) {
        throw error;
      }
      
      // Update local state
      this.user.is_active = !this.user.is_active;
      
    } catch (error: any) {
      this.errorMessage = `Error updating user status: ${error.message || 'Unknown error'}`;
      console.error('Error updating user status:', error);
    } finally {
      this.isLoading = false;
    }
  }

  editUser(): void {
    this.router.navigate(['/admin/users/edit', this.userId]);
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  // Helper methods
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPhoneNumber(phone: string): string {
    if (!phone) return 'N/A';
    
    // Simple formatting for display
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case UserRole.COMPANY:
        return 'bg-blue-100 text-blue-800';
      case UserRole.CUSTOMER:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }
  
  getActivityIcon(action: string): string {
    switch (action) {
      case 'login':
        return 'login';
      case 'logout':
        return 'logout';
      case 'profile_update':
        return 'edit';
      case 'password_change':
        return 'key';
      default:
        return 'activity';
    }
  }
}