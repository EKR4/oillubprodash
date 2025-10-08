import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../enviroments/environment';
import { SupabaseService } from '../../cores/services/supabase.service';
import { AuthService } from '../../cores/services/auth.service';
import { User } from '../../cores/models/user';
import * as crypto from 'crypto';

// Supabase error interface
interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Payment provider types
export type PaymentProvider = 'mpesa' | 'pesalink' | 'equity' | 'cooperative' | 'ncba' | 'card';

// Transaction status
export type TransactionStatus = 
  'pending' | 
  'processing' | 
  'completed' | 
  'failed' | 
  'cancelled' | 
  'refunded' | 
  'partially_refunded';

// Webhook payload interface
export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  signature?: string;
  timestamp?: number;
}

// Payment request interface
export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  provider: PaymentProvider;
  phoneNumber?: string;
  email?: string;
  accountNumber?: string;
  callbackUrl?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

// Payment response interface
export interface PaymentResponse {
  transactionId: string;
  status: TransactionStatus;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  reference: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  providerReference?: string;
  checkoutUrl?: string;
  checkoutCode?: string;
}

// Transaction verification response
export interface TransactionVerification {
  transactionId: string;
  status: TransactionStatus;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  reference: string;
  providerReference?: string;
  completedAt?: Date;
  failureReason?: string;
}

// Refund request
export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}

// Refund response
export interface RefundResponse {
  refundId: string;
  transactionId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  reason: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

// Internal types for data handling
interface TransactionRecord {
  id: string;
  status: TransactionStatus;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  reference: string;
  provider_reference?: string | null;
  user_id: string | null;
  checkout_url?: string | null;
  checkout_code?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  failure_reason?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly API_URL = environment.mulaflow.apiUrl;
  private readonly API_KEY = environment.mulaflow.apiKey;
  private readonly WEBHOOK_SECRET = environment.mulaflow.webhookSecret;
  private currentUser: User | null = null;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {
    // Listen for auth changes to get current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  /**
   * Initialize a payment transaction
   */
  initiatePayment(request: PaymentRequest): Observable<PaymentResponse> {
    const headers = this.getAuthHeaders();
    
    // Ensure reference is unique
    if (!request.reference) {
      request.reference = `LUBRIMAX-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    }

    // Add callback URL if not provided
    if (!request.callbackUrl) {
      request.callbackUrl = `${window.location.origin}/api/payment/callback`;
    }

    // Add current user info to metadata if available
    if (this.currentUser) {
      request.metadata = {
        ...request.metadata,
        userId: this.currentUser.id,
        userEmail: this.currentUser.email
      };
    }

    return this.http.post<PaymentResponse>(
      `${this.API_URL}/payments/initiate`,
      request,
      { headers }
    ).pipe(
      tap(response => {
        // Save transaction to Supabase for tracking
        this.saveTransactionToDatabase(response).catch(error => {
          console.error('Failed to save transaction:', error);
        });
      }),
      catchError(error => {
        console.error('Payment initiation failed:', error);
        return throwError(() => new Error(`Payment initiation failed: ${error.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Initialize M-Pesa STK Push payment
   */
  initiateMpesaPayment(
    amount: number, 
    phoneNumber: string, 
    description: string,
    reference?: string,
    metadata?: Record<string, any>
  ): Observable<PaymentResponse> {
    return this.initiatePayment({
      amount,
      currency: 'KES',
      description,
      provider: 'mpesa',
      phoneNumber,
      reference,
      metadata
    });
  }

  /**
   * Initialize PesaLink payment
   */
  initiatePesaLinkPayment(
    amount: number,
    accountNumber: string,
    description: string,
    reference?: string,
    metadata?: Record<string, any>
  ): Observable<PaymentResponse> {
    return this.initiatePayment({
      amount,
      currency: 'KES',
      description,
      provider: 'pesalink',
      accountNumber,
      reference,
      metadata
    });
  }

  /**
   * Initialize bank payment (Equity, Co-operative, NCBA)
   */
  initiateBankPayment(
    amount: number,
    provider: 'equity' | 'cooperative' | 'ncba',
    accountNumber: string,
    description: string,
    reference?: string,
    metadata?: Record<string, any>
  ): Observable<PaymentResponse> {
    return this.initiatePayment({
      amount,
      currency: 'KES',
      description,
      provider,
      accountNumber,
      reference,
      metadata
    });
  }

  /**
   * Initialize card payment
   */
  initiateCardPayment(
    amount: number,
    email: string,
    description: string,
    reference?: string,
    metadata?: Record<string, any>
  ): Observable<PaymentResponse> {
    return this.initiatePayment({
      amount,
      currency: 'KES',
      description,
      provider: 'card',
      email,
      reference,
      metadata
    });
  }

  /**
   * Check status of a transaction
   */
  checkTransactionStatus(transactionId: string): Observable<TransactionVerification> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<TransactionVerification>(
      `${this.API_URL}/payments/${transactionId}/status`,
      { headers }
    ).pipe(
      tap(response => {
        // Update transaction status in database
        this.updateTransactionStatus(
          transactionId, 
          response.status, 
          response.failureReason
        ).subscribe({
          error: (err) => console.error('Failed to update transaction status:', err)
        });
      }),
      catchError(error => {
        console.error('Transaction status check failed:', error);
        return throwError(() => new Error(`Transaction status check failed: ${error.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Process a refund
   */
  processRefund(request: RefundRequest): Observable<RefundResponse> {
    const headers = this.getAuthHeaders();
    
    return this.http.post<RefundResponse>(
      `${this.API_URL}/payments/${request.transactionId}/refund`,
      request,
      { headers }
    ).pipe(
      tap(response => {
        // Save refund information to database
        this.saveRefundToDatabase(response).catch(error => {
          console.error('Failed to save refund:', error);
        });
      }),
      catchError(error => {
        console.error('Refund processing failed:', error);
        return throwError(() => new Error(`Refund processing failed: ${error.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Process webhook notifications from Mulaflow
   */
  processWebhook(payload: WebhookPayload): Observable<boolean> {
    try {
      // Validate webhook signature
      if (!this.validateWebhookSignature(payload)) {
        throw new Error('Invalid webhook signature');
      }
      
      // Validate payload structure
      if (!payload.event || !payload.data) {
        throw new Error('Invalid webhook payload structure');
      }
      
      // Handle different event types
      switch (payload.event) {
        case 'payment.completed':
          return this.handlePaymentCompleted(payload.data);
        
        case 'payment.failed':
          return this.handlePaymentFailed(payload.data);
          
        case 'refund.completed':
          return this.handleRefundCompleted(payload.data);
          
        default:
          console.warn('Unhandled webhook event:', payload.event);
          return of(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
      console.error('Webhook processing failed:', message);
      return throwError(() => new Error(message));
    }
  }

  /**
   * Validate webhook signature to ensure it's authentic
   */
  private validateWebhookSignature(payload: WebhookPayload): boolean {
    if (!this.WEBHOOK_SECRET || !payload.signature || !payload.timestamp) {
      return false;
    }
    
    const signatureData = `${payload.event}.${payload.timestamp}.${JSON.stringify(payload.data)}`;
    const hmac = crypto.createHmac('sha256', this.WEBHOOK_SECRET);
    const calculatedSignature = hmac.update(signatureData).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(payload.signature)
    );
  }

  /**
   * Handle payment completed webhook event
   */
  private handlePaymentCompleted(data: Record<string, any>): Observable<boolean> {
    if (!data['transactionId']) {
      return throwError(() => new Error('Missing transactionId in webhook data'));
    }
    
    return this.updateTransactionStatus(data['transactionId'], 'completed').pipe(
      map(() => true),
      catchError(error => {
        console.error('Error handling payment completed webhook:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle payment failed webhook event
   */
  private handlePaymentFailed(data: Record<string, any>): Observable<boolean> {
    if (!data['transactionId']) {
      return throwError(() => new Error('Missing transactionId in webhook data'));
    }
    
    return this.updateTransactionStatus(
      data['transactionId'], 
      'failed', 
      data['failureReason']
    ).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error handling payment failed webhook:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle refund completed webhook event
   */
  private handleRefundCompleted(data: Record<string, any>): Observable<boolean> {
    if (!data['refundId'] || !data['transactionId']) {
      return throwError(() => new Error('Missing refundId or transactionId in webhook data'));
    }
    
    return this.updateRefundStatus(data['refundId'], 'completed').pipe(
      switchMap(() => this.updateTransactionStatus(data['transactionId'], 'refunded')),
      map(() => true),
      catchError(error => {
        console.error('Error handling refund completed webhook:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Save transaction to Supabase database
   */
  private async saveTransactionToDatabase(transaction: PaymentResponse): Promise<void> {
    if (!this.supabaseService) {
      throw new Error('Supabase service not initialized');
    }
    
    const now = new Date().toISOString();
    const transactionRecord = {
      id: transaction.transactionId,
      status: transaction.status,
      provider: transaction.provider,
      amount: transaction.amount,
      currency: transaction.currency,
      reference: transaction.reference,
      provider_reference: transaction.providerReference ?? null,
      user_id: this.currentUser?.id ?? null,
      checkout_url: transaction.checkoutUrl ?? null,
      checkout_code: transaction.checkoutCode ?? null,
      metadata: transaction.metadata ?? null,
      created_at: now,
      updated_at: now
    };

    try {
      const { error } = await this.supabaseService.getSupabase()
        .from('payment_transactions')
        .insert(transactionRecord);

      if (error) {
        throw new Error(`Error saving transaction: ${error.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      console.error('Database error saving transaction:', message);
      throw error;
    }
  }

  /**
   * Update transaction status in database
   */
  private updateTransactionStatus(
    transactionId: string, 
    status: TransactionStatus, 
    failureReason?: string
  ): Observable<boolean> {
    if (!this.supabaseService) {
      return throwError(() => new Error('Supabase service not initialized'));
    }
    
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      status,
      updated_at: now
    };
    
    if (status === 'completed') {
      updateData['completed_at'] = now;
    }
    
    if (failureReason) {
      updateData['failure_reason'] = failureReason;
    }
    
    return new Observable<boolean>(observer => {
      this.supabaseService.getSupabase()
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .then(({ error }) => {
          if (error) {
            const supabaseError = error as SupabaseError;
            observer.error(new Error(`Error updating transaction: ${supabaseError.message}`));
          } else {
            observer.next(true);
            observer.complete();
          }
        }, (error: Error) => {
          observer.error(new Error(`Database error updating transaction: ${error.message}`));
        });
    });
  }

  /**
   * Save refund information to database
   */
  private async saveRefundToDatabase(refund: RefundResponse): Promise<void> {
    if (!this.supabaseService) {
      throw new Error('Supabase service not initialized');
    }
    
    const refundRecord = {
      id: refund.refundId,
      transaction_id: refund.transactionId,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      user_id: this.currentUser?.id ?? null,
      metadata: refund.metadata ?? null,
      created_at: refund.createdAt.toISOString(),
      completed_at: refund.completedAt?.toISOString() ?? null
    };
    
    try {
      const { error } = await this.supabaseService.getSupabase()
        .from('payment_refunds')
        .insert(refundRecord);

      if (error) {
        throw new Error(`Error saving refund: ${error.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      console.error('Database error saving refund:', message);
      throw error;
    }
  }

  /**
   * Update refund status in database
   */
  private updateRefundStatus(
    refundId: string, 
    status: TransactionStatus
  ): Observable<boolean> {
    if (!this.supabaseService) {
      return throwError(() => new Error('Supabase service not initialized'));
    }
    
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      status,
      updated_at: now
    };
    
    if (status === 'completed') {
      updateData['completed_at'] = now;
    }
    
    return new Observable<boolean>(observer => {
      this.supabaseService.getSupabase()
        .from('payment_refunds')
        .update(updateData)
        .eq('id', refundId)
        .then(({ error }) => {
          if (error) {
            const supabaseError = error as SupabaseError;
            observer.error(new Error(`Error updating refund: ${supabaseError.message}`));
          } else {
            observer.next(true);
            observer.complete();
          }
        }, (error: Error) => {
          observer.error(new Error(`Database error updating refund: ${error.message}`));
        });
    });
  }

  /**
   * Get authorization headers for API requests
   */
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.API_KEY}`
    });
  }
}