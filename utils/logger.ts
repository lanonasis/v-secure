/**
 * Logger utility for the security service
 */

export interface LogContext {
  [key: string]: unknown;
}

export const logger = {
  debug: (message: string, context?: LogContext): void => {
    console.debug(`[DEBUG] ${message}`, context || '');
  },

  info: (message: string, context?: LogContext): void => {
    console.info(`[INFO] ${message}`, context || '');
  },

  warn: (message: string, context?: LogContext): void => {
    console.warn(`[WARN] ${message}`, context || '');
  },

  error: (message: string, context?: LogContext | Error | unknown): void => {
    if (context instanceof Error) {
      console.error(`[ERROR] ${message}`, { error: context.message, stack: context.stack });
    } else if (typeof context === 'object' && context !== null) {
      console.error(`[ERROR] ${message}`, context);
    } else {
      console.error(`[ERROR] ${message}`, context || '');
    }
  }
};
