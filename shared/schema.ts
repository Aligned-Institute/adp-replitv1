import { z } from "zod";

// Enums
export const NMStatus = {
  HEALTHY: "healthy",
  DEGRADED: "degraded", 
  UNAVAILABLE: "unavailable"
} as const;

export const Domain = {
  MEDICAL: "medical",
  LEGAL: "legal",
  TECHNICAL: "technical",
  FINANCIAL: "financial",
  GENERAL: "general"
} as const;

export const Priority = {
  NORMAL: "normal",
  HIGH: "high", 
  URGENT: "urgent"
} as const;

export const MessageType = {
  DELEGATION_REQUEST: "delegation_request",
  DELEGATION_RESPONSE: "delegation_response",
  CA_LOG_ENTRY: "ca_log_entry",
  ALIGNMENT_FLAG: "alignment_flag"
} as const;

// Base schemas
export const narrowModelSchema = z.object({
  id: z.string(),
  domain: z.enum([Domain.MEDICAL, Domain.LEGAL, Domain.TECHNICAL, Domain.FINANCIAL, Domain.GENERAL]),
  endpoint: z.string(),
  capabilities: z.array(z.string()),
  weight: z.number().min(0.1).max(1.0),
  status: z.enum([NMStatus.HEALTHY, NMStatus.DEGRADED, NMStatus.UNAVAILABLE]).default(NMStatus.HEALTHY),
  responseTimeAvg: z.number().default(0),
  accuracyScore: z.number().min(0).max(1).default(0.9),
  lastHealthCheck: z.number().default(0),
  currentLoad: z.number().default(0),
  maxConcurrent: z.number().default(10)
});

export const routingRequestSchema = z.object({
  messageId: z.string(),
  domain: z.enum([Domain.MEDICAL, Domain.LEGAL, Domain.TECHNICAL, Domain.FINANCIAL, Domain.GENERAL]),
  priority: z.enum([Priority.NORMAL, Priority.HIGH, Priority.URGENT]).default(Priority.NORMAL),
  preferredNmId: z.string().optional(),
  requireValidation: z.boolean().default(true),
  originalQuery: z.string(),
  sessionId: z.string().optional()
});

export const routingResultSchema = z.object({
  primary: z.string().nullable(),
  validation: z.array(z.string()),
  routingMethod: z.string(),
  totalAvailable: z.number().optional(),
  targetNodeModel: z.number().optional(),
  error: z.string().optional()
});

export const querySessionSchema = z.object({
  id: z.string(),
  queryCount: z.number().default(0),
  avgResponseTime: z.number().default(0),
  totalResponseTime: z.number().default(0),
  startTime: z.number(),
  lastActivity: z.number()
});

export const confidenceMetricsSchema = z.object({
  overallConfidence: z.number(),
  domainMatch: z.number(),
  factualConfidence: z.number()
});

export const alignmentAssessmentSchema = z.object({
  safetyCheck: z.enum(["passed", "flagged", "unknown"]),
  biasEvaluation: z.enum(["low", "moderate", "high"]),
  hallucinationRisk: z.enum(["low", "moderate", "high"]),
  harmPotential: z.enum(["none", "minimal", "moderate", "high"])
});

export const queryResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  nmId: z.string(),
  content: z.string(),
  confidenceMetrics: confidenceMetricsSchema,
  alignmentAssessment: alignmentAssessmentSchema,
  processingTimeMs: z.number(),
  tokensUsed: z.number(),
  isPrimary: z.boolean(),
  timestamp: z.number()
});

export const coordinationLogSchema = z.object({
  id: z.string(),
  eventType: z.enum(["delegation", "response", "flag", "error"]),
  sessionId: z.string(),
  timestamp: z.number(),
  description: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export const adpMessageSchema = z.object({
  messageType: z.enum([MessageType.DELEGATION_REQUEST, MessageType.DELEGATION_RESPONSE, MessageType.CA_LOG_ENTRY, MessageType.ALIGNMENT_FLAG]),
  adpHeader: z.object({
    protocolVersion: z.string().default("1.0"),
    messageId: z.string(),
    timestamp: z.string(),
    sessionId: z.string().optional(),
    source: z.object({
      type: z.string(),
      id: z.string(),
      organization: z.string().optional()
    }),
    destination: z.object({
      type: z.string(),
      domain: z.string().optional(),
      preferredNmId: z.string().optional()
    }).optional(),
    routing: z.object({
      priority: z.string(),
      maxHops: z.number(),
      timeoutSeconds: z.number()
    }).optional()
  }),
  payload: z.record(z.unknown())
});

// System stats schema
export const systemStatsSchema = z.object({
  totalNms: z.number(),
  activeNms: z.number(),
  systemHealth: z.number(),
  avgResponseTime: z.number(),
  totalQueries: z.number(),
  domains: z.record(z.object({
    total: z.number(),
    healthy: z.number(),
    degraded: z.number(),
    unavailable: z.number()
  }))
});

// Insert schemas
export const insertNarrowModelSchema = narrowModelSchema.omit({ lastHealthCheck: true, currentLoad: true });
export const insertRoutingRequestSchema = routingRequestSchema;
export const insertQuerySessionSchema = querySessionSchema.omit({ queryCount: true, avgResponseTime: true, totalResponseTime: true, lastActivity: true });
export const insertQueryResponseSchema = queryResponseSchema.omit({ id: true, timestamp: true });
export const insertCoordinationLogSchema = coordinationLogSchema.omit({ id: true, timestamp: true });

// Types
export type NarrowModel = z.infer<typeof narrowModelSchema>;
export type RoutingRequest = z.infer<typeof routingRequestSchema>;
export type RoutingResult = z.infer<typeof routingResultSchema>;
export type QuerySession = z.infer<typeof querySessionSchema>;
export type QueryResponse = z.infer<typeof queryResponseSchema>;
export type CoordinationLog = z.infer<typeof coordinationLogSchema>;
export type ADPMessage = z.infer<typeof adpMessageSchema>;
export type SystemStats = z.infer<typeof systemStatsSchema>;
export type ConfidenceMetrics = z.infer<typeof confidenceMetricsSchema>;
export type AlignmentAssessment = z.infer<typeof alignmentAssessmentSchema>;

export type InsertNarrowModel = z.infer<typeof insertNarrowModelSchema>;
export type InsertRoutingRequest = z.infer<typeof insertRoutingRequestSchema>;
export type InsertQuerySession = z.infer<typeof insertQuerySessionSchema>;
export type InsertQueryResponse = z.infer<typeof insertQueryResponseSchema>;
export type InsertCoordinationLog = z.infer<typeof insertCoordinationLogSchema>;
