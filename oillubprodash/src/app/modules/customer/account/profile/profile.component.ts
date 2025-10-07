import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../../../cores/services/auth.service';

interface ExtendedUser extends User {
  preferences?: {
    emailNotifications: boolean;
    marketing: boolean;
  };
}

interface UserStats {
  totalOrders: number;
  loyaltyPoints: number;
  supportTickets: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: ExtendedUser | null = null;
  stats: UserStats = {
    totalOrders: 0,
    loyaltyPoints: 0,
    supportTickets: 0
  };

  isLoading = false;
  error: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private async loadUserData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const authUser = await this.authService.getCurrentUser();
      if (authUser) {
        this.user = {
          ...authUser,
          preferences: {
            emailNotifications: true,
            marketing: false
          }
        };
        await this.loadUserStats(authUser.id);
      }
    } catch (error) {
      this.error = error instanceof Error ? 
        error.message : 
        'Error loading profile data';
      console.error('Error loading user profile:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadUserStats(userId: string): Promise<void> {
    try {
      // TODO: Replace with actual service call when implemented
      this.stats = {
        totalOrders: 12,
        loyaltyPoints: 450,
        supportTickets: 2
      };
    } catch (error) {
      console.error('Error loading user stats:', error);
      this.error = 'Error loading user statistics';
    }
  }
}
