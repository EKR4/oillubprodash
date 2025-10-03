import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 class="text-6xl font-bold text-gray-800">404</h1>
      <p class="text-xl text-gray-600 mt-4">Page Not Found</p>
      <a routerLink="/" class="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Go Home
      </a>
    </div>
  `
})
export class NotFoundComponent {
  constructor() {
    // Status code will be handled by the server route configuration
  }
}