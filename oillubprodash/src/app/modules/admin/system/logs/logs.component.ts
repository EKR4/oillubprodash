import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LogLevel } from '../../../../cores/models/log';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../../../cores/services/supabase.service';


interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

interface LogFilter {
  startDate?: Date;
  endDate?: Date;
  levels: LogLevel[];
  source?: string;
  search?: string;
}

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit, OnDestroy {
  logs: LogEntry[] = [];
  filteredLogs: LogEntry[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  filterForm!: FormGroup;
  Math = Math;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  
  // Auto-refresh
  isAutoRefresh = true;
  private readonly REFRESH_INTERVAL = 10000; // 10 seconds
  
  // Event handler for checkbox changes
  onLevelCheckboxChange(event: Event, level: LogLevel): void {
    const checkbox = event.target as HTMLInputElement;
    const currentLevels = this.filterForm.get('levels')?.value as LogLevel[] || [];
    
    if (checkbox.checked && !currentLevels.includes(level)) {
      this.filterForm.get('levels')?.setValue([...currentLevels, level]);
    } else if (!checkbox.checked && currentLevels.includes(level)) {
      this.filterForm.get('levels')?.setValue(currentLevels.filter(l => l !== level));
    }
  }
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.initFilterForm();
    this.loadLogs();
    this.startAutoRefresh();

    // Subscribe to filter changes
    this.subscriptions.add(
      this.filterForm.valueChanges.subscribe(() => {
        this.applyFilters();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initFilterForm(): void {
    this.filterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      levels: [['info', 'warning', 'error']],
      source: [''],
      search: ['']
    });
  }

  private async loadLogs(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(
          (this.currentPage - 1) * this.pageSize,
          this.currentPage * this.pageSize - 1
        );

      if (error) throw error;
      
      const typedData = (data || []) as unknown as Array<{
        id: string;
        timestamp: string;
        level: LogLevel;
        message: string;
        source: string;
        user_id?: string;
        metadata?: Record<string, any>;
      }>;

      this.logs = typedData.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));

      this.applyFilters();
    } catch (error: any) {
      this.errorMessage = `Error loading logs: ${error.message}`;
      console.error('Error loading logs:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private startAutoRefresh(): void {
    if (this.isAutoRefresh) {
      this.subscriptions.add(
        interval(this.REFRESH_INTERVAL)
          .pipe(
            startWith(0),
            switchMap(() => {
              if (this.isAutoRefresh) {
                return this.loadLatestLogs();
              }
              return Promise.resolve();
            })
          )
          .subscribe()
      );
    }
  }

  private async loadLatestLogs(): Promise<void> {
    if (this.logs.length === 0) return;

    try {
      const latestTimestamp = this.logs[0].timestamp;
      
      const { data, error } = await this.supabaseService.getSupabase()
        .from('system_logs')
        .select('*')
        .gt('timestamp', latestTimestamp.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []) as unknown as Array<{
        id: string;
        timestamp: string;
        level: LogLevel;
        message: string;
        source: string;
        user_id?: string;
        metadata?: Record<string, any>;
      }>;

      const newLogs = typedData.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));

      // Prepend new logs and maintain page size
      this.logs = [...newLogs, ...this.logs].slice(0, this.pageSize);
      this.applyFilters();
    } catch (error: any) {
      console.error('Error loading latest logs:', error);
    }
  }

  private applyFilters(): void {
    const filters = this.filterForm.value as LogFilter;
    let filtered = [...this.logs];

    // Apply date range filter
    if (filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }

    // Apply level filter
    if (filters.levels && filters.levels.length > 0) {
      filtered = filtered.filter(log => filters.levels.includes(log.level));
    }

    // Apply source filter
    if (filters.source) {
      filtered = filtered.filter(log => 
        log.source.toLowerCase().includes(filters.source!.toLowerCase())
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchLower))
      );
    }

    this.filteredLogs = filtered;
    this.totalItems = filtered.length;
  }

  clearFilters(): void {
    this.filterForm.reset({
      startDate: null,
      endDate: null,
      levels: ['info', 'warning', 'error'],
      source: '',
      search: ''
    });
  }

  toggleAutoRefresh(): void {
    this.isAutoRefresh = !this.isAutoRefresh;
    if (this.isAutoRefresh) {
      this.startAutoRefresh();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadLogs();
  }

  exportLogs(): void {
    const logs = this.filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      source: log.source,
      message: log.message,
      metadata: log.metadata ? JSON.stringify(log.metadata) : ''
    }));

    // Create CSV content
    const headers = ['Timestamp', 'Level', 'Source', 'Message', 'Metadata'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp,
        log.level,
        `"${log.source.replace(/"/g, '""')}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${log.metadata.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_${now}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getLogLevelClass(level: LogLevel): string {
    switch (level) {
      case 'error':
        return 'log-error';
      case 'warning':
        return 'log-warning';
      case 'info':
        return 'log-info';
      case 'debug':
        return 'log-debug';
      default:
        return '';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleString();
  }

  formatMetadata(metadata: Record<string, any> | undefined): string {
    if (!metadata) return '';
    return JSON.stringify(metadata, null, 2);
  }
}