import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-redirect',
  standalone: true,
  template: '<div>Redirecting...</div>'
})
export class RoleRedirectComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    const role = localStorage.getItem('userRole') || 'customer';
    const redirectMap: { [key: string]: string } = {
      admin: '/admin/dashboard',
      company: '/company/dashboard',
      customer: '/customer/dashboard'
    };

    const redirectPath = redirectMap[role] || '/customer/dashboard';
    this.router.navigate([redirectPath]);
  }
}