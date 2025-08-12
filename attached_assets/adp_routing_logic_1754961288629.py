import time
import json
import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class NMStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"

class Domain(Enum):
    MEDICAL = "medical"
    LEGAL = "legal"
    TECHNICAL = "technical"
    FINANCIAL = "financial"
    GENERAL = "general"

@dataclass
class NarrowModel:
    id: str
    domain: Domain
    endpoint: str
    capabilities: List[str]
    weight: float  # Higher weight = more requests (0.1 to 1.0)
    status: NMStatus = NMStatus.HEALTHY
    response_time_avg: float = 0.0  # milliseconds
    accuracy_score: float = 0.9  # 0.0 to 1.0
    last_health_check: float = 0.0
    current_load: int = 0
    max_concurrent: int = 10

@dataclass 
class RoutingRequest:
    message_id: str
    domain: Domain
    priority: str = "normal"  # normal, high, urgent
    preferred_nm_id: Optional[str] = None
    require_validation: bool = True  # For concurrent delegation

class ADPRouter:
    def __init__(self):
        self.nm_registry: Dict[str, NarrowModel] = {}
        self.domain_pools: Dict[Domain, List[str]] = {}
        self.round_robin_indices: Dict[Domain, int] = {}
        self.health_check_interval: float = 30.0  # seconds
        
    def register_nm(self, nm: NarrowModel) -> bool:
        """Register a new Narrow Model in the routing pool"""
        self.nm_registry[nm.id] = nm
        
        # Add to domain pool
        if nm.domain not in self.domain_pools:
            self.domain_pools[nm.domain] = []
            self.round_robin_indices[nm.domain] = 0
            
        if nm.id not in self.domain_pools[nm.domain]:
            self.domain_pools[nm.domain].append(nm.id)
            
        return True
    
    def perform_health_check(self, nm_id: str) -> bool:
        """Perform health check on a specific NM"""
        if nm_id not in self.nm_registry:
            return False
            
        nm = self.nm_registry[nm_id]
        current_time = time.time()
        
        # Mock health check - in real implementation, ping the NM endpoint
        # For demo, randomly simulate some failures
        is_healthy = random.random() > 0.05  # 95% uptime simulation
        
        if is_healthy and nm.current_load < nm.max_concurrent:
            nm.status = NMStatus.HEALTHY
        elif is_healthy and nm.current_load >= nm.max_concurrent:
            nm.status = NMStatus.DEGRADED
        else:
            nm.status = NMStatus.UNAVAILABLE
            
        nm.last_health_check = current_time
        return nm.status == NMStatus.HEALTHY
    
    def get_healthy_nms_in_domain(self, domain: Domain) -> List[str]:
        """Get all healthy NMs in a domain"""
        if domain not in self.domain_pools:
            return []
            
        healthy_nms = []
        for nm_id in self.domain_pools[domain]:
            if nm_id in self.nm_registry:
                nm = self.nm_registry[nm_id]
                
                # Check if health check is needed
                if time.time() - nm.last_health_check > self.health_check_interval:
                    self.perform_health_check(nm_id)
                
                if nm.status in [NMStatus.HEALTHY, NMStatus.DEGRADED]:
                    healthy_nms.append(nm_id)
                    
        return healthy_nms
    
    def calculate_weighted_selection(self, nm_ids: List[str]) -> str:
        """Select NM based on weighted capabilities"""
        if not nm_ids:
            return None
            
        # Calculate weights based on multiple factors
        weighted_candidates = []
        
        for nm_id in nm_ids:
            nm = self.nm_registry[nm_id]
            
            # Base weight from configuration
            total_weight = nm.weight
            
            # Adjust for current performance
            if nm.response_time_avg > 0:
                # Lower weight for slower responses (inverse relationship)
                time_factor = min(1.0, 1000.0 / nm.response_time_avg)  # 1000ms baseline
                total_weight *= time_factor
            
            # Adjust for accuracy
            total_weight *= nm.accuracy_score
            
            # Adjust for current load
            load_factor = max(0.1, 1.0 - (nm.current_load / nm.max_concurrent))
            total_weight *= load_factor
            
            # Penalize degraded status
            if nm.status == NMStatus.DEGRADED:
                total_weight *= 0.5
                
            weighted_candidates.append((nm_id, total_weight))
        
        # Weighted random selection
        total_weight = sum(weight for _, weight in weighted_candidates)
        if total_weight == 0:
            return random.choice(nm_ids)  # Fallback to random
            
        random_value = random.uniform(0, total_weight)
        cumulative = 0
        
        for nm_id, weight in weighted_candidates:
            cumulative += weight
            if random_value <= cumulative:
                return nm_id
                
        return weighted_candidates[-1][0]  # Fallback
    
    def round_robin_selection(self, nm_ids: List[str], domain: Domain) -> str:
        """Select NM using round-robin algorithm"""
        if not nm_ids:
            return None
            
        # Get current index for this domain
        current_index = self.round_robin_indices.get(domain, 0)
        
        # Ensure index is within bounds
        if current_index >= len(nm_ids):
            current_index = 0
            
        selected_nm = nm_ids[current_index]
        
        # Update index for next selection
        self.round_robin_indices[domain] = (current_index + 1) % len(nm_ids)
        
        return selected_nm
    
    def route_request(self, request: RoutingRequest) -> Dict:
        """Main routing function - returns selected NM(s) for delegation"""
        
        # Check for preferred NM first
        if request.preferred_nm_id and request.preferred_nm_id in self.nm_registry:
            nm = self.nm_registry[request.preferred_nm_id]
            if nm.status in [NMStatus.HEALTHY, NMStatus.DEGRADED]:
                if request.require_validation:
                    # Also select backup NMs for validation
                    backup_nms = self._select_validation_nms(request, exclude=[request.preferred_nm_id])
                    return {
                        "primary": request.preferred_nm_id,
                        "validation": backup_nms,
                        "routing_method": "preferred_with_validation"
                    }
                else:
                    return {
                        "primary": request.preferred_nm_id,
                        "validation": [],
                        "routing_method": "preferred_only"
                    }
        
        # Get healthy NMs in domain
        available_nms = self.get_healthy_nms_in_domain(request.domain)
        
        if not available_nms:
            return {
                "primary": None,
                "validation": [],
                "routing_method": "no_available_nms",
                "error": f"No healthy NMs available in domain {request.domain.value}"
            }
        
        # Select primary NM based on priority
        if request.priority == "urgent":
            # Use weighted selection for urgent requests (performance-focused)
            primary_nm = self.calculate_weighted_selection(available_nms)
            routing_method = "weighted_urgent"
        elif request.priority == "high":
            # Hybrid approach - weighted selection from top round-robin candidates
            rr_candidate = self.round_robin_selection(available_nms, request.domain)
            top_candidates = [rr_candidate]
            
            # Add a few more weighted candidates
            weighted_candidate = self.calculate_weighted_selection(available_nms)
            if weighted_candidate != rr_candidate:
                top_candidates.append(weighted_candidate)
                
            primary_nm = self.calculate_weighted_selection(top_candidates)
            routing_method = "hybrid_high"
        else:
            # Normal priority - use round-robin for fair distribution
            primary_nm = self.round_robin_selection(available_nms, request.domain)
            routing_method = "round_robin_normal"
        
        # Select validation NMs if required
        validation_nms = []
        if request.require_validation:
            validation_nms = self._select_validation_nms(request, exclude=[primary_nm])
        
        # Update load tracking
        if primary_nm:
            self.nm_registry[primary_nm].current_load += 1
            
        for val_nm in validation_nms:
            if val_nm in self.nm_registry:
                self.nm_registry[val_nm].current_load += 1
        
        return {
            "primary": primary_nm,
            "validation": validation_nms,
            "routing_method": routing_method,
            "total_available": len(available_nms)
        }
    
    def _select_validation_nms(self, request: RoutingRequest, exclude: List[str], max_validators: int = 2) -> List[str]:
        """Select additional NMs for validation/comparison"""
        available_nms = self.get_healthy_nms_in_domain(request.domain)
        
        # Remove excluded NMs
        candidates = [nm_id for nm_id in available_nms if nm_id not in exclude]
        
        if not candidates:
            return []
        
        # For validation, prefer diverse selection
        validators = []
        
        # Use weighted selection for up to max_validators
        while len(validators) < min(max_validators, len(candidates)):
            validator = self.calculate_weighted_selection(candidates)
            if validator and validator not in validators:
                validators.append(validator)
                candidates.remove(validator)  # Don't select same NM twice
            else:
                break
                
        return validators
    
    def complete_request(self, nm_id: str):
        """Mark request as complete and reduce load"""
        if nm_id in self.nm_registry:
            nm = self.nm_registry[nm_id]
            nm.current_load = max(0, nm.current_load - 1)
    
    def get_routing_stats(self) -> Dict:
        """Get current routing statistics"""
        stats = {
            "total_nms": len(self.nm_registry),
            "domains": {},
            "overall_health": 0
        }
        
        healthy_count = 0
        for domain in Domain:
            domain_nms = self.domain_pools.get(domain, [])
            domain_healthy = sum(1 for nm_id in domain_nms 
                               if nm_id in self.nm_registry 
                               and self.nm_registry[nm_id].status == NMStatus.HEALTHY)
            
            stats["domains"][domain.value] = {
                "total": len(domain_nms),
                "healthy": domain_healthy,
                "degraded": sum(1 for nm_id in domain_nms 
                              if nm_id in self.nm_registry 
                              and self.nm_registry[nm_id].status == NMStatus.DEGRADED),
                "unavailable": sum(1 for nm_id in domain_nms 
                                 if nm_id in self.nm_registry 
                                 and self.nm_registry[nm_id].status == NMStatus.UNAVAILABLE)
            }
            healthy_count += domain_healthy
        
        if len(self.nm_registry) > 0:
            stats["overall_health"] = healthy_count / len(self.nm_registry)
            
        return stats


# Demo usage and testing
if __name__ == "__main__":
    # Initialize router
    router = ADPRouter()
    
    # Register some demo NMs
    demo_nms = [
        NarrowModel("med-cardio-01", Domain.MEDICAL, "https://medical-nm1.example.com", 
                   ["cardiology", "diagnostics"], 0.9, response_time_avg=800.0, accuracy_score=0.95),
        NarrowModel("med-general-01", Domain.MEDICAL, "https://medical-nm2.example.com", 
                   ["general_medicine", "triage"], 0.7, response_time_avg=600.0, accuracy_score=0.88),
        NarrowModel("med-specialist-01", Domain.MEDICAL, "https://medical-nm3.example.com", 
                   ["oncology", "research"], 0.8, response_time_avg=1200.0, accuracy_score=0.97),
        NarrowModel("legal-contract-01", Domain.LEGAL, "https://legal-nm1.example.com", 
                   ["contracts", "compliance"], 0.85, response_time_avg=900.0, accuracy_score=0.92),
    ]
    
    for nm in demo_nms:
        router.register_nm(nm)
    
    # Test routing requests
    print("=== ADP Routing Demo ===\n")
    
    # Test 1: Normal medical request with validation
    request1 = RoutingRequest("req-001", Domain.MEDICAL, "normal", require_validation=True)
    result1 = router.route_request(request1)
    print(f"Medical Request (Normal Priority): {json.dumps(result1, indent=2)}\n")
    
    # Test 2: Urgent medical request
    request2 = RoutingRequest("req-002", Domain.MEDICAL, "urgent", require_validation=True)
    result2 = router.route_request(request2)
    print(f"Medical Request (Urgent Priority): {json.dumps(result2, indent=2)}\n")
    
    # Test 3: Preferred NM request
    request3 = RoutingRequest("req-003", Domain.MEDICAL, "normal", 
                            preferred_nm_id="med-cardio-01", require_validation=True)
    result3 = router.route_request(request3)
    print(f"Medical Request (Preferred NM): {json.dumps(result3, indent=2)}\n")
    
    # Show routing statistics
    stats = router.get_routing_stats()
    print(f"Routing Statistics: {json.dumps(stats, indent=2)}")
