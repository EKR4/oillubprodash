import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../cores/services/auth.service';
import { User } from '../../../cores/models/user';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-6">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p class="mt-2 text-sm text-gray-600">Welcome back, {{ currentUser?.full_name || 'Admin' }}</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Users Management Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Users Management</h2>
          <p class="text-gray-600 mb-4">Manage user accounts, roles, and permissions</p>
          <button routerLink="/admin/users" class="text-primary hover:text-primary-dark font-medium">
            Manage Users →
          </button>
        </div>

        <!-- Products Management Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Products Management</h2>
          <p class="text-gray-600 mb-4">Manage products, categories, and inventory</p>
          <button routerLink="/admin/products" class="text-primary hover:text-primary-dark font-medium">
            Manage Products →
          </button>
        </div>

        <!-- Orders Management Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Orders Management</h2>
          <p class="text-gray-600 mb-4">View and manage customer orders</p>
          <button routerLink="/admin/orders" class="text-primary hover:text-primary-dark font-medium">
            Manage Orders →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #f9fafb;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}