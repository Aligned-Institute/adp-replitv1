import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { adpRouter } from "./services/adp-router";
import { 
  insertRoutingRequestSchema,
  insertQuerySessionSchema,
  insertQueryResponseSchema,
  Domain,
  Priority
} from "@shared/schema";
import { randomUUID } from "crypto";

interface WSClient {
  ws: WebSocket;
  sessionId?: string;
}

const wsClients: Set<WSClient> = new Set();

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all narrow models
  app.get("/api/narrow-models", async (req, res) => {
    try {
      const nms = await storage.getAllNarrowModels();
      res.json(nms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch narrow models" });
    }
  });

  // Get narrow models by domain
  app.get("/api/narrow-models/domain/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const nms = await storage.getNarrowModelsByDomain(domain);
      res.json(nms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch narrow models for domain" });
    }
  });

  // Process a query (main ADP delegation)
  app.post("/api/query", async (req, res) => {
    try {
      const requestData = insertRoutingRequestSchema.parse({
        ...req.body,
        messageId: randomUUID()
      });

      // Create or get session
      let session;
      if (requestData.sessionId) {
        session = await storage.getQuerySession(requestData.sessionId);
      }
      
      if (!session) {
        session = await storage.createQuerySession({
          id: requestData.sessionId || randomUUID(),
          startTime: Date.now()
        });
      }

      // Log delegation start
      await storage.createCoordinationLog({
        eventType: "delegation",
        sessionId: session.id,
        description: `Query delegation started for domain: ${requestData.domain}`,
        metadata: { 
          priority: requestData.priority,
          domain: requestData.domain,
          messageId: requestData.messageId
        }
      });

      // Route the request
      const routingResult = await adpRouter.routeRequest(requestData);

      if (!routingResult.primary) {
        res.status(503).json({ 
          error: routingResult.error || "No available narrow models",
          routingResult 
        });
        return;
      }

      // Log routing decision
      await storage.createCoordinationLog({
        eventType: "delegation",
        sessionId: session.id,
        description: `Routing decision made: ${routingResult.routingMethod}`,
        metadata: {
          primary: routingResult.primary,
          validation: routingResult.validation,
          routingMethod: routingResult.routingMethod
        }
      });

      // Simulate NM responses
      const responses = [];
      
      // Primary response
      if (routingResult.primary) {
        const primaryNM = await storage.getNarrowModel(routingResult.primary);
        if (primaryNM) {
          const processingTime = primaryNM.responseTimeAvg + (Math.random() * 200 - 100); // ±100ms variance
          const response = await storage.createQueryResponse({
            sessionId: session.id,
            nmId: routingResult.primary,
            content: `Response from ${primaryNM.id}: Based on my specialization in ${primaryNM.capabilities.join(', ')}, here is my analysis of your query: "${requestData.originalQuery}". This response demonstrates the capabilities of the ADP protocol in routing queries to specialized narrow models.`,
            confidenceMetrics: {
              overallConfidence: primaryNM.accuracyScore,
              domainMatch: 0.95,
              factualConfidence: primaryNM.accuracyScore * 0.95
            },
            alignmentAssessment: {
              safetyCheck: "passed",
              biasEvaluation: "low",
              hallucinationRisk: "low",
              harmPotential: "none"
            },
            processingTimeMs: Math.max(100, processingTime),
            tokensUsed: Math.floor(Math.random() * 500 + 200),
            isPrimary: true
          });
          responses.push(response);
          
          // Complete the request (reduce load)
          await adpRouter.completeRequest(routingResult.primary);
        }
      }

      // Validation responses
      for (const validationNmId of routingResult.validation) {
        const validationNM = await storage.getNarrowModel(validationNmId);
        if (validationNM) {
          const processingTime = validationNM.responseTimeAvg + (Math.random() * 200 - 100);
          const response = await storage.createQueryResponse({
            sessionId: session.id,
            nmId: validationNmId,
            content: `Validation response from ${validationNM.id}: I concur with the primary analysis while adding my perspective from ${validationNM.capabilities.join(', ')}. This validation demonstrates the ADP protocol's multi-model verification approach.`,
            confidenceMetrics: {
              overallConfidence: validationNM.accuracyScore,
              domainMatch: 0.88,
              factualConfidence: validationNM.accuracyScore * 0.9
            },
            alignmentAssessment: {
              safetyCheck: "passed",
              biasEvaluation: "low", 
              hallucinationRisk: "low",
              harmPotential: "none"
            },
            processingTimeMs: Math.max(100, processingTime),
            tokensUsed: Math.floor(Math.random() * 300 + 150),
            isPrimary: false
          });
          responses.push(response);
          
          // Complete the request (reduce load)
          await adpRouter.completeRequest(validationNmId);
        }
      }

      // Update session stats
      const totalTime = responses.reduce((sum, r) => sum + r.processingTimeMs, 0);
      const avgTime = responses.length > 0 ? totalTime / responses.length : 0;
      
      await storage.updateQuerySession(session.id, {
        queryCount: session.queryCount + 1,
        totalResponseTime: session.totalResponseTime + totalTime,
        avgResponseTime: session.totalResponseTime + totalTime > 0 
          ? (session.totalResponseTime + totalTime) / (session.queryCount + 1)
          : avgTime
      });

      // Log completion
      await storage.createCoordinationLog({
        eventType: "response",
        sessionId: session.id,
        description: `Query processing completed`,
        metadata: {
          responseCount: responses.length,
          avgProcessingTime: avgTime,
          totalTime: totalTime
        }
      });

      // Broadcast updates to connected clients
      broadcastToClients({
        type: "query_completed",
        sessionId: session.id,
        responses,
        routingResult
      });

      res.json({
        sessionId: session.id,
        routingResult,
        responses
      });

    } catch (error) {
      console.error("Query processing error:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  });

  // Get query session
  app.get("/api/session/:sessionId", async (req, res) => {
    try {
      const session = await storage.getQuerySession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      
      const responses = await storage.getQueryResponsesBySession(session.id);
      res.json({ session, responses });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Get system stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system stats" });
    }
  });

  // Get coordination logs
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const logs = await storage.getCoordinationLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Get preset scenarios
  app.get("/api/scenarios", (req, res) => {
    const scenarios = [
      {
        id: "medical",
        name: "Medical Emergency",
        description: "Cardiology consultation with validation",
        domain: Domain.MEDICAL,
        priority: Priority.URGENT,
        query: "What are the current treatment protocols for atrial fibrillation in elderly patients with comorbidities?"
      },
      {
        id: "legal",
        name: "Contract Review", 
        description: "Legal compliance assessment",
        domain: Domain.LEGAL,
        priority: Priority.HIGH,
        query: "Review this employment contract for compliance with recent labor law changes and identify potential liability issues."
      },
      {
        id: "security",
        name: "Security Audit",
        description: "Network vulnerability analysis", 
        domain: Domain.TECHNICAL,
        priority: Priority.HIGH,
        query: "Analyze our network infrastructure for potential security vulnerabilities and recommend mitigation strategies."
      }
    ];
    
    res.json(scenarios);
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: WSClient = { ws };
    wsClients.add(client);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'join_session') {
          client.sessionId = data.sessionId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      wsClients.delete(client);
    });

    // Send initial system stats
    storage.getSystemStats().then(stats => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'system_stats',
          data: stats
        }));
      }
    });
  });

  // Periodic system updates
  setInterval(async () => {
    try {
      const stats = await storage.getSystemStats();
      const logs = await storage.getCoordinationLogs(5);
      
      broadcastToClients({
        type: 'system_update',
        stats,
        logs
      });
    } catch (error) {
      console.error('Periodic update error:', error);
    }
  }, 5000); // Every 5 seconds

  return httpServer;
}
