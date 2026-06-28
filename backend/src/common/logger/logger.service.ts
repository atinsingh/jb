import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import winston-daily-rotate-file using require for CommonJS compatibility
const DailyRotateFile = require('winston-daily-rotate-file');

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    // Ensure logs directory exists
    const logsDir = process.env.LOGS_DIR || join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    // Console format with colors
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        const contextStr = context ? `[${context}]` : '';
        const traceStr = trace ? `\n${trace}` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${contextStr} ${message}${metaStr}${traceStr}`;
      }),
    );

    // File transports
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    if (process.env.LOG_CONSOLE !== 'false') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: process.env.LOG_LEVEL || 'info',
        }),
      );
    }

    // File transports (if enabled)
    if (process.env.LOG_FILE !== 'false') {
      // Combined log file (all levels)
      transports.push(
        new DailyRotateFile({
          filename: join(logsDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: process.env.LOG_MAX_FILES || '14d',
          format: logFormat,
          level: process.env.LOG_LEVEL || 'info',
        }),
      );

      // Error log file (errors only)
      transports.push(
        new DailyRotateFile({
          filename: join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: process.env.LOG_MAX_FILES || '30d',
          format: logFormat,
          level: 'error',
        }),
      );

      // Debug log file (if debug level is enabled)
      if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production') {
        transports.push(
          new DailyRotateFile({
            filename: join(logsDir, 'debug-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: process.env.LOG_MAX_FILES || '7d',
            format: logFormat,
            level: 'debug',
          }),
        );
      }
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    this.logger.info(message, { context: ctx });
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context || 'Application';
    this.logger.error(message, { context: ctx, trace });
  }

  warn(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    this.logger.warn(message, { context: ctx });
  }

  debug(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    this.logger.debug(message, { context: ctx });
  }

  verbose(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    this.logger.verbose(message, { context: ctx });
  }

  // Additional helper methods
  info(message: any, context?: string) {
    this.log(message, context);
  }

  // Winston logger instance for advanced usage
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

