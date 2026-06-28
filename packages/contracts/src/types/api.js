"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsSchema = exports.HealthCheckSchema = exports.SortQuerySchema = exports.PaginationQuerySchema = exports.SuccessResponseSchema = exports.PaginatedResponseSchema = exports.PaginationSchema = exports.ApiErrorSchema = void 0;
const zod_1 = require("zod");
exports.ApiErrorSchema = zod_1.z.object({
    statusCode: zod_1.z.number(),
    message: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    error: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().optional(),
    path: zod_1.z.string().optional(),
    correlationId: zod_1.z.string().optional(),
});
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.number(),
    limit: zod_1.z.number(),
    total: zod_1.z.number(),
    totalPages: zod_1.z.number(),
    hasNext: zod_1.z.boolean(),
    hasPrev: zod_1.z.boolean(),
});
const PaginatedResponseSchema = (itemSchema) => zod_1.z.object({
    data: zod_1.z.array(itemSchema),
    pagination: exports.PaginationSchema,
});
exports.PaginatedResponseSchema = PaginatedResponseSchema;
exports.SuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
exports.PaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
});
exports.SortQuerySchema = zod_1.z.object({
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.HealthCheckSchema = zod_1.z.object({
    status: zod_1.z.enum(['ok', 'error', 'degraded']),
    timestamp: zod_1.z.string(),
    version: zod_1.z.string().optional(),
    uptime: zod_1.z.number().optional(),
    services: zod_1.z.record(zod_1.z.object({
        status: zod_1.z.enum(['up', 'down', 'degraded']),
        latency: zod_1.z.number().optional(),
        message: zod_1.z.string().optional(),
    })).optional(),
});
exports.MetricsSchema = zod_1.z.object({
    uptime: zod_1.z.number(),
    memoryUsage: zod_1.z.object({
        heapUsed: zod_1.z.number(),
        heapTotal: zod_1.z.number(),
        rss: zod_1.z.number(),
    }),
    cpuUsage: zod_1.z.number().optional(),
    requestsTotal: zod_1.z.number().optional(),
    requestsPerSecond: zod_1.z.number().optional(),
    activeConnections: zod_1.z.number().optional(),
});
//# sourceMappingURL=api.js.map