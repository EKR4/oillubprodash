import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService } from '../../../../shared/services/ticket.service';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-ticket.component.html',
  styleUrls: ['./create-ticket.component.scss']
})
export class CreateTicketComponent implements OnInit {
  ticketForm: FormGroup;
  selectedFiles: File[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private router: Router
  ) {
    this.ticketForm = this.fb.group({
      title: ['', [Validators.required]],
      category: ['', [Validators.required]],
      priority: ['medium', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.ticketForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      try {
        const ticket = await this.ticketService.createTicket({
          ...this.ticketForm.value,
          attachments: this.selectedFiles
        });

        if (ticket) {
          await this.router.navigate(['/support/tickets', ticket.id]);
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        // Handle error (show notification, etc.)
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
