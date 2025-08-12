#!/usr/bin/env python3
"""
ADP (Alignment Delegation Protocol) Demo Script
Complete demonstration of ADP routing, messaging, and delegation

This script creates a realistic demo environment that can be run
on any system with Python 3.7+ for live demonstrations.
"""

import json
import time
import uuid
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import sys

# Import our routing logic
from adp_routing_logic import ADPRouter, NarrowModel, Domain, RoutingRequest, NMStatus

class ADPMessageType(Enum):
    DELEGATION_REQUEST = "delegation_request"
    DELEGATION_RESPONSE = "delegation_response"
    CA_LOG_ENTRY = "ca_log_entry"
    ALIGNMENT_FLAG = "alignment_flag"

@dataclass
class ADPMessage:
    """Base ADP message structure"""
    message_type: str
    adp_header: Dict
    payload: Dict
    
    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, default=str)

class MockNarrowModel:
    """Mock implementation of a Narrow Model for demo purposes"""
    
    def __init__(self, nm_config: NarrowModel):
        self.config = nm_config
        self.specializations = {
            "med-cardio-01": "cardiology and heart conditions",
            "med-general-01": "general medical questions and triage", 
            "med-specialist-01": "oncology and cancer research",
            "legal-contract-01": "contract law and compliance",
            "tech-security-01": "cybersecurity and network protection",
            "financial-risk-01": "financial risk assessment and compliance"
        }
    
    async def process_request(self, request_message: ADPMessage) -> ADPMessage:
        """Simulate processing a delegation request"""
        
        # Simulate processing time based on NM performance
        processing_time = self.config.response_time_avg / 1000.0
        await asyncio.sleep(processing_time)
        
        # Extract query from request
        original_query = request_message.payload.get("original_query", "")
        
        # Generate response based on specialization
        specialization = self.specializations.get(self.config.id, "general analysis")
        
        # Simulate different response qualities based on NM accuracy
        confidence = self.config.accuracy_score + random.uniform(-0.1, 0.05)
        confidence = max(0.1, min(1.0, confidence))
        
        # Create mock response content
        response_content = f"""Based on my specialization in {specialization}, I can provide the following analysis:
        
Query: {original_query}

Analysis: This query falls within my domain expertise. {self._generate_domain_specific_response(original_query)}

Confidence: {confidence:.2f}
Recommendations: {self._generate_recommendations()}
"""
        
        # Check for potential alignment issues
        alignment_flags = self._check_alignment(original_query, response_content)
        
        # Create response message
        response = ADPMessage(
            message_type=ADPMessageType.DELEGATION_RESPONSE.value,
            adp_header={
                "protocol_version": "1.0",
                "message_id": str(uuid.uuid4()),
                "response_to": request_message.adp_header["message_id"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": {
                    "type": "narrow_model",
                    "id": self.config.id,
                    "domain": self.config.domain.value,
                    "model_info": {
                        "name": f"{self.config.id}-v2.1",
                        "specialization": specialization,
                        "last_updated": "2025-07-15"
                    }
                },
                "destination": {
                    "type": "master_controller",
                    "id": request_message.adp_header["source"]["id"]
                }
            },
            payload={
                "response_content": response_content,
                "confidence_metrics": {
                    "overall_confidence": confidence,
                    "domain_match": 0.95 if original_query.lower() in specialization else 0.7,
                    "factual_confidence": confidence * 0.95
                },
                "citations": self._generate_citations(),
                "alignment_assessment": {
                    "safety_check": alignment_flags.get("safety", "passed"),
                    "bias_evaluation": alignment_flags.get("bias", "low"),
                    "hallucination_risk": alignment_flags.get("hallucination", "low"),
                    "harm_potential": alignment_flags.get("harm", "none")
                },
                "metadata": {
                    "processing_time_ms": int(processing_time * 1000),
                    "tokens_used": len(response_content.split()) * 1.3,
                    "fallback_used": False,
                    "human_review_recommended": alignment_flags.get("review_needed", False)
                }
            }
        )
        
        return response
    
    def _generate_domain_specific_response(self, query: str) -> str:
        """Generate domain-specific response content"""
        domain_responses = {
            "medical": "Medical assessment suggests further evaluation may be warranted. Consider consulting with healthcare professionals for personalized advice.",
            "legal": "Legal analysis indicates compliance considerations should be reviewed. Consult qualified legal counsel for specific circumstances.",
            "technical": "Technical evaluation shows standard security protocols should be implemented. Review current infrastructure against best practices.",
            "financial": "Financial risk assessment indicates moderate exposure levels. Consider diversification strategies and regulatory compliance."
        }
        return domain_responses.get(self.config.domain.value, "Standard analysis protocols applied.")
    
    def _generate_recommendations(self) -> str:
        """Generate appropriate recommendations"""
        return f"Based on {self.config.domain.value} best practices, recommend following established protocols and seeking additional expert consultation as needed."
    
    def _generate_citations(self) -> List[Dict]:
        """Generate mock citations"""
        return [
            {
                "source": f"{self.config.domain.value}_standard_v2.1",
                "relevance": 0.9,
                "last_verified": "2025-08-01"
            },
            {
                "source": f"peer_review_{self.config.domain.value}_2025",
                "relevance": 0.85,
                "last_verified": "2025-07-15"
            }
        ]
    
    def _check_alignment(self, query: str, response: str) -> Dict:
        """Simulate alignment checking"""
        flags = {
            "safety": "passed",
            "bias": "low", 
            "hallucination": "low",
            "harm": "none",
            "review_needed": False
        }
        
        # Simulate some alignment concerns for demo
        if "dangerous" in query.lower() or "harm" in query.lower():
            flags["safety"] = "flagged"
            flags["harm"] = "moderate"
            flags["review_needed"] = True
        
        if random.random() < 0.1:  # 10% chance of bias flag for demo
            flags["bias"] = "moderate"
            
        if self.config.accuracy_score < 0.8:
            flags["hallucination"] = "moderate"
            
        return flags

class ADPMasterController:
    """Master Controller implementation for ADP"""
    
    def __init__(self, mc_id: str):
        self.mc_id = mc_id
        self.router = ADPRouter()
        self.mock_nms: Dict[str, MockNarrowModel] = {}
        self.ca_logs: List[ADPMessage] = []
        self.setup_demo_environment()
    
    def setup_demo_environment(self):
        """Set up demo NMs and register them"""
        
        demo_nms = [
            NarrowModel("med-cardio-01", Domain.MEDICAL, "http://localhost:8001", 
                       ["cardiology", "diagnostics"], 0.9, response_time_avg=800.0, accuracy_score=0.95),
            NarrowModel("med-general-01", Domain.MEDICAL, "http://localhost:8002", 
                       ["general_medicine", "triage"], 0.7, response_time_avg=600.0, accuracy_score=0.88),
            NarrowModel("med-specialist-01", Domain.MEDICAL, "http://localhost:8003", 
                       ["oncology", "research"], 0.8, response_time_avg=1200.0, accuracy_score=0.97),
            NarrowModel("legal-contract-01", Domain.LEGAL, "http://localhost:8004", 
                       ["contracts", "compliance"], 0.85, response_time_avg=900.0, accuracy_score=0.92),
            NarrowModel("tech-security-01", Domain.TECHNICAL, "http://localhost:8005", 
                       ["security", "networks"], 0.9, response_time_avg=700.0, accuracy_score=0.94),
            NarrowModel("financial-risk-01", Domain.FINANCIAL, "http://localhost:8006", 
                       ["risk_assessment", "compliance"], 0.8, response_time_avg=1000.0, accuracy_score=0.90)
        ]
        
        for nm_config in demo_nms:
            self.router.register_nm(nm_config)
            self.mock_nms[nm_config.id] = MockNarrowModel(nm_config)
            
        print(f"✅ Registered {len(demo_nms)} Narrow Models in ADP routing pool")
    
    async def process_user_query(self, query: str, domain: str = "medical", priority: str = "normal") -> Dict:
        """Process a user query through ADP delegation"""
        
        print(f"\n🎯 Processing query: '{query}' [Domain: {domain}, Priority: {priority}]")
        
        # Create delegation request
        domain_enum = Domain(domain.lower())
        routing_request = RoutingRequest(
            message_id=str(uuid.uuid4()),
            domain=domain_enum,
            priority=priority,
            require_validation=True
        )
        
        # Route the request
        routing_result = self.router.route_request(routing_request)
        
        if not routing_result["primary"]:
            return {
                "error": "No available NMs for domain",
                "details": routing_result
            }
        
        print(f"📋 Routing result: {routing_result['routing_method']} -> Primary: {routing_result['primary']}")
        if routing_result["validation"]:
            print(f"📋 Validation NMs: {routing_result['validation']}")
        
        # Create ADP request message
        request_message = self._create_delegation_request(query, routing_request, routing_result)
        
        # Process with primary NM
        primary_response = await self.mock_nms[routing_result["primary"]].process_request(request_message)
        
        # Process with validation NMs if any
        validation_responses = []
        for val_nm_id in routing_result["validation"]:
            if val_nm_id in self.mock_nms:
                val_response = await self.mock_nms[val_nm_id].process_request(request_message)
                validation_responses.append(val_response)
        
        # Log to CA
        await self._log_to_ca(request_message, primary_response, validation_responses)
        
        # Clean up routing (mark requests complete)
        self.router.complete_request(routing_result["primary"])
        for val_nm_id in routing_result["validation"]:
            self.router.complete_request(val_nm_id)
        
        # Return complete result
        return {
            "routing": routing_result,
            "request": json.loads(request_message.to_json()),
            "primary_response": json.loads(primary_response.to_json()),
            "validation_responses": [json.loads(vr.to_json()) for vr in validation_responses],
            "summary": self._create_summary(primary_response, validation_responses)
        }
    
    def _create_delegation_request(self, query: str, routing_request: RoutingRequest, routing_result: Dict) -> ADPMessage:
        """Create ADP delegation request message"""
        
        return ADPMessage(
            message_type=ADPMessageType.DELEGATION_REQUEST.value,
            adp_header={
                "protocol_version": "1.0",
                "message_id": routing_request.message_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": f"demo-session-{int(time.time())}",
                "source": {
                    "type": "master_controller",
                    "id": self.mc_id,
                    "organization": "adp-demo-org"
                },
                "destination": {
                    "type": "narrow_model",
                    "domain": routing_request.domain.value,
                    "preferred_nm_id": routing_result["primary"]
                },
                "routing": {
                    "priority": routing_request.priority,
                    "max_hops": 3,
                    "timeout_seconds": 30
                }
            },
            payload={
                "original_query": query,
                "domain_classification": {
                    "primary_domain": routing_request.domain.value,
                    "confidence_score": 0.85,
                    "keywords": query.lower().split()[:5]  # Simple keyword extraction
                },
                "context": {
                    "conversation_history": "Demo session - first query",
                    "user_preferences": "demo_mode",
                    "safety_flags": []
                },
                "delegation_intent": {
                    "task_type": "analysis",
                    "expected_response_format": "text",
                    "alignment_requirements": ["accuracy", "safety", "bias_awareness"]
                }
            }
        )
    
    async def _log_to_ca(self, request: ADPMessage, primary_response: ADPMessage, validation_responses: List[ADPMessage]):
        """Log transaction to Coordination Agent"""
        
        # Check for alignment flags
        alignment_flags = []
        review_needed = False
        
        # Check primary response
        if primary_response.payload["alignment_assessment"]["safety_check"] != "passed":
            alignment_flags.append("safety_concern_primary")
        if primary_response.payload["alignment_assessment"]["harm_potential"] != "none":
            alignment_flags.append("harm_potential_detected")
            review_needed = True
        
        # Create CA log entry
        ca_log = ADPMessage(
            message_type=ADPMessageType.CA_LOG_ENTRY.value,
            adp_header={
                "protocol_version": "1.0",
                "message_id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": {
                    "type": "master_controller",
                    "id": self.mc_id
                },
                "destination": {
                    "type": "coordination_agent",
                    "organization": "adp-demo-govs"
                }
            },
            payload={
                "event_type": "delegation",
                "session_tracking": {
                    "original_request_id": request.adp_header["message_id"],
                    "full_conversation_hash": f"hash-{hash(request.payload['original_query'])}"
                },
                "participants": {
                    "mc_id": self.mc_id,
                    "nm_id": primary_response.adp_header["source"]["id"],
                    "user_hash": "demo-user-12345"
                },
                "alignment_data": {
                    "flags_raised": alignment_flags,
                    "confidence_scores": primary_response.payload["confidence_metrics"],
                    "human_review_triggered": review_needed,
                    "remediation_needed": len(alignment_flags) > 0
                },
                "performance_metrics": {
                    "total_latency_ms": primary_response.payload["metadata"]["processing_time_ms"],
                    "routing_accuracy": 0.92,
                    "user_satisfaction": "pending"
                },
                "privacy_compliance": {
                    "data_retention_days": 90,
                    "anonymization_level": "full",
                    "jurisdiction": "demo"
                }
            }
        )
        
        self.ca_logs.append(ca_log)
        print(f"📝 Logged to CA: {len(alignment_flags)} alignment flags, Review needed: {review_needed}")
    
    def _create_summary(self, primary_response: ADPMessage, validation_responses: List[ADPMessage]) -> Dict:
        """Create human-readable summary of the delegation"""
        
        primary_confidence = primary_response.payload["confidence_metrics"]["overall_confidence"]
        primary_nm = primary_response.adp_header["source"]["id"]
        
        summary = {
            "primary_nm": primary_nm,
            "primary_confidence": f"{primary_confidence:.2%}",
            "alignment_status": "✅ SAFE" if primary_response.payload["alignment_assessment"]["safety_check"] == "passed" else "⚠️ FLAGGED",
            "validation_count": len(validation_responses),
            "processing_time": f"{primary_response.payload['metadata']['processing_time_ms']}ms",
            "recommendation": "Response approved for user" if primary_confidence > 0.8 else "Consider additional review"
        }
        
        if validation_responses:
            val_confidences = [vr.payload["confidence_metrics"]["overall_confidence"] for vr in validation_responses]
            summary["validation_consensus"] = f"{sum(val_confidences) / len(val_confidences):.2%}"
        
        return summary
    
    def get_system_status(self) -> Dict:
        """Get current ADP system status"""
        stats = self.router.get_routing_stats()
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "adp_version": "1.0",
            "master_controller": self.mc_id,
            "routing_stats": stats,
            "ca_logs": len(self.ca_logs),
            "total_transactions": sum(stats["domains"][d]["total"] for d in stats["domains"]),
            "system_health": "🟢 HEALTHY" if stats["overall_health"] > 0.8 else "🟡 DEGRADED" if stats["overall_health"] > 0.5 else "🔴 CRITICAL"
        }

class ADPDemoWebServer:
    """Simple web server for interactive demo"""
    
    def __init__(self, mc: ADPMasterController, port: int = 8000):
        self.mc = mc
        self.port = port
    
    def start_server(self):
        """Start the demo web server"""
        
        class DemoHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/':
                    self.serve_demo_page()
                elif self.path == '/status':
                    self.serve_status()
                elif self.path.startswith('/query'):
                    self.serve_query()
                else:
                    self.send_error(404)
            
            def serve_demo_page(self):
                html = """<!DOCTYPE html>
<html>
<head>
    <title>ADP (Alignment Delegation Protocol) Demo</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: #2c3e50; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .demo-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .query-form { background: #ecf0f1; padding: 15px; border-radius: 8px; }
        input[type="text"] { width: 70%; padding: 8px; margin: 5px; }
        select { padding: 8px; margin: 5px; }
        button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #2980b9; }
        .result { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #28a745; }
        .error { border-left-color: #dc3545; background: #f8d7da; }
        pre { white-space: pre-wrap; font-size: 12px; overflow-x: auto; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .stat-card { background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 ADP (Alignment Delegation Protocol) Live Demo</h1>
            <p>Demonstrating intelligent AI model delegation with alignment oversight</p>
        </div>
        
        <div class="demo-section">
            <h3>🎯 Test ADP Delegation</h3>
            <div class="query-form">
                <form action="/query" method="get">
                    <input type="text" name="q" placeholder="Enter your query (e.g., 'What are symptoms of chest pain?')" required>
                    <select name="domain">
                        <option value="medical">Medical</option>
                        <option value="legal">Legal</option>
                        <option value="technical">Technical</option>
                        <option value="financial">Financial</option>
                    </select>
                    <select name="priority">
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                    <button type="submit">🚀 Delegate Query</button>
                </form>
            </div>
        </div>
        
        <div class="demo-section">
            <h3>📊 System Status</h3>
            <button onclick="loadStatus()">🔄 Refresh Status</button>
            <div id="status-display">Click refresh to load system status...</div>
        </div>
        
        <div class="demo-section">
            <h3>📋 About ADP Protocol</h3>
            <p><strong>ADP Version 1.0</strong> demonstrates:</p>
            <ul>
                <li>🎯 <strong>Intelligent Routing:</strong> Selects best Narrow Models based on domain, load, and performance</li>
                <li>🔄 <strong>Validation:</strong> Multiple NMs process queries for alignment verification</li>
                <li>🛡️ <strong>Safety Monitoring:</strong> Real-time alignment assessment and logging</li>
                <li>⚡ <strong>Load Balancing:</strong> Round-robin and weighted selection algorithms</li>
                <li>🌐 <strong>Interoperability:</strong> Compatible with existing AI communication protocols</li>
            </ul>
        </div>
    </div>
    
    <script>
        function loadStatus() {
            fetch('/status')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('status-display').innerHTML = 
                        '<div class="status-grid">' +
                        '<div class="stat-card"><h4>System Health</h4><p>' + data.system_health + '</p></div>' +
                        '<div class="stat-card"><h4>Total NMs</h4><p>' + data.routing_stats.total_nms + '</p></div>' +
                        '<div class="stat-card"><h4>Overall Health</h4><p>' + (data.routing_stats.overall_health * 100).toFixed(1) + '%</p></div>' +
                        '<div class="stat-card"><h4>CA Logs</h4><p>' + data.ca_logs + '</p></div>' +
                        '</div><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(err => {
                    document.getElementById('status-display').innerHTML = 
                        '<div class="result error">Error loading status: ' + err + '</div>';
                });
        }
    </script>
</body>
</html>"""
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(html.encode())
            
            def serve_status(self):
                status = server.mc.get_system_status()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(status, indent=2).encode())
            
            def serve_query(self):
                parsed_url = urllib.parse.urlparse(self.path)
                params = urllib.parse.parse_qs(parsed_url.query)
                
                query = params.get('q', [''])[0]
                domain = params.get('domain', ['medical'])[0]
                priority = params.get('priority', ['normal'])[0]
                
                if not query:
                    self.send_error(400, "Query parameter 'q' required")
                    return
                
                # Process query asynchronously
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    result = loop.run_until_complete(server.mc.process_user_query(query, domain, priority))
                    loop.close()
                    
                    # Return HTML response
                    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>ADP Query Result</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
        .result {{ background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #28a745; }}
        .summary {{ background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 10px 0; }}
        pre {{ white-space: pre-wrap; font-size: 12px; overflow-x: auto; max-height: 400px; overflow-y: auto; }}
        .back-btn {{ background: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }}
        .status {{ padding: 5px 10px; border-radius: 4px; color: white; display: inline-block; }}
        .safe {{ background: #28a745; }}
        .flagged {{ background: #dc3545; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 ADP Query Result</h1>
        <a href="/" class="back-btn">← Back to Demo</a>
        
        <div class="result">
            <h3>📋 Query Summary</h3>
            <p><strong>Query:</strong> {query}</p>
            <p><strong>Domain:</strong> {domain}</p>
            <p><strong>Priority:</strong> {priority}</p>
            <p><strong>Primary NM:</strong> {result['summary']['primary_nm']}</p>
            <p><strong>Confidence:</strong> {result['summary']['primary_confidence']}</p>
            <p><strong>Status:</strong> <span class="status {'safe' if 'SAFE' in result['summary']['alignment_status'] else 'flagged'}">{result['summary']['alignment_status']}</span></p>
            <p><strong>Processing Time:</strong> {result['summary']['processing_time']}</p>
        </div>
        
        <div class="result">
            <h3>🤖 Primary Response</h3>
            <pre>{result['primary_response']['payload']['response_content']}</pre>
        </div>
        
        {f'''<div class="result">
            <h3>🔍 Validation Responses ({len(result['validation_responses'])})</h3>
            <p><strong>Consensus:</strong> {result['summary'].get('validation_consensus', 'N/A')}</p>
        </div>''' if result['validation_responses'] else ''}
        
        <div class="summary">
            <h3>🔧 Technical Details</h3>
            <p><strong>Routing Method:</strong> {result['routing']['routing_method']}</p>
            <pre>{json.dumps(result, indent=2)}</pre>
        </div>
    </div>
</body>
</html>"""
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(html.encode())
                    
                except Exception as e:
                    error_html = f"""<!DOCTYPE html>
<html><head><title>Error</title></head>
<body><h1>Error Processing Query</h1><p>{str(e)}</p><a href="/">← Back</a></body></html>"""
                    self.send_response(500)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(error_html.encode())
        
        server = self
        httpd = HTTPServer(('localhost', self.port), DemoHandler)
        print(f"\n🌐 ADP Demo Server starting at http://localhost:{self.port}")
        print("🎯 Open your browser to interact with the demo!")
        print("⚡ Press Ctrl+C to stop the server\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Demo server stopped")
            httpd.server_close()

async def run_console_demo():
    """Run console-based demo"""
    print("🚀 ADP (Alignment Delegation Protocol) Console Demo")
    print("=" * 60)
    
    # Initialize Master Controller
    mc = ADPMasterController("demo-mc-001")
    
    # Demo queries
    demo_queries = [
        ("What are the symptoms of chest pain?", "medical", "normal"),
        ("Review this contract for compliance issues", "legal", "high"),
        ("Analyze network security vulnerabilities", "technical", "urgent"),
        ("Assess financial risk exposure", "financial", "normal")
    ]
    
    # Run demo queries
    for i, (query, domain, priority) in enumerate(demo_queries, 1):
        print(f"\n{'='*60}")
        print(f"DEMO QUERY {i}/4")
        print(f"{'='*60}")
        
        result = await mc.process_user_query(query, domain, priority)
        
        print(f"\n📊 SUMMARY:")
        for key, value in result['summary'].items():
            print(f"   {key}: {value}")
        
        print(f"\n🤖 PRIMARY RESPONSE PREVIEW:")
        preview = result['primary_response']['payload']['response_content'][:200] + "..."
        print(f"   {preview}")
        
        # Brief pause between queries
        await asyncio.sleep(1)
    
    # Show final system status
    print(f"\n{'='*60}")
    print("FINAL SYSTEM STATUS")
    print(f"{'='*60}")
    status = mc.get_system_status()
    print(json.dumps(status, indent=2))

def main():
    """Main entry point for ADP demo"""
    print("🤖 ADP (Alignment Delegation Protocol) Demo Launcher")
    print("Choose demo mode:")
    print("1. 🌐 Web Server Demo (Interactive browser interface)")
    print("2. 💻 Console Demo (Automated test scenarios)")
    print("3. 📊 Status Only (Show system status and exit)")
    
    try:
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            # Web server demo
            mc = ADPMasterController("demo-mc-web-001")
            demo_server = ADPDemoWebServer(mc, port=8000)
            demo_server.start_server()
            
        elif choice == "2":
            # Console demo
            asyncio.run(run_console_demo())
            
        elif choice == "3":
            # Status only
            mc = ADPMasterController("demo-mc-status-001")
            status = mc.get_system_status()
            print("\n🎯 ADP System Status:")
            print(json.dumps(status, indent=2))
            
        else:
            print("❌ Invalid choice. Please run again and select 1, 2, or 3.")
            
    except KeyboardInterrupt:
        print("\n\n👋 Demo cancelled by user")
    except Exception as e:
        print(f"\n❌ Demo error: {str(e)}")
        print("\nFor troubleshooting:")
        print("1. Ensure Python 3.7+ is installed")
        print("2. Make sure adp_routing_logic.py is in the same directory")
        print("3. Check that no other service is using port 8000")

if __name__ == "__main__":
    main()