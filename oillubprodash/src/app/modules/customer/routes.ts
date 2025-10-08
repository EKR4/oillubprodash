import { Routes } from '@angular/router';
import { authGuard } from '../../cores/guards/auth.guard';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { role: 'customer' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/customer-dashboard.component').then(m => m.CustomerDashboardComponent)
      },
      // Orders section
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () => import('./orders/orders-list/orders-list.component').then(m => m.OrdersListComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
          },
          {
            path: ':id/tracking',
            loadComponent: () => import('./orders/order-tracking/order-tracking.component').then(m => m.OrderTrackingComponent)
          }
        ]
      },
      // Products section
      {
        path: 'products',
        children: [
          {
            path: '',
            loadComponent: () => import('./products/products-list/products-list.component').then(m => m.ProductsListComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./products/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
          }
        ]
      },
      // Support section
      {
        path: 'support',
        children: [
          {
            path: '',
            loadComponent: () => import('./support/support-home/support-home.component').then(m => m.SupportHomeComponent)
          },
          {
            path: 'tickets',
            children: [
              {
                path: '',
                loadComponent: () => import('./support/tickets/tickets.component').then(m => m.TicketsComponent)
              },
              {
                path: 'create',
                loadComponent: () => import('./support/create-ticket/create-ticket.component').then(m => m.CreateTicketComponent)
              },
              {
                path: ':id',
                loadComponent: () => import('./support/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent)
              }
            ]
          }
        ]
      },
      // Checkout section
      {
        path: 'checkout',
        children: [
          {
            path: '',
            loadComponent: () => import('./checkout/checkout.component').then(m => m.CheckoutComponent)
          },
          {
            path: 'shipping',
            loadComponent: () => import('./checkout/shipping/shipping.component').then(m => m.ShippingComponent)
          },
          {
            path: 'payment',
            loadComponent: () => import('./checkout/payment/payment.component').then(m => m.PaymentComponent)
          },
          {
            path: 'confirmation',
            loadComponent: () => import('./checkout/confirmation/confirmation.component').then(m => m.ConfirmationComponent)
          }
        ]
      },
      // Account section
      {
        path: 'account',
        children: [
          {
            path: '',
            loadComponent: () => import('./account/profile/profile.component').then(m => m.ProfileComponent)
          },
          {
            path: 'edit',
            loadComponent: () => import('./account/edit-profile/edit-profile.component').then(m => m.EditProfileComponent)
          },
          {
            path: 'change-password',
            loadComponent: () => import('./account/change-password/change-password.component').then(m => m.ChangePasswordComponent)
          },
          {
            path: 'addresses',
            loadComponent: () => import('./account/addresses/addresses.component').then(m => m.AddressesComponent)
          },
          {
            path: 'loyalty',
            loadComponent: () => import('./account/loyalty/loyalty.component').then(m => m.LoyaltyComponent)
          }
        ]
      },
      {
        path: 'cart',
        loadComponent: () => import('./cart/cart.component').then(m => m.CartComponent)
      },
      {
        path: 'favorites',
        loadComponent: () => import('./favorites/favorites.component').then(m => m.FavoritesComponent)
      },
      {
        path: 'verify-product',
        loadComponent: () => import('./verify-product/verify-product.component').then(m => m.VerifyProductComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
