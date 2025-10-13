import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Ticket } from '../../../../cores/models/ticket';
import { TicketService } from '../../../../shared/services/ticket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  ticket$ = new BehaviorSubject<Ticket | null>(null);
  replyForm: FormGroup;
  selectedFiles: File[] = [];

  addReply(): void {
    if (this.replyForm.valid) {
      // Implement reply submission logic
      console.log('Reply submitted:', this.replyForm.value);
    }
  }
  isLoading = true;
  isSubmitting = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private fb: FormBuilder
  ) {
    this.replyForm = this.fb.group({
      message: ['', [Validators.required]],
      attachments: [[]]
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const ticketId = params['id'];
      if (ticketId) {
        this.loadTicket(ticketId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTicket(ticketId: string): void {
    this.isLoading = true;
    this.error = null;

    this.ticketService.getTicketById(ticketId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ticket) => {
          if (!ticket) {
            this.error = 'Ticket not found';
          } else {
            this.ticket$.next(ticket);
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load ticket details';
          this.isLoading = false;
          console.error('Error loading ticket:', error);
        }
      });
  }

  async sendMessage(): Promise<void> {
    if (this.replyForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.error = null;

    const currentTicket = this.ticket$.getValue();
    if (!currentTicket) return;

    try {
      await this.ticketService.addMessage(
        currentTicket.id,
        this.replyForm.get('message')?.value,
        this.selectedFiles
      );

      this.replyForm.reset();
      this.selectedFiles = [];
      await this.loadTicket(currentTicket.id);
    } catch (error) {
      this.error = 'Failed to send message';
      console.error('Error sending message:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  async closeTicket(): Promise<void> {
    const currentTicket = this.ticket$.getValue();
    if (!currentTicket) return;

    try {
      await this.ticketService.closeTicket(currentTicket.id);
      await this.loadTicket(currentTicket.id);
    } catch (error) {
      this.error = 'Failed to close ticket';
      console.error('Error closing ticket:', error);
    }
  }

  async reopenTicket(): Promise<void> {
    const currentTicket = this.ticket$.getValue();
    if (!currentTicket) return;

    try {
      await this.ticketService.reopenTicket(currentTicket.id);
      await this.loadTicket(currentTicket.id);
    } catch (error) {
      this.error = 'Failed to reopen ticket';
      console.error('Error reopening ticket:', error);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          this.error = `File ${file.name} is too large. Maximum size is 5MB`;
          return;
        }
        this.selectedFiles.push(file);
      });
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileIcon(type: string): string {
    if (type.startsWith('image/')) {
      return 'image';
    } else if (type.includes('pdf')) {
      return 'pdf';
    } else if (type.includes('word')) {
      return 'document';
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return 'spreadsheet';
    }
    return 'file';
  }
}
