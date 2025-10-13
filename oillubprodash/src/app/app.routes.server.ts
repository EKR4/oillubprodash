import { RenderMode, type ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public routes - Client-side rendered
  {
    path: '',
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'public, max-age=60'
    }
  },
  {
    path: 'home',
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'public, max-age=60'
    }
  },

  // Static pages - Prerendered
  {
    path: 'about',
    renderMode: RenderMode.Prerender,
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  },
  {
    path: 'faq',
    renderMode: RenderMode.Prerender,
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  },
  {
    path: 'contact',
    renderMode: RenderMode.Prerender,
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  },

  // Authentication routes - Server-side rendered
  {
    path: 'auth/login',
    renderMode: RenderMode.Server,
    headers: {
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY'
    }
  },
  {
    path: 'auth/register',
    renderMode: RenderMode.Server,
    headers: {
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY'
    }
  },

  // Protected routes - Server-side rendered
  {
    path: 'admin',
    renderMode: RenderMode.Server,
    headers: {
      'Cache-Control': 'private, no-cache',
      'X-Frame-Options': 'DENY'
    }
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Server,
    headers: {
      'Cache-Control': 'private, no-cache',
      'X-Frame-Options': 'SAMEORIGIN'
    }
  },

  // Product routes - Hybrid rendering
  {
    path: 'products',
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'public, max-age=300'
    }
  },
  {
    path: 'products/category/:category',
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'public, max-age=300'
    }
  },
  {
    path: 'products/:id',
    renderMode: RenderMode.Server,
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=30'
    }
  },
  // Legacy routes redirects
  {
    path: 'product-catalog',
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'no-store'
    }
  },
  {
    path: 'product-detail/:id',
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'no-store'
    }
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
    headers: {
      'Cache-Control': 'no-store'
    }
  }
];