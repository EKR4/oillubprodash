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
    component: ProductCatalogComponent,
    title: 'Products'
  },
  {
    path: 'products/:id',
    component: ProductDetailComponent,
    title: 'Product Details'
  }
];