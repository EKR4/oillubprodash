import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'company' | 'customer';
  company?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: Date;
  last_login?: Date;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  
  // Filter options
  searchQuery: string = '';
  roleFilter: string = 'all';
  statusFilter: string = 'all';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  
  // Sorting
  sortField: string = 'created_at';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // State
  loading: boolean = true;
  error: string | null = null;
  
  private subscriptions = new Subscription();

  constructor() {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUsers(): void {
    // In a real implementation, this would call a service to fetch users from the API
    // For now, we'll use mock data
    setTimeout(() => {
      this.users = [
        {
          id: 'usr1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'admin',
          status: 'active',
          created_at: new Date('2023-01-15'),
          last_login: new Date('2023-05-10')
        },
        {
          id: 'usr2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          role: 'company',
          company: 'ABC Motors',
          status: 'active',
          created_at: new Date('2023-02-20'),
          last_login: new Date('2023-05-09')
        },
        {
          id: 'usr3',
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          role: 'customer',
          status: 'active',
          created_at: new Date('2023-03-05'),
          last_login: new Date('2023-05-01')
        },
        {
          id: 'usr4',
          name: 'Alice Williams',
          email: 'alice.williams@example.com',
          role: 'company',
          company: 'XYZ Mechanics',
          status: 'inactive',
          created_at: new Date('2023-01-10'),
          last_login: new Date('2023-04-15')
        },
        {
          id: 'usr5',
          name: 'Charlie Brown',
          email: 'charlie.brown@example.com',
          role: 'customer',
          status: 'pending',
          created_at: new Date('2023-05-01')
        }
      ];
      
      this.totalItems = this.users.length;
      this.applyFilters();
      this.loading = false;
    }, 1000);
  }

  applyFilters(): void {
    // Start with all users
    let filtered = [...this.users];
    
    // Apply search query filter (case-insensitive)
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query) ||
        (user.company && user.company.toLowerCase().includes(query))
      );
    }
    
    // Apply role filter
    if (this.roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }
    
    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === this.statusFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          comparison = (a.created_at.getTime() - b.created_at.getTime());
          break;
        case 'last_login':
          // Handle null/undefined last_login
          if (!a.last_login && !b.last_login) comparison = 0;
          else if (!a.last_login) comparison = 1;
          else if (!b.last_login) comparison = -1;
          else comparison = (a.last_login.getTime() - b.last_login.getTime());
          break;
        default:
          comparison = 0;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.filteredUsers = filtered.slice(startIndex, startIndex + this.itemsPerPage);
    
    // Update total items
    this.totalItems = filtered.length;
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.applyFilters();
  }

  onRoleFilterChange(role: string): void {
    this.roleFilter = role;
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange(field: string): void {
    if (this.sortField === field) {
      // Toggle sort direction if clicking the same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  formatDate(date?: Date): string {
    if (!date) return 'Never';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getUserRoleClass(role: string): string {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'company': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getUserStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}