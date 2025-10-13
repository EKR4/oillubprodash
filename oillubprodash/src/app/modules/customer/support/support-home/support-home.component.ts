import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Ticket } from '../../../../cores/models/ticket';
import { TicketService } from '../../../../shared/services/ticket.service';

@Component({
  selector: 'app-support-home',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './support-home.component.html',
  styleUrls: ['./support-home.component.scss']
})
export class SupportHomeComponent implements OnInit {
  recentTickets$: Observable<Ticket[]>;

  constructor(private ticketService: TicketService) {
    this.recentTickets$ = this.ticketService.tickets$.pipe(
      map(tickets => tickets.slice(0, 5))
    );
  }

  ngOnInit(): void {
    this.ticketService.loadUserTickets();
  }

  getStatusClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
