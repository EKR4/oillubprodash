import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../../../cores/services/supabase.service';

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface BackupConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retentionDays: number;
  includeAttachments: boolean;
  compressBackup: boolean;
}

interface BackupHistory {
  id: string;
  created_at: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size_mb: number;
  type: 'manual' | 'scheduled';
  error_message?: string;
  download_url?: string;
}

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './backup.component.html',
  styleUrls: ['./backup.component.scss']
})
export class BackupComponent implements OnInit, OnDestroy {
  backupForm!: FormGroup;
  backupHistory: BackupHistory[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentBackup: BackupHistory | null = null;
  
  private subscriptions = new Subscription();
  private readonly BACKUP_CHECK_INTERVAL = 5000; // 5 seconds

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadBackupHistory();
    this.loadBackupConfig();
    this.startBackupStatusCheck();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    this.backupForm = this.fb.group({
      frequency: ['daily', Validators.required],
      time: ['00:00', Validators.required],
      retentionDays: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
      includeAttachments: [true],
      compressBackup: [true]
    });
  }

  private async loadBackupHistory(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []) as unknown as Array<{
        id: string;
        created_at: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        size_mb: number;
        type: 'manual' | 'scheduled';
        error_message?: string;
        download_url?: string;
      }>;

      this.backupHistory = typedData.map(backup => ({
        ...backup,
        created_at: new Date(backup.created_at)
      } as BackupHistory));

      // Check for any in-progress backup
      const inProgressBackup = this.backupHistory.find(b => b.status === 'in_progress');
      if (inProgressBackup) {
        this.currentBackup = inProgressBackup;
      }
    } catch (error: any) {
      this.errorMessage = `Error loading backup history: ${error.message}`;
      console.error('Error loading backup history:', error);
    }
  }

  private async loadBackupConfig(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('system_config')
        .select('*')
        .eq('type', 'backup')
        .single();

      if (error) throw error;
      if (data) {
        const typedConfig = data as unknown as { settings: BackupConfig };
        const config = typedConfig.settings;
        this.backupForm.patchValue(config);
      }
    } catch (error) {
      const supabaseError = error as SupabaseError;
      this.errorMessage = `Error loading backup configuration: ${supabaseError.message}`;
      console.error('Error loading backup configuration:', supabaseError);
    }
  }

  private startBackupStatusCheck(): void {
    if (this.currentBackup) {
      this.subscriptions.add(
        interval(this.BACKUP_CHECK_INTERVAL)
          .pipe(
            startWith(0),
            switchMap(() => this.checkBackupStatus(this.currentBackup!.id))
          )
          .subscribe()
      );
    }
  }

  private async checkBackupStatus(backupId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('system_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Backup not found');

      const typedBackup = data as unknown as {
        id: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        error_message?: string;
      };
      const backup = typedBackup as BackupHistory;
      
      if (backup.status !== 'in_progress') {
        this.currentBackup = null;
        await this.loadBackupHistory();
        
        if (backup.status === 'completed') {
          this.successMessage = 'Backup completed successfully!';
        } else if (backup.status === 'failed') {
          this.errorMessage = `Backup failed: ${backup.error_message}`;
        }
      }
    } catch (error: any) {
      console.error('Error checking backup status:', error);
    }
  }

  async startBackup(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const supabase = this.supabaseService.getSupabase();
      
      // Create backup record
      const { data: backupData, error } = await supabase
        .from('system_backups')
        .insert({
          status: 'pending',
          type: 'manual',
          created_at: new Date().toISOString(),
          size_mb: 0
        })
        .select()
        .single();

      if (error) throw error;
      if (!backupData) throw new Error('Failed to create backup record');

      const typedBackupData = backupData as unknown as {
        id: string;
        status: 'pending';
        type: 'manual';
        created_at: string;
        size_mb: number;
      };

      this.currentBackup = {
        ...typedBackupData,
        created_at: new Date(typedBackupData.created_at)
      } as BackupHistory;
      
      this.startBackupStatusCheck();
      
      // Trigger the actual backup process
      const { error: backupError } = await supabase
        .from('system_jobs')
        .insert({
          type: 'backup',
          payload: { backup_id: typedBackupData.id },
          status: 'pending'
        });

      if (backupError) throw backupError;

    } catch (error: any) {
      this.errorMessage = `Error starting backup: ${error.message}`;
      console.error('Error starting backup:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async saveBackupConfig(): Promise<void> {
    if (this.backupForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const config = this.backupForm.value;
      
      const { error } = await this.supabaseService.getSupabase()
        .from('system_config')
        .update({
          type: 'backup',
          settings: config,
          updated_at: new Date().toISOString()
        })
        .eq('type', 'backup');

      if (error) throw error;
      
      this.successMessage = 'Backup configuration saved successfully!';
    } catch (error: any) {
      this.errorMessage = `Error saving backup configuration: ${error.message}`;
      console.error('Error saving backup configuration:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      // Create restore job
      const { error } = await this.supabaseService.getSupabase()
        .from('system_jobs')
        .insert({
          type: 'restore',
          payload: { backup_id: backupId },
          status: 'pending'
        });

      if (error) throw error;
      
      this.successMessage = 'Restore process started. This may take several minutes.';
    } catch (error: any) {
      this.errorMessage = `Error starting restore: ${error.message}`;
      console.error('Error starting restore:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async downloadBackup(backupId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getSupabase()
        .from('system_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error) throw error;
      const typedData = data as unknown as { download_url?: string };
      if (!typedData?.download_url) throw new Error('Backup download URL not found');

      window.open(typedData.download_url, '_blank');
    } catch (error: any) {
      this.errorMessage = `Error downloading backup: ${error.message}`;
      console.error('Error downloading backup:', error);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'in_progress':
        return 'status-in-progress';
      default:
        return 'status-pending';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  formatSize(sizeMb: number): string {
    if (sizeMb < 1024) {
      return `${sizeMb.toFixed(2)} MB`;
    }
    return `${(sizeMb / 1024).toFixed(2)} GB`;
  }
}
