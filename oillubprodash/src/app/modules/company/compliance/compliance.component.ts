import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface ComplianceDocument {
  id: string;
  type: 'certificate' | 'license' | 'permit' | 'audit';
  name: string;
  issuer: string;
  issuedDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'pending' | 'revoked';
  documentUrl?: string;
  lastAuditDate?: Date;
  nextAuditDue?: Date;
  notes?: string;
  requirements?: string[];
}

interface ComplianceStats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  pending: number;
}

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './compliance.component.html',
  styleUrl: './compliance.component.scss'
})
export class ComplianceComponent implements OnInit {
  documents: ComplianceDocument[] = [];
  stats: ComplianceStats = {
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    pending: 0
  };
  loading = true;
  searchTerm = '';
  selectedFilter: 'all' | 'certificate' | 'license' | 'permit' | 'audit' = 'all';
  sortBy: 'name' | 'issuer' | 'issuedDate' | 'expiryDate' = 'expiryDate';
  sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit(): void {
    this.loadComplianceData();
  }

  private loadComplianceData(): void {
    // Simulated API call
    setTimeout(() => {
      this.documents = [
        {
          id: '1',
          type: 'certificate',
          name: 'ISO 9001:2015',
          issuer: 'Bureau Veritas',
          issuedDate: new Date('2024-01-15'),
          expiryDate: new Date('2027-01-14'),
          status: 'active',
          documentUrl: 'assets/docs/iso9001.pdf',
          lastAuditDate: new Date('2024-12-01'),
          nextAuditDue: new Date('2025-12-01'),
          requirements: ['Annual audit', 'Quality management system', 'Documentation control']
        },
        {
          id: '2',
          type: 'license',
          name: 'Environmental Operation License',
          issuer: 'Environmental Protection Agency',
          issuedDate: new Date('2024-06-01'),
          expiryDate: new Date('2025-12-01'),
          status: 'active',
          lastAuditDate: new Date('2024-09-01'),
          notes: 'Renewal process should start 3 months before expiry'
        },
        {
          id: '3',
          type: 'permit',
          name: 'Hazardous Materials Handling',
          issuer: 'State Safety Department',
          issuedDate: new Date('2024-03-15'),
          expiryDate: new Date('2025-03-14'),
          status: 'pending',
          requirements: ['Staff training', 'Safety equipment inspection', 'Emergency response plan']
        },
        {
          id: '4',
          type: 'audit',
          name: 'Annual Safety Audit',
          issuer: 'SafetyFirst Consultants',
          issuedDate: new Date('2024-11-01'),
          expiryDate: new Date('2025-11-01'),
          status: 'active',
          lastAuditDate: new Date('2024-11-01'),
          nextAuditDue: new Date('2025-11-01')
        }
      ];

      this.updateStats();
      this.loading = false;
    }, 1000);
  }

  private updateStats(): void {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    this.stats = {
      total: this.documents.length,
      active: this.documents.filter(d => d.status === 'active').length,
      expiring: this.documents.filter(d => 
        d.status === 'active' && 
        d.expiryDate <= thirtyDaysFromNow && 
        d.expiryDate > now
      ).length,
      expired: this.documents.filter(d => d.status === 'expired').length,
      pending: this.documents.filter(d => d.status === 'pending').length
    };
  }

  get filteredDocuments(): ComplianceDocument[] {
    return this.documents
      .filter(doc => 
        (this.selectedFilter === 'all' || doc.type === this.selectedFilter) &&
        (doc.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
         doc.issuer.toLowerCase().includes(this.searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const valueA = a[this.sortBy];
        const valueB = b[this.sortBy];
        const modifier = this.sortDirection === 'asc' ? 1 : -1;

        if (valueA instanceof Date && valueB instanceof Date) {
          return (valueA.getTime() - valueB.getTime()) * modifier;
        }

        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return valueA.localeCompare(valueB) * modifier;
        }

        return 0;
      });
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'expired': return '#F44336';
      case 'pending': return '#FF9800';
      case 'revoked': return '#9E9E9E';
      default: return '#000000';
    }
  }

  getDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  toggleSort(field: 'name' | 'issuer' | 'issuedDate' | 'expiryDate'): void {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
  }

  downloadDocument(documentUrl: string): void {
    // Implement document download functionality
    console.log('Downloading document:', documentUrl);
  }

  scheduleAudit(document: ComplianceDocument): void {
    // Implement audit scheduling functionality
    console.log('Scheduling audit for:', document.name);
  }
}
