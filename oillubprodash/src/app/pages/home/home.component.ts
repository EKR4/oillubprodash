import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface Testimonial {
  quote: string;
  author: string;
  position: string;
  company: string;
  image?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
  features: string[];
  specifications: {
    viscosity_grade?: string;
    base_oil_type?: string;
    approvals?: string[];
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  featuredProducts: Product[] = [
    {
      id: 1,
      name: 'LubriMax Pro Synthetic 5W-40',
      description: 'Advanced fully synthetic engine oil for superior performance and protection.',
      category: 'engine_oil',
      price: 8500,
      features: [
        'Enhanced engine protection',
        'Improved fuel efficiency',
        'Extended drain intervals',
        'Superior thermal stability'
      ],
      specifications: {
        viscosity_grade: '5W-40',
        base_oil_type: 'Full Synthetic',
        approvals: ['API SP', 'ACEA A3/B4', 'MB 229.5']
      }
    },
    {
      id: 2,
      name: 'LubriMax Heavy Duty 15W-40',
      description: 'Premium diesel engine oil for heavy-duty commercial vehicles.',
      category: 'engine_oil',
      price: 6500,
      features: [
        'Excellent soot handling',
        'High temperature protection',
        'Enhanced wear protection',
        'Improved engine cleanliness'
      ],
      specifications: {
        viscosity_grade: '15W-40',
        base_oil_type: 'Mineral',
        approvals: ['API CI-4', 'ACEA E7', 'MB 228.3']
      }
    },
    {
      id: 3,
      name: 'LubriMax Gear Ultra 75W-90',
      description: 'Synthetic gear oil for modern transmissions and differentials.',
      category: 'gear_oil',
      price: 7500,
      features: [
        'Excellent gear protection',
        'Smooth gear shifting',
        'Extended service life',
        'Wide temperature range'
      ],
      specifications: {
        viscosity_grade: '75W-90',
        base_oil_type: 'Synthetic',
        approvals: ['API GL-5', 'MIL-PRF-2105E']
      }
    }
  ];

  features: Feature[] = [
    {
      title: 'Premium Quality',
      description: 'Our lubricants are manufactured using high-quality base oils and advanced additive technology.',
      icon: 'star'
    },
    {
      title: 'Technical Support',
      description: 'Expert technical support and consultation for optimal product selection and application.',
      icon: 'support'
    },
    {
      title: 'Wide Distribution',
      description: 'Extensive distribution network ensuring product availability across East Africa.',
      icon: 'truck'
    },
    {
      title: 'Laboratory Services',
      description: 'State-of-the-art laboratory for oil analysis and condition monitoring.',
      icon: 'flask'
    }
  ];

  testimonials: Testimonial[] = [
    {
      quote: 'LubriMax products have significantly reduced our fleet maintenance costs and improved vehicle performance.',
      author: 'John Mwangi',
      position: 'Fleet Manager',
      company: 'Express Logistics Ltd'
    },
    {
      quote: "The technical support and product quality from LubriMax have been exceptional. They're more than just a supplier.",
      author: "Sarah Omondi",
      position: 'Operations Director',
      company: 'Highland Manufacturing'
    },
    {
      quote: "We've seen remarkable improvements in equipment reliability since switching to LubriMax products.",
      author: "David Kiprop",
      position: 'Maintenance Manager',
      company: 'Mining Solutions Kenya'
    }
  ];

  certifications = [
    {
      name: 'ISO 9001:2015',
      description: 'Quality Management System',
      icon: 'certificate'
    },
    {
      name: 'ISO 14001:2015',
      description: 'Environmental Management System',
      icon: 'leaf'
    },
    {
      name: 'KEBS Certification',
      description: 'Kenya Bureau of Standards',
      icon: 'shield'
    }
  ];

  isLoading = false;
  error: string | null = null;

  ngOnInit(): void {}

  getProductImage(product: Product): string {
    if (product.image_url) {
      return product.image_url;
    }
    
    switch (product.category) {
      case 'engine_oil':
        return 'assets/images/placeholders/engine-oil.jpg';
      case 'gear_oil':
        return 'assets/images/placeholders/gear-oil.jpg';
      case 'hydraulic_oil':
        return 'assets/images/placeholders/hydraulic-oil.jpg';
      case 'grease':
        return 'assets/images/placeholders/grease.jpg';
      default:
        return 'assets/images/placeholders/default-product.jpg';
    }
  }

  formatPrice(price: number, currency: string = 'KES'): string {
    return `${currency} ${price.toLocaleString()}`;
  }

  getFeatureIcon(icon: string): string {
    return `assets/icons/${icon}.svg`;
  }
}