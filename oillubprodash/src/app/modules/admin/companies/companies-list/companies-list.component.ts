import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Company, CompanyStatus, CompanyType } from '../../../cores/models/company';
import { SupabaseService } from '../../../cores/services/supabase.service';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './companies-list.component.html',
  styleUrls: ['./companies-list.component.scss']
})
export class CompaniesListComponent implements OnInit, OnDestroy {
  companies: Company[] = [];
  filteredCompanies: Company[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Make Math available in template
  Math = Math;
  
  // Filtering and sorting
  searchQuery = '';
  sortField: keyof Company = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  
  private subscriptions = new Subscription();

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadCompanies(): void {
    this.isLoading = true;
    
    // In a real application, this would be a call to the SupabaseService
    // this.subscriptions.add(
    //   this.supabaseService.getCompanies().subscribe(...)
    // );
    
    // Mock implementation for demonstration
    setTimeout(() => {
      this.companies = this.generateMockCompanies();
      this.applyFilters();
      this.isLoading = false;
    }, 500);
  }

  generateMockCompanies(): Company[] {
    const mockCompanies: Company[] = [];
    
    for (let i = 1; i <= 25; i++) {
      mockCompanies.push({
        id: `comp-${i}`,
        name: `Company ${i}`,
        business_registration_number: `REG-${100000 + i}`,
        tax_id: `TAX-${200000 + i}`,
        email: `contact@company${i}.com`,
        phone: `+254${700000000 + i}`,
        alternative_phone: i % 2 === 0 ? `+254${700000000 + i + 1000}` : undefined,
        website: i % 3 === 0 ? `https://company${i}.com` : undefined,
        company_type: (i % 4 === 0 ? 'distributor' : 
                     i % 3 === 0 ? 'retailer' : 
                     i % 2 === 0 ? 'manufacturer' : 'fleet_operator') as CompanyType,
        industry: i % 3 === 0 ? 'automotive' : i % 2 === 0 ? 'industrial' : 'transportation',
        status: (i % 7 !== 0 ? 'active' : 'inactive') as CompanyStatus,
        verification_status: i % 5 !== 0 ? 'verified' : 'unverified',
        verification_date: i % 5 !== 0 ? new Date(2023, (i % 12), (i % 28) + 1) : undefined,
        verified_by: i % 5 !== 0 ? `admin-${i % 3 + 1}` : undefined,
        
        primary_address: {
          street: `${i} Business Park`,
          city: i % 3 === 0 ? 'Mombasa' : i % 2 === 0 ? 'Nairobi' : 'Kisumu',
          postal_code: `${10000 + i}`,
          country: 'Kenya',
          is_default: true
        },
        
        year_established: 2000 + (i % 21),
        employee_count: 10 * i,
        annual_revenue_range: i % 3 === 0 ? '1M-5M' : i % 2 === 0 ? '5M-10M' : '10M+',
        description: `Company ${i} is a leading provider of lubricants and oils in the region.`,
        
        credit_limit: 10000 * i,
        payment_terms: i % 3 === 0 ? 'Net 15' : i % 2 === 0 ? 'Net 30' : 'Net 60',
        credit_status: i % 4 === 0 ? 'hold' : i % 2 === 0 ? 'warning' : 'good',
        
        logo_url: `https://ui-avatars.com/api/?name=Company+${i}&background=random`,
        
        created_at: new Date(2022, (i % 12), (i % 28) + 1),
        updated_at: new Date(),
        
        total_orders: i * 5,
        total_spent: i * 5000,
        average_order_value: 5000
      });
    }
    
    return mockCompanies;
  }

  applyFilters(): void {
    // Apply status filter
    let filtered = [...this.companies];
    
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(company => 
        this.statusFilter === 'active' ? company.status === 'active' : company.status !== 'active'
      );
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(query) ||
        company.email.toLowerCase().includes(query) ||
        company.phone.includes(query) ||
        company.business_registration_number.toLowerCase().includes(query) ||
        company.company_type.toLowerCase().includes(query) ||
        (company.industry && company.industry.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const fieldA = a[this.sortField];
      const fieldB = b[this.sortField];
      
      if (fieldA === null || fieldA === undefined) return this.sortDirection === 'asc' ? -1 : 1;
      if (fieldB === null || fieldB === undefined) return this.sortDirection === 'asc' ? 1 : -1;
      
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return this.sortDirection === 'asc' 
          ? fieldA.localeCompare(fieldB) 
          : fieldB.localeCompare(fieldA);
      }
      
      if (fieldA instanceof Date && fieldB instanceof Date) {
        return this.sortDirection === 'asc' 
          ? fieldA.getTime() - fieldB.getTime() 
          : fieldB.getTime() - fieldA.getTime();
      }
      
      // For numbers and other types
      return this.sortDirection === 'asc' 
        ? (fieldA as any) - (fieldB as any) 
        : (fieldB as any) - (fieldA as any);
    });
    
    // Update total items count
    this.totalItems = filtered.length;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.filteredCompanies = filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.applyFilters();
  }

  onSort(field: keyof Company): void {
    if (this.sortField === field) {
      // Toggle sort direction if clicking the same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new sort field and default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.applyFilters();
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
    this.currentPage = 1; // Reset to first page
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if there are only a few
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a limited range of pages
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;
      
      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  deleteCompany(id: string): void {
    if (confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      // In a real application, this would call the SupabaseService
      // this.supabaseService.deleteCompany(id).then(() => this.loadCompanies());
      
      // Mock implementation
      this.companies = this.companies.filter(company => company.id !== id);
      this.applyFilters();
    }
  }

  toggleCompanyStatus(company: Company): void {
    // In a real application, this would call the SupabaseService
    // this.supabaseService.updateCompany(company.id, { status: company.status === 'active' ? 'inactive' : 'active' })
    //   .then(() => this.loadCompanies());
    
    // Mock implementation
    company.status = company.status === 'active' ? 'inactive' : 'active';
    this.applyFilters();
  }

  getCompanyTypeLabel(type: CompanyType): string {
    switch(type) {
      case 'distributor': return 'Distributor';
      case 'retailer': return 'Retailer';
      case 'manufacturer': return 'Manufacturer';
      case 'fleet_operator': return 'Fleet Operator';
      case 'workshop': return 'Workshop';
      case 'other': return 'Other';
      // All CompanyType values are already covered, but we'll add a safe fallback
      default: return String(type);
    }
  }

  getIndustryLabel(industry: string | undefined): string {
    if (!industry) return 'N/A';
    
    switch(industry) {
      case 'automotive': return 'Automotive';
      case 'industrial': return 'Industrial';
      case 'transportation': return 'Transportation';
      default: return industry.charAt(0).toUpperCase() + industry.slice(1);
    }
  }

  getStatusLabel(status: CompanyStatus): string {
    switch(status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'pending': return 'Pending';
      case 'suspended': return 'Suspended';
      // All CompanyStatus values are already covered, but we'll add a safe fallback
      default: return String(status);
    }
  }

  getStatusClass(status: CompanyStatus): string {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCreditStatusClass(status: string): string {
    switch(status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}