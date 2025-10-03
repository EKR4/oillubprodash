import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, map, of, switchMap, take, catchError } from 'rxjs';
import { SupabaseService } from '../../cores/services/supabase.service';
import { AuthService } from '../../cores/services/auth.service';
import { Ticket, TicketMessage, TicketAttachment, TicketStatus } from '../../cores/models/ticket';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  tickets$ = this.ticketsSubject.asObservable();
  
  private selectedTicketSubject = new BehaviorSubject<Ticket | null>(null);
  selectedTicket$ = this.selectedTicketSubject.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // Load all tickets for current user
  loadUserTickets(): Observable<Ticket[]> {
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        if (!user) throw new Error('No authenticated user');
        return this.supabaseService.getSupabase()
          .from('tickets')
          .select('*, messages(*), attachments(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
      }),
      map(({ data, error }) => {
        if (error) throw error;
        const tickets = data as Ticket[];
        this.ticketsSubject.next(tickets);
        return tickets;
      }),
      catchError(error => {
        console.error('Error loading tickets:', error);
        return of([]);
      })
    );
  }

  // Get a specific ticket by ID
  getTicketById(ticketId: string): Observable<Ticket | null> {
    return new Observable<Ticket | null>(observer => {
      (async () => {
        try {
          const { data, error } = await this.supabaseService.getSupabase()
            .from('tickets')
            .select('*, messages(*), attachments(*)')
            .eq('id', ticketId)
            .single();

          if (error) {
            observer.error(error);
            return;
          }
          const ticket = data as Ticket;
          this.selectedTicketSubject.next(ticket);
          observer.next(ticket);
          observer.complete();
        } catch (error) {
          console.error('Error loading ticket:', error);
          observer.next(null);
          observer.complete();
        }
      })();
    });
  }

  // Create a new ticket
  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket | null> {
    const user = await firstValueFrom(this.authService.currentUser$.pipe(take(1)));
    if (!user) throw new Error('No authenticated user');

    const ticket = {
      ...ticketData,
      user_id: user.id,
      status: 'OPEN',
      created_at: new Date(),
      updated_at: new Date()
    };

    const { data, error } = await this.supabaseService.getSupabase()
      .from('tickets')
      .insert([ticket])
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return null;
    }

    this.loadUserTickets(); // Refresh tickets list
    return data as Ticket;
  }

  // Add a message to a ticket
  async addMessage(ticketId: string, message: string, attachments: File[] = []): Promise<boolean> {
    const user = await firstValueFrom(this.authService.currentUser$.pipe(take(1)));
    if (!user) throw new Error('No authenticated user');

    const ticketMessage: Partial<TicketMessage> = {
      ticket_id: ticketId,
      user_id: user.id,
      message,
      is_internal: false,
      created_at: new Date()
    };

    const { error } = await this.supabaseService.getSupabase()
      .from('ticket_messages')
      .insert([ticketMessage]);

    if (error) {
      console.error('Error adding message:', error);
      return false;
    }

    // Upload attachments if any
    if (attachments.length > 0) {
      for (const file of attachments) {
        await this.uploadAttachment(ticketId, file);
      }
    }

    await this.getTicketById(ticketId); // Refresh ticket data
    return true;
  }

  // Upload an attachment
  private async uploadAttachment(ticketId: string, file: File): Promise<void> {
    const user = await firstValueFrom(this.authService.currentUser$.pipe(take(1)));
    if (!user) throw new Error('No authenticated user');

    // Upload file to storage
    const fileName = `${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await this.supabaseService.getSupabase()
      .storage
      .from('ticket-attachments')
      .upload(`${ticketId}/${fileName}`, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return;
    }

    // Create attachment record
    const attachment: Partial<TicketAttachment> = {
      ticket_id: ticketId,
      file_name: fileName,
      file_type: file.type,
      file_size: file.size,
      file_url: uploadData.path,
      uploaded_by: user.id,
      created_at: new Date()
    };

    const { error: attachmentError } = await this.supabaseService.getSupabase()
      .from('ticket_attachments')
      .insert([attachment]);

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError);
    }
  }

  // Close a ticket
  async closeTicket(ticketId: string): Promise<boolean> {
    const { error } = await this.supabaseService.getSupabase()
      .from('tickets')
      .update({ 
        status: 'CLOSED',
        closed_at: new Date(),
        updated_at: new Date()
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error closing ticket:', error);
      return false;
    }

    await this.getTicketById(ticketId); // Refresh ticket data
    return true;
  }

  // Reopen a ticket
  async reopenTicket(ticketId: string): Promise<boolean> {
    const { error } = await this.supabaseService.getSupabase()
      .from('tickets')
      .update({ 
        status: 'OPEN',
        closed_at: null,
        updated_at: new Date()
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error reopening ticket:', error);
      return false;
    }

    await this.getTicketById(ticketId); // Refresh ticket data
    return true;
  }
}