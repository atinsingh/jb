import { z } from 'zod';

// ==================== COMMON API TYPES ====================

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
  correlationId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: PaginationSchema,
  });

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// ==================== QUERY PARAMS ====================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const SortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type SortQuery = z.infer<typeof SortQuerySchema>;

// ==================== HEALTH CHECK ====================

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error', 'degraded']),
  timestamp: z.string(),
  version: z.string().optional(),
  uptime: z.number().optional(),
  services: z.record(z.object({
    status: z.enum(['up', 'down', 'degraded']),
    latency: z.number().optional(),
    message: z.string().optional(),
  })).optional(),
});
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// ==================== METRICS ====================

export const MetricsSchema = z.object({
  uptime: z.number(),
  memoryUsage: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    rss: z.number(),
  }),
  cpuUsage: z.number().optional(),
  requestsTotal: z.number().optional(),
  requestsPerSecond: z.number().optional(),
  activeConnections: z.number().optional(),
});
export type Metrics = z.infer<typeof MetricsSchema>;

