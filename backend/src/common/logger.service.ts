import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    console.log(`[${new Date().toISOString()}] [${ctx}] ${message}`);
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.error(`[${new Date().toISOString()}] [${ctx}] ERROR: ${message}`);
    if (trace) {
      console.error(`[${new Date().toISOString()}] [${ctx}] TRACE: ${trace}`);
    }
  }

  warn(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    console.warn(`[${new Date().toISOString()}] [${ctx}] WARN: ${message}`);
  }

  debug(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [${ctx}] DEBUG: ${message}`);
    }
  }

  verbose(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] [${ctx}] VERBOSE: ${message}`);
    }
  }
}

