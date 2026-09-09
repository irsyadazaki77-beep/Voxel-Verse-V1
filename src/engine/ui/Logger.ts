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

  private static sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (value instanceof Error) {
        sanitized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      } else if (typeof value === 'object' && value !== null && 'error' in value && (value as any).error instanceof Error) {
        const err = (value as any).error as Error;
        sanitized[key] = {
          ...value,
          error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
        };
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public static log(level: LogLevel, category: string, message: string, details?: Record<string, unknown>): void {
    const formattedDetails = this.sanitizeDetails(details);
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      details: formattedDetails,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (!this.isProduction || level === 'ERROR' || level === 'WARN') {
      const formatted = `[${new Date(entry.timestamp).toISOString()}] [${level}] [${category}]: ${message}`;
      if (level === 'ERROR') {
        console.error(formatted, formattedDetails || '');
      } else if (level === 'WARN') {
        console.warn(formatted, formattedDetails || '');
      } else {
        console.log(formatted, formattedDetails || '');
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
