import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Ticket } from '../../../../cores/models/ticket';
import { TicketService } from '../../../../shared/services/ticket.service';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class TicketsComponent implements OnInit {
  tickets$: Observable<Ticket[]>;
  filteredTickets$!: Observable<Ticket[]>;
  isLoading = true;

  // Filters
  searchTerm = '';
  statusFilter = '';
  categoryFilter = '';

  private searchTerms$ = new BehaviorSubject<string>('');
  private statusFilter$ = new BehaviorSubject<string>('');
  private categoryFilter$ = new BehaviorSubject<string>('');

  constructor(private ticketService: TicketService) {
    this.tickets$ = this.ticketService.tickets$;
    this.setupFilteredTickets();
  }

  private setupFilteredTickets(): void {
    this.filteredTickets$ = combineLatest([
      this.tickets$,
      this.searchTerms$,
      this.statusFilter$,
      this.categoryFilter$
    ]).pipe(
      map(([tickets, search, status, category]) => {
        return (tickets || []).filter(ticket => {
          const matchesSearch = !search ||
            ticket.title.toLowerCase().includes(search.toLowerCase()) ||
            ticket.description.toLowerCase().includes(search.toLowerCase());

          const matchesStatus = !status || ticket.status === status;
          const matchesCategory = !category || ticket.category === category;

          return matchesSearch && matchesStatus && matchesCategory;
        });
      })
    );
  }

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.isLoading = true;
    this.ticketService.loadUserTickets().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tickets:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.searchTerms$.next(this.searchTerm);
    this.statusFilter$.next(this.statusFilter);
    this.categoryFilter$.next(this.categoryFilter);
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

  getCategoryClass(category: string): string {
    switch (category.toLowerCase()) {
      case 'technical':
        return 'bg-blue-100 text-blue-800';
      case 'billing':
        return 'bg-purple-100 text-purple-800';
      case 'product':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
