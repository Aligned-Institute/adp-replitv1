import { 
  type NarrowModel, 
  type RoutingRequest, 
  type RoutingResult,
  Domain,
  NMStatus,
  Priority
} from "@shared/schema";
import { storage } from "../storage";

export class ADPRouter {
  private healthCheckInterval: number = 30000; // 30 seconds
  private roundRobinIndices: Map<string, number> = new Map();

  async performHealthCheck(nmId: string): Promise<boolean> {
    const nm = await storage.getNarrowModel(nmId);
    if (!nm) return false;

    const currentTime = Date.now();
    
    // Mock health check - in real implementation, ping the NM endpoint
    // For demo, randomly simulate some failures
    const isHealthy = Math.random() > 0.05; // 95% uptime simulation
    
    let newStatus: string;
    if (isHealthy && nm.currentLoad < nm.maxConcurrent) {
      newStatus = NMStatus.HEALTHY;
    } else if (isHealthy && nm.currentLoad >= nm.maxConcurrent) {
      newStatus = NMStatus.DEGRADED;
    } else {
      newStatus = NMStatus.UNAVAILABLE;
    }
    
    await storage.updateNarrowModel(nmId, {
      status: newStatus as any,
      lastHealthCheck: currentTime
    });
    
    return newStatus === NMStatus.HEALTHY;
  }

  async getHealthyNMsInDomain(domain: string): Promise<string[]> {
    const domainNMs = await storage.getNarrowModelsByDomain(domain);
    const healthyNMs: string[] = [];
    
    for (const nm of domainNMs) {
      // Check if health check is needed
      if (Date.now() - nm.lastHealthCheck > this.healthCheckInterval) {
        await this.performHealthCheck(nm.id);
        // Refetch the updated NM
        const updatedNM = await storage.getNarrowModel(nm.id);
        if (updatedNM && [NMStatus.HEALTHY, NMStatus.DEGRADED].includes(updatedNM.status as any)) {
          healthyNMs.push(updatedNM.id);
        }
      } else if ([NMStatus.HEALTHY, NMStatus.DEGRADED].includes(nm.status as any)) {
        healthyNMs.push(nm.id);
      }
    }
    
    return healthyNMs;
  }

  async calculateWeightedSelection(nmIds: string[]): Promise<string | null> {
    if (!nmIds.length) return null;
    
    const weightedCandidates: Array<[string, number]> = [];
    
    for (const nmId of nmIds) {
      const nm = await storage.getNarrowModel(nmId);
      if (!nm) continue;
      
      // Base weight from configuration
      let totalWeight = nm.weight;
      
      // Adjust for current performance
      if (nm.responseTimeAvg > 0) {
        // Lower weight for slower responses (inverse relationship)
        const timeFactor = Math.min(1.0, 1000.0 / nm.responseTimeAvg); // 1000ms baseline
        totalWeight *= timeFactor;
      }
      
      // Adjust for accuracy
      totalWeight *= nm.accuracyScore;
      
      // Adjust for current load
      const loadFactor = Math.max(0.1, 1.0 - (nm.currentLoad / nm.maxConcurrent));
      totalWeight *= loadFactor;
      
      // Penalize degraded status
      if (nm.status === NMStatus.DEGRADED) {
        totalWeight *= 0.5;
      }
      
      weightedCandidates.push([nmId, totalWeight]);
    }
    
    // Weighted random selection
    const totalWeight = weightedCandidates.reduce((sum, [, weight]) => sum + weight, 0);
    if (totalWeight === 0) {
      return nmIds[Math.floor(Math.random() * nmIds.length)]; // Fallback to random
    }
    
    const randomValue = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (const [nmId, weight] of weightedCandidates) {
      cumulative += weight;
      if (randomValue <= cumulative) {
        return nmId;
      }
    }
    
    return weightedCandidates[weightedCandidates.length - 1][0]; // Fallback
  }

  roundRobinSelection(nmIds: string[], domain: string): string | null {
    if (!nmIds.length) return null;
    
    // Get current index for this domain
    const currentIndex = this.roundRobinIndices.get(domain) || 0;
    
    // Ensure index is within bounds
    const adjustedIndex = currentIndex >= nmIds.length ? 0 : currentIndex;
    const selectedNm = nmIds[adjustedIndex];
    
    // Update index for next selection
    this.roundRobinIndices.set(domain, (adjustedIndex + 1) % nmIds.length);
    
    return selectedNm;
  }

  getNodeModelAssignment(domain: string, priority: string): number {
    // Round Robin for all Normal priority requests across all domains
    if (priority === Priority.NORMAL) {
      // Use round robin counter for Normal priority
      const currentIndex = this.roundRobinIndices.get('normal_priority') || 0;
      const nodeModel = (currentIndex % 3) + 1; // Cycles between 1, 2, 3
      this.roundRobinIndices.set('normal_priority', currentIndex + 1);
      return nodeModel;
    }
    
    // Custom routing logic for High and Urgent priorities:
    // Medical & Financial: High -> Node 3, Urgent -> Node 2
    // Legal & Technical: High -> Node 3, Urgent -> Node 1
    // All other requests -> Node 2
    
    if (domain === Domain.MEDICAL || domain === Domain.FINANCIAL) {
      if (priority === Priority.HIGH) return 3;
      if (priority === Priority.URGENT) return 2;
    }
    
    if (domain === Domain.LEGAL || domain === Domain.TECHNICAL) {
      if (priority === Priority.HIGH) return 3;
      if (priority === Priority.URGENT) return 1;
    }
    
    // All other requests go to Node Model 2
    return 2;
  }

  selectSpecificNodeModel(availableNMIds: string[], targetNodeModel: number): string | null {
    // Map node model numbers to specific NM patterns
    const nodeModelPatterns: { [key: number]: string[] } = {
      1: ['med-cardio-01', 'fin-trading-01', 'legal-contracts-01', 'tech-ml-01'],
      2: ['med-general-01', 'fin-advisory-01', 'legal-general-01', 'tech-security-01'],
      3: ['fin-risk-01', 'legal-ip-01', 'tech-devops-01']
    };
    
    const targetPatterns = nodeModelPatterns[targetNodeModel] || [];
    
    // First try to find exact match
    for (const pattern of targetPatterns) {
      if (availableNMIds.includes(pattern)) {
        return pattern;
      }
    }
    
    // If no exact match, try to find any NM that could represent this node model
    // For demo purposes, use the first available NM and map it conceptually
    if (availableNMIds.length > 0) {
      // Use modulo to consistently map to the same NM for the same node model
      const index = (targetNodeModel - 1) % availableNMIds.length;
      return availableNMIds[index];
    }
    
    return null;
  }

  async selectValidationNMs(request: RoutingRequest, exclude: string[], maxValidators: number = 2): Promise<string[]> {
    const availableNMs = await this.getHealthyNMsInDomain(request.domain);
    
    // Remove excluded NMs
    const candidates = availableNMs.filter(nmId => !exclude.includes(nmId));
    
    if (!candidates.length) return [];
    
    // For validation, prefer diverse selection
    const validators: string[] = [];
    const candidatesCopy = [...candidates];
    
    // Use weighted selection for up to max_validators
    while (validators.length < Math.min(maxValidators, candidatesCopy.length)) {
      const validator = await this.calculateWeightedSelection(candidatesCopy);
      if (validator && !validators.includes(validator)) {
        validators.push(validator);
        // Remove from candidates to avoid duplicate selection
        const index = candidatesCopy.indexOf(validator);
        if (index > -1) {
          candidatesCopy.splice(index, 1);
        }
      } else {
        break;
      }
    }
    
    return validators;
  }

  async routeRequest(request: RoutingRequest): Promise<RoutingResult> {
    // Check for preferred NM first
    if (request.preferredNmId) {
      const nm = await storage.getNarrowModel(request.preferredNmId);
      if (nm && [NMStatus.HEALTHY, NMStatus.DEGRADED].includes(nm.status as any)) {
        if (request.requireValidation) {
          // Also select backup NMs for validation
          const backupNMs = await this.selectValidationNMs(request, [request.preferredNmId]);
          return {
            primary: request.preferredNmId,
            validation: backupNMs,
            routingMethod: "preferred_with_validation"
          };
        } else {
          return {
            primary: request.preferredNmId,
            validation: [],
            routingMethod: "preferred_only"
          };
        }
      }
    }
    
    // Get healthy NMs in domain
    const availableNMs = await this.getHealthyNMsInDomain(request.domain);
    
    if (!availableNMs.length) {
      return {
        primary: null,
        validation: [],
        routingMethod: "no_available_nms",
        error: `No healthy NMs available in domain ${request.domain}`
      };
    }
    
    // Select primary NM based on priority and domain (Custom Node Model Assignment)
    let primaryNm: string | null;
    let routingMethod: string;
    
    // Custom routing logic based on priority and domain
    const targetNodeModel = this.getNodeModelAssignment(request.domain, request.priority);
    primaryNm = this.selectSpecificNodeModel(availableNMs, targetNodeModel);
    routingMethod = `node_model_${targetNodeModel}_assignment`;
    
    // Fallback if specific node model not available
    if (!primaryNm) {
      primaryNm = await this.calculateWeightedSelection(availableNMs);
      routingMethod = "fallback_weighted";
    }
    
    // Select validation NMs if required
    let validationNMs: string[] = [];
    if (request.requireValidation && primaryNm) {
      validationNMs = await this.selectValidationNMs(request, [primaryNm]);
    }
    
    // Update load tracking
    if (primaryNm) {
      const primaryNmData = await storage.getNarrowModel(primaryNm);
      if (primaryNmData) {
        await storage.updateNarrowModel(primaryNm, {
          currentLoad: primaryNmData.currentLoad + 1
        });
      }
    }
    
    for (const valNm of validationNMs) {
      const valNmData = await storage.getNarrowModel(valNm);
      if (valNmData) {
        await storage.updateNarrowModel(valNm, {
          currentLoad: valNmData.currentLoad + 1
        });
      }
    }
    
    return {
      primary: primaryNm,
      validation: validationNMs,
      routingMethod,
      totalAvailable: availableNMs.length,
      targetNodeModel
    };
  }

  async completeRequest(nmId: string): Promise<void> {
    const nm = await storage.getNarrowModel(nmId);
    if (nm) {
      await storage.updateNarrowModel(nmId, {
        currentLoad: Math.max(0, nm.currentLoad - 1)
      });
    }
  }
}

export const adpRouter = new ADPRouter();
