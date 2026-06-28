import { z } from 'zod';
export declare const ApiErrorSchema: z.ZodObject<{
    statusCode: z.ZodNumber;
    message: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string;
    timestamp?: string;
    message?: string | string[];
    error?: string;
    statusCode?: number;
    correlationId?: string;
}, {
    path?: string;
    timestamp?: string;
    message?: string | string[];
    error?: string;
    statusCode?: number;
    correlationId?: string;
}>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodNumber;
    limit: z.ZodNumber;
    total: z.ZodNumber;
    totalPages: z.ZodNumber;
    hasNext: z.ZodBoolean;
    hasPrev: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    total?: number;
    page?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}, {
    limit?: number;
    total?: number;
    page?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}>;
export type Pagination = z.infer<typeof PaginationSchema>;
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    data: z.ZodArray<T, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    }, {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    data?: T["_output"][];
    pagination?: {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    };
}, {
    data?: T["_input"][];
    pagination?: {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    };
}>;
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message?: string;
    success?: boolean;
}, {
    message?: string;
    success?: boolean;
}>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    page?: number;
}, {
    limit?: number;
    page?: number;
}>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export declare const SortQuerySchema: z.ZodObject<{
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortOrder?: "asc" | "desc";
    sortBy?: string;
}, {
    sortOrder?: "asc" | "desc";
    sortBy?: string;
}>;
export type SortQuery = z.infer<typeof SortQuerySchema>;
export declare const HealthCheckSchema: z.ZodObject<{
    status: z.ZodEnum<["ok", "error", "degraded"]>;
    timestamp: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    uptime: z.ZodOptional<z.ZodNumber>;
    services: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        status: z.ZodEnum<["up", "down", "degraded"]>;
        latency: z.ZodOptional<z.ZodNumber>;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message?: string;
        status?: "degraded" | "up" | "down";
        latency?: number;
    }, {
        message?: string;
        status?: "degraded" | "up" | "down";
        latency?: number;
    }>>>;
}, "strip", z.ZodTypeAny, {
    version?: string;
    timestamp?: string;
    status?: "error" | "ok" | "degraded";
    uptime?: number;
    services?: Record<string, {
        message?: string;
        status?: "degraded" | "up" | "down";
        latency?: number;
    }>;
}, {
    version?: string;
    timestamp?: string;
    status?: "error" | "ok" | "degraded";
    uptime?: number;
    services?: Record<string, {
        message?: string;
        status?: "degraded" | "up" | "down";
        latency?: number;
    }>;
}>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export declare const MetricsSchema: z.ZodObject<{
    uptime: z.ZodNumber;
    memoryUsage: z.ZodObject<{
        heapUsed: z.ZodNumber;
        heapTotal: z.ZodNumber;
        rss: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        heapUsed?: number;
        heapTotal?: number;
        rss?: number;
    }, {
        heapUsed?: number;
        heapTotal?: number;
        rss?: number;
    }>;
    cpuUsage: z.ZodOptional<z.ZodNumber>;
    requestsTotal: z.ZodOptional<z.ZodNumber>;
    requestsPerSecond: z.ZodOptional<z.ZodNumber>;
    activeConnections: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    uptime?: number;
    memoryUsage?: {
        heapUsed?: number;
        heapTotal?: number;
        rss?: number;
    };
    cpuUsage?: number;
    requestsTotal?: number;
    requestsPerSecond?: number;
    activeConnections?: number;
}, {
    uptime?: number;
    memoryUsage?: {
        heapUsed?: number;
        heapTotal?: number;
        rss?: number;
    };
    cpuUsage?: number;
    requestsTotal?: number;
    requestsPerSecond?: number;
    activeConnections?: number;
}>;
export type Metrics = z.infer<typeof MetricsSchema>;
