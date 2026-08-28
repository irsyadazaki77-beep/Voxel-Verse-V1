// Production-grade Structured Logger & Diagnostic Buffer
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DIAGNOSTIC';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
}

export class Logger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 500;
  private static isProduction = process.env.NODE_ENV === 'production';

  public static log(level: LogLevel, category: string, message: string, details?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (!this.isProduction || level === 'ERROR' || level === 'WARN') {
      const formatted = `[${new Date(entry.timestamp).toISOString()}] [${level}] [${category}]: ${message}`;
      if (level === 'ERROR') {
        console.error(formatted, details || '');
      } else if (level === 'WARN') {
        console.warn(formatted, details || '');
      } else {
        console.log(formatted, details || '');
      }
    }
  }

  public static info(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('INFO', category, message, details);
  }

  public static warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('WARN', category, message, details);
  }

  public static error(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('ERROR', category, message, details);
  }

  public static diagnostic(category: string, message: string, details?: Record<string, unknown>): void {
    this.log('DIAGNOSTIC', category, message, details);
  }

  public static getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public static exportDiagnosticsJSON(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        logs: this.logs,
      },
      null,
      2
    );
  }

  public static clear(): void {
    this.logs = [];
  }
}
