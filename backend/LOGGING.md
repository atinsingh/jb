# Logging Configuration

This application uses Winston for comprehensive logging with support for console and file outputs, log rotation, colors, and timestamps.

## Features

- ✅ **Log Levels**: error, warn, info, debug, verbose
- ✅ **Console Logging**: Colored output with timestamps
- ✅ **File Logging**: Rotating log files with daily rotation
- ✅ **Log Rotation**: Automatic file rotation with compression
- ✅ **Context Support**: Track which module/service is logging
- ✅ **Structured Logging**: JSON format in files for easy parsing

## Environment Variables

Add these to your `.env` file:

```env
# Logging Configuration
LOG_LEVEL=info                    # Log level: error, warn, info, debug, verbose
LOG_CONSOLE=true                  # Enable console logging (true/false)
LOG_FILE=true                     # Enable file logging (true/false)
LOGS_DIR=./logs                   # Directory for log files
LOG_MAX_FILES=14d                 # Keep logs for 14 days (or number like 30)
```

### Log Levels

- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default for production)
- `debug`: Debug, info, warnings, and errors (default for development)
- `verbose`: All log levels

## Log Files

Logs are stored in the `logs/` directory (configurable via `LOGS_DIR`):

- `application-YYYY-MM-DD.log` - All logs (info level and above)
- `error-YYYY-MM-DD.log` - Error logs only
- `debug-YYYY-MM-DD.log` - Debug logs (only when LOG_LEVEL=debug)

## Usage in Code

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../common/logger/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('MyService');
  }

  someMethod() {
    this.logger.log('Info message');
    this.logger.warn('Warning message');
    this.logger.error('Error message', error.stack);
    this.logger.debug('Debug message');
    this.logger.verbose('Verbose message');
  }
}
```

### Using NestJS Logger (Alternative)

The service implements NestJS's `LoggerService` interface, so you can also use it with NestJS's built-in Logger:

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('MyService');
logger.log('Message');
logger.warn('Warning');
logger.error('Error', 'Trace');
```

## Log Format

### Console Output (Colored)
```
2024-01-15 10:30:45.123 info [MyService] Info message
2024-01-15 10:30:45.124 warn [MyService] Warning message
2024-01-15 10:30:45.125 error [MyService] Error message
```

### File Output (JSON)
```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "info",
  "message": "Info message",
  "context": "MyService"
}
```

## File Rotation

- Files rotate daily at midnight
- Old files are compressed (gzip)
- Maximum file size: 20MB per file
- Old files are automatically deleted based on `LOG_MAX_FILES` setting

## Examples

### Development
```env
LOG_LEVEL=debug
LOG_CONSOLE=true
LOG_FILE=true
LOGS_DIR=./logs
LOG_MAX_FILES=7d
```

### Production
```env
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
LOGS_DIR=/var/log/jobocate
LOG_MAX_FILES=30d
```

### Console Only (No Files)
```env
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=false
```

## Best Practices

1. **Set Context**: Always set context for better log tracking
2. **Use Appropriate Levels**: 
   - `error` for exceptions and critical issues
   - `warn` for warnings that don't break functionality
   - `info` for important business events
   - `debug` for detailed debugging information
   - `verbose` for very detailed tracing
3. **Include Stack Traces**: Always include stack traces for errors
4. **Don't Log Sensitive Data**: Never log passwords, tokens, or PII
5. **Use Structured Data**: Include relevant context in log messages

