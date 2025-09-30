import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  isExpanded?: boolean;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {
  faqs: FaqItem[] = [
    {
      id: 1,
      question: 'What types of lubricants do you offer?',
      answer: 'We offer a comprehensive range of lubricants including motor oils, industrial lubricants, hydraulic fluids, and specialty lubricants. Our products are designed to meet various industry standards and specifications.',
      category: 'Products'
    },
    {
      id: 2,
      question: 'How do I choose the right lubricant for my equipment?',
      answer: 'To select the right lubricant, consider factors like equipment type, operating conditions, manufacturer recommendations, and industry requirements. Our technical team can help you make the best choice based on your specific needs.',
      category: 'Products'
    },
    {
      id: 3,
      question: 'What are your delivery options?',
      answer: 'We offer various delivery options including standard shipping, express delivery, and bulk delivery for large orders. Delivery times and costs vary based on your location and order size.',
      category: 'Shipping'
    },
    {
      id: 4,
      question: 'How can I track my order?',
      answer: 'Once your order is confirmed, you\'ll receive a tracking number via email. You can use this number on our website or contact our customer service team for real-time updates on your delivery.',
      category: 'Shipping'
    },
    {
      id: 5,
      question: 'What payment methods do you accept?',
      answer: 'We accept major credit cards, bank transfers, and corporate purchase orders. For bulk orders, we can arrange custom payment terms based on your requirements.',
      category: 'Payment'
    },
    {
      id: 6,
      question: 'Do you offer technical support?',
      answer: 'Yes, we provide comprehensive technical support including product recommendations, usage guidelines, and troubleshooting assistance. Our technical team is available during business hours.',
      category: 'Support'
    }
  ];

  searchQuery: string = '';
  selectedCategory: string = 'all';
  categories: string[] = ['all'];
  filteredFaqs: FaqItem[] = [];

  ngOnInit(): void {
    // Extract unique categories
    this.categories = ['all', ...new Set(this.faqs.map(faq => faq.category))];
    this.filterFaqs();
  }

  filterFaqs(): void {
    this.filteredFaqs = this.faqs.filter(faq => {
      const matchesSearch = faq.question.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'all' || faq.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }

  toggleFaq(faq: FaqItem): void {
    faq.isExpanded = !faq.isExpanded;
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.filterFaqs();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterFaqs();
  }
}