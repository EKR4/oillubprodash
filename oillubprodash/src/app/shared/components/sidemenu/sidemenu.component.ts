import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../cores/services/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-sidemenu',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidemenu.component.html',
  styleUrl: './sidemenu.component.scss'
})
export class SidemenuComponent implements OnInit {
  isOpen = true;
  userRole$: Observable<string | null>;
  menuItems: MenuItem[] = [
    // Admin Menu Items
    { label: 'Dashboard', icon: 'chart-bar', route: '/admin/dashboard', roles: ['admin'] },
    { label: 'Users', icon: 'users', route: '/admin/users', roles: ['admin'] },
    { label: 'Companies', icon: 'office-building', route: '/admin/companies', roles: ['admin'] },
    { label: 'Products', icon: 'cube', route: '/admin/products', roles: ['admin'] },
    { label: 'Orders', icon: 'shopping-cart', route: '/admin/orders', roles: ['admin'] },
    { label: 'System', icon: 'cog', route: '/admin/system', roles: ['admin'] },

    // Company Menu Items
    { label: 'Dashboard', icon: 'chart-bar', route: '/company/dashboard', roles: ['company'] },
    { label: 'Products', icon: 'cube', route: '/company/products', roles: ['company'] },
    { label: 'Orders', icon: 'shopping-cart', route: '/company/orders', roles: ['company'] },
    { label: 'Customers', icon: 'users', route: '/company/customers', roles: ['company'] },
    { label: 'Reports', icon: 'document-report', route: '/company/reports', roles: ['company'] },
    { label: 'Settings', icon: 'cog', route: '/company/settings', roles: ['company'] },

    // Customer Menu Items
    { label: 'Dashboard', icon: 'chart-bar', route: '/customer/dashboard', roles: ['customer'] },
    { label: 'My Orders', icon: 'shopping-cart', route: '/customer/orders', roles: ['customer'] },
    { label: 'Products', icon: 'cube', route: '/customer/products', roles: ['customer'] },
    { label: 'Profile', icon: 'user', route: '/customer/profile', roles: ['customer'] }
  ];

  constructor(private authService: AuthService) {
    this.userRole$ = this.authService.currentUser$.pipe(
      map(user => user?.role || null)
    );
  }

  ngOnInit() {}

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  getMenuItems(role: string | null): MenuItem[] {
    if (!role) return [];
    return this.menuItems.filter(item => item.roles.includes(role));
  }
}
