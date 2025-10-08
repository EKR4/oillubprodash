import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../cores/services/supabase.service';
import { Company, CompanyContact, CompanyDocument, CompanyTransaction, CompanyPriceTier, PriceTier } from '../../../../cores/models/company';
import { switchMap, catchError, of, take, map, firstValueFrom } from 'rxjs';

interface CompanyPriceTierWithBase extends CompanyPriceTier {
  baseTier?: PriceTier;
}

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss'
})
export class CompanyDetailComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  company: Company | null = null;
  contacts: CompanyContact[] = [];
  documents: CompanyDocument[] = [];
  transactions: CompanyTransaction[] = [];
  priceTiers: CompanyPriceTierWithBase[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.route.params.pipe(
      switchMap(params => {
        if (!params['id']) {
          throw new Error('Company ID is required');
        }
        return this.loadCompanyData(params['id']);
      }),
      catchError(error => {
        this.error = error.message;
        return of(null);
      })
    ).subscribe(() => {
      this.loading = false;
    });
  }

  private isCompany(obj: any): obj is Company {
    return obj !== null && typeof obj === 'object' && 'id' in obj && 'name' in obj;
  }

  private isCompanyContact(obj: any): obj is CompanyContact {
    return obj !== null && typeof obj === 'object' && 'id' in obj && 'company_id' in obj;
  }

  private isCompanyDocument(obj: any): obj is CompanyDocument {
    return obj !== null && typeof obj === 'object' && 'id' in obj && 'document_type' in obj;
  }

  private isCompanyTransaction(obj: any): obj is CompanyTransaction {
    return obj !== null && typeof obj === 'object' && 'id' in obj && 'transaction_type' in obj;
  }

  private isCompanyPriceTier(obj: any): obj is CompanyPriceTier {
    return obj !== null && typeof obj === 'object' && 'id' in obj && 'price_tier_id' in obj;
  }

  private filterAndCastArray<T>(
    data: any[],
    typeGuard: (item: any) => item is T
  ): T[] {
    if (!Array.isArray(data)) return [];
    return data.filter(typeGuard);
  }

  private async loadCompanyData(companyId: string): Promise<void> {
    try {
      const supabase = this.supabase.getSupabase();
      
      // Load company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (companyError) throw companyError;
      if (!companyData) throw new Error('Company not found');
      
      const company = companyData as any;
      if (!this.isCompany(company)) throw new Error('Invalid company data');
      this.company = company;

      // Load company contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (contactsError) throw contactsError;
      this.contacts = this.filterAndCastArray<CompanyContact>(
        contactsData || [],
        this.isCompanyContact
      );

      // Load company documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', companyId);
      
      if (documentsError) throw documentsError;
      this.documents = this.filterAndCastArray<CompanyDocument>(
        documentsData || [],
        this.isCompanyDocument
      );

      // Load company transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('company_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false });
      
      if (transactionsError) throw transactionsError;
      this.transactions = this.filterAndCastArray<CompanyTransaction>(
        transactionsData || [],
        this.isCompanyTransaction
      );

      // Load price tiers with base tier data
      const { data: priceTiersData, error: priceTiersError } = await supabase
        .from('company_price_tiers')
        .select('*')
        .eq('company_id', companyId)
        .order('effective_from', { ascending: false });
      
      if (priceTiersError) throw priceTiersError;
      
      const companyTiers = this.filterAndCastArray<CompanyPriceTier>(
        priceTiersData || [],
        this.isCompanyPriceTier
      );

      // Load base tier data for each company tier
      const baseTierPromises = companyTiers.map(async (companyTier) => {
        const { data: baseTier, error: baseTierError } = await supabase
          .from('price_tiers')
          .select('*')
          .eq('id', companyTier.price_tier_id)
          .single();
        
        if (baseTierError) throw baseTierError;
        
        return {
          ...companyTier,
          baseTier: baseTier ? (baseTier as unknown as PriceTier) : undefined
        };
      });

      this.priceTiers = await Promise.all(baseTierPromises);

    } catch (error: any) {
      this.error = error.message;
    }
  }

  async updateCompanyStatus(status: Company['status']) {
    if (!this.company) return;
    
    try {
      const supabase = this.supabase.getSupabase();
      const { error } = await supabase
        .from('companies')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.company.id);
      
      if (error) throw error;
      
      this.company.status = status;
      this.company.updated_at = new Date();
    } catch (error: any) {
      this.error = error.message;
    }
  }

  async verifyCompany(verified: boolean) {
    if (!this.company) return;
    
    try {
      // Get current user ID first
      const userId = await firstValueFrom(
        this.supabase.currentUser$.pipe(
          take(1),
          map(user => user?.id || undefined)
        ))

      const supabase = this.supabase.getSupabase();
      const { error } = await supabase
        .from('companies')
        .update({
          verified,
          verification_status: verified ? 'verified' : 'rejected',
          verification_date: new Date().toISOString(),
          verified_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.company.id);
      
      if (error) throw error;
      
      this.company.verified = verified;
      this.company.verification_status = verified ? 'verified' : 'rejected';
      this.company.verification_date = new Date();
      this.company.verified_by = userId || undefined;
      this.company.updated_at = new Date();
    } catch (error: any) {
      this.error = error.message;
    }
  }

  async updateCreditStatus(creditStatus: Company['credit_status']) {
    if (!this.company) return;
    
    try {
      const supabase = this.supabase.getSupabase();
      const { error } = await supabase
        .from('companies')
        .update({
          credit_status: creditStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.company.id);
      
      if (error) throw error;
      
      this.company.credit_status = creditStatus;
      this.company.updated_at = new Date();
    } catch (error: any) {
      this.error = error.message;
    }
  }

  editCompany() {
    if (!this.company) return;
    this.router.navigate(['../edit', this.company.id], { relativeTo: this.route });
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}