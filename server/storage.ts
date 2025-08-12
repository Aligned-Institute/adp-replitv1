import { 
  type NarrowModel, 
  type InsertNarrowModel,
  type QuerySession,
  type InsertQuerySession,
  type QueryResponse,
  type InsertQueryResponse,
  type CoordinationLog,
  type InsertCoordinationLog,
  type RoutingRequest,
  type RoutingResult,
  type SystemStats,
  Domain,
  NMStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Narrow Models
  createNarrowModel(nm: InsertNarrowModel): Promise<NarrowModel>;
  getNarrowModel(id: string): Promise<NarrowModel | undefined>;
  getAllNarrowModels(): Promise<NarrowModel[]>;
  getNarrowModelsByDomain(domain: string): Promise<NarrowModel[]>;
  updateNarrowModel(id: string, updates: Partial<NarrowModel>): Promise<NarrowModel | undefined>;
  
  // Query Sessions
  createQuerySession(session: InsertQuerySession): Promise<QuerySession>;
  getQuerySession(id: string): Promise<QuerySession | undefined>;
  updateQuerySession(id: string, updates: Partial<QuerySession>): Promise<QuerySession | undefined>;
  
  // Query Responses
  createQueryResponse(response: InsertQueryResponse): Promise<QueryResponse>;
  getQueryResponsesBySession(sessionId: string): Promise<QueryResponse[]>;
  
  // Coordination Logs
  createCoordinationLog(log: InsertCoordinationLog): Promise<CoordinationLog>;
  getCoordinationLogs(limit?: number): Promise<CoordinationLog[]>;
  
  // System Stats
  getSystemStats(): Promise<SystemStats>;
}

export class MemStorage implements IStorage {
  private narrowModels: Map<string, NarrowModel>;
  private querySessions: Map<string, QuerySession>;
  private queryResponses: Map<string, QueryResponse>;
  private coordinationLogs: CoordinationLog[];

  constructor() {
    this.narrowModels = new Map();
    this.querySessions = new Map();
    this.queryResponses = new Map();
    this.coordinationLogs = [];
    
    // Initialize with demo narrow models
    this.initializeDemoNMs();
  }

  private initializeDemoNMs() {
    const demoNMs: InsertNarrowModel[] = [
      {
        id: "med-cardio-01",
        domain: Domain.MEDICAL,
        endpoint: "https://medical-nm1.example.com",
        capabilities: ["cardiology", "diagnostics"],
        weight: 0.9,
        responseTimeAvg: 800,
        accuracyScore: 0.95,
        status: NMStatus.HEALTHY,
        maxConcurrent: 10
      },
      {
        id: "med-general-01", 
        domain: Domain.MEDICAL,
        endpoint: "https://medical-nm2.example.com",
        capabilities: ["general_medicine", "triage"],
        weight: 0.7,
        responseTimeAvg: 600,
        accuracyScore: 0.88,
        status: NMStatus.HEALTHY,
        maxConcurrent: 10
      },
      {
        id: "med-specialist-01",
        domain: Domain.MEDICAL,
        endpoint: "https://medical-nm3.example.com", 
        capabilities: ["oncology", "research"],
        weight: 0.8,
        responseTimeAvg: 1200,
        accuracyScore: 0.97,
        status: NMStatus.HEALTHY,
        maxConcurrent: 10
      },
      {
        id: "legal-contract-01",
        domain: Domain.LEGAL,
        endpoint: "https://legal-nm1.example.com",
        capabilities: ["contracts", "compliance"],
        weight: 0.85,
        responseTimeAvg: 900,
        accuracyScore: 0.92,
        status: NMStatus.DEGRADED,
        maxConcurrent: 10
      },
      {
        id: "tech-security-01",
        domain: Domain.TECHNICAL,
        endpoint: "https://tech-nm1.example.com",
        capabilities: ["security", "networking"],
        weight: 0.88,
        responseTimeAvg: 750,
        accuracyScore: 0.94,
        status: NMStatus.HEALTHY,
        maxConcurrent: 10
      },
      {
        id: "fin-analysis-01",
        domain: Domain.FINANCIAL,
        endpoint: "https://fin-nm1.example.com",
        capabilities: ["analysis", "risk_assessment"],
        weight: 0.82,
        responseTimeAvg: 950,
        accuracyScore: 0.91,
        status: NMStatus.HEALTHY,
        maxConcurrent: 10
      }
    ];

    demoNMs.forEach(nm => {
      this.createNarrowModel(nm);
    });
  }

  async createNarrowModel(insertNm: InsertNarrowModel): Promise<NarrowModel> {
    const nm: NarrowModel = {
      ...insertNm,
      status: insertNm.status || NMStatus.HEALTHY,
      lastHealthCheck: Date.now(),
      currentLoad: 0
    };
    this.narrowModels.set(nm.id, nm);
    return nm;
  }

  async getNarrowModel(id: string): Promise<NarrowModel | undefined> {
    return this.narrowModels.get(id);
  }

  async getAllNarrowModels(): Promise<NarrowModel[]> {
    return Array.from(this.narrowModels.values());
  }

  async getNarrowModelsByDomain(domain: string): Promise<NarrowModel[]> {
    return Array.from(this.narrowModels.values()).filter(nm => nm.domain === domain);
  }

  async updateNarrowModel(id: string, updates: Partial<NarrowModel>): Promise<NarrowModel | undefined> {
    const existing = this.narrowModels.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.narrowModels.set(id, updated);
    return updated;
  }

  async createQuerySession(insertSession: InsertQuerySession): Promise<QuerySession> {
    const session: QuerySession = {
      ...insertSession,
      queryCount: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      lastActivity: Date.now()
    };
    this.querySessions.set(session.id, session);
    return session;
  }

  async getQuerySession(id: string): Promise<QuerySession | undefined> {
    return this.querySessions.get(id);
  }

  async updateQuerySession(id: string, updates: Partial<QuerySession>): Promise<QuerySession | undefined> {
    const existing = this.querySessions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, lastActivity: Date.now() };
    this.querySessions.set(id, updated);
    return updated;
  }

  async createQueryResponse(insertResponse: InsertQueryResponse): Promise<QueryResponse> {
    const response: QueryResponse = {
      ...insertResponse,
      id: randomUUID(),
      timestamp: Date.now()
    };
    this.queryResponses.set(response.id, response);
    return response;
  }

  async getQueryResponsesBySession(sessionId: string): Promise<QueryResponse[]> {
    return Array.from(this.queryResponses.values())
      .filter(response => response.sessionId === sessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async createCoordinationLog(insertLog: InsertCoordinationLog): Promise<CoordinationLog> {
    const log: CoordinationLog = {
      ...insertLog,
      id: randomUUID(),
      timestamp: Date.now()
    };
    this.coordinationLogs.push(log);
    
    // Keep only the latest 100 logs
    if (this.coordinationLogs.length > 100) {
      this.coordinationLogs = this.coordinationLogs.slice(-100);
    }
    
    return log;
  }

  async getCoordinationLogs(limit: number = 20): Promise<CoordinationLog[]> {
    return this.coordinationLogs
      .slice(-limit)
      .reverse(); // Most recent first
  }

  async getSystemStats(): Promise<SystemStats> {
    const allNMs = Array.from(this.narrowModels.values());
    const totalNms = allNMs.length;
    const activeNms = allNMs.filter(nm => nm.status === NMStatus.HEALTHY).length;
    const avgResponseTime = totalNms > 0 
      ? Math.round(allNMs.reduce((sum, nm) => sum + nm.responseTimeAvg, 0) / totalNms)
      : 0;
    
    const systemHealth = totalNms > 0 ? (activeNms / totalNms) * 100 : 0;
    
    // Calculate domain stats
    const domains: Record<string, any> = {};
    Object.values(Domain).forEach(domain => {
      const domainNMs = allNMs.filter(nm => nm.domain === domain);
      domains[domain] = {
        total: domainNMs.length,
        healthy: domainNMs.filter(nm => nm.status === NMStatus.HEALTHY).length,
        degraded: domainNMs.filter(nm => nm.status === NMStatus.DEGRADED).length,
        unavailable: domainNMs.filter(nm => nm.status === NMStatus.UNAVAILABLE).length
      };
    });

    const totalQueries = Array.from(this.querySessions.values())
      .reduce((sum, session) => sum + session.queryCount, 0);

    return {
      totalNms,
      activeNms,
      systemHealth,
      avgResponseTime,
      totalQueries,
      domains
    };
  }
}

export const storage = new MemStorage();
