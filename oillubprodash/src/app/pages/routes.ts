import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { FaqComponent } from './faq/faq.component';
import { ProductCatalogComponent } from './product-catalog/product-catalog.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';

export const PUBLIC_ROUTES: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    title: 'Home'
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'About Us'
  },
  {
    path: 'contact',
    component: ContactComponent,
    title: 'Contact Us'
  },
  {
    path: 'faq',
    component: FaqComponent,
    title: 'FAQ'
  },
  {
    path: 'products',
    children: [
      {
        path: '',
        component: ProductCatalogComponent,
        title: 'Products'
      },
      {
        path: 'category/:category',
        component: ProductCatalogComponent,
        title: 'Products by Category'
      },
      {
        path: ':id',
        component: ProductDetailComponent,
        title: 'Product Details'
      }
    ]
  },
  // Redirect old URLs to new structure
  {
    path: 'product-catalog',
    redirectTo: 'products',
    pathMatch: 'full'
  },
  {
    path: 'product-detail/:id',
    redirectTo: 'products/:id',
    pathMatch: 'prefix'
  }
];