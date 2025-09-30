export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface LogFilter {
  startDate?: Date;
  endDate?: Date;
  levels: LogLevel[];
  source?: string;
  search?: string;
}