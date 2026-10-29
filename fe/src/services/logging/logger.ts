// Enterprise Client Logging Service for DCC NG ICD

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  format(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (import.meta.env?.DEV) {
      const entry = this.format('debug', message, context);
      console.debug(`[DEBUG ${entry.timestamp}] ${entry.message}`, entry.context || '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('info', message, context);
    console.info(`[INFO ${entry.timestamp}] ${entry.message}`, entry.context || '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('warn', message, context);
    console.warn(`[WARN ${entry.timestamp}] ${entry.message}`, entry.context || '');
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const entry = this.format('error', message, context);
    console.error(`[ERROR ${entry.timestamp}] ${entry.message}`, error, entry.context || '');
  }
}

export const logger = new Logger();
