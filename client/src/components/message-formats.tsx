import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import type { RoutingResult, QueryResponse } from "@shared/schema";

interface MessageFormatsProps {
  routingResult: RoutingResult | null;
  responses: QueryResponse[];
}

export function MessageFormats({ routingResult, responses }: MessageFormatsProps) {
  const [activeMessage, setActiveMessage] = useState<"request" | "response" | "log" | "flag">("request");

  const generateRequestMessage = () => {
    return {
      message_type: "delegation_request",
      adp_header: {
        protocol_version: "1.0",
        message_id: "uuid-generated-id",
        timestamp: new Date().toISOString(),
        source: {
          type: "master_controller",
          id: "mc-instance-id"
        },
        destination: {
          type: "narrow_model",
          domain: "medical"
        },
        routing: {
          priority: "normal",
          max_hops: 3,
          timeout_seconds: 30
        }
      },
      payload: {
        original_query: "Treatment protocols for atrial fibrillation...",
        domain_classification: {
          primary_domain: "medical",
          confidence_score: 0.95
        },
        delegation_intent: {
          task_type: "analysis",
          expected_response_format: "text",
          alignment_requirements: ["accuracy", "safety", "bias_awareness"]
        }
      }
    };
  };

  const generateResponseMessage = () => {
    const primaryResponse = responses.find(r => r.isPrimary);
    if (!primaryResponse) {
      return {
        message_type: "delegation_response",
        status: "no_response_available"
      };
    }

    return {
      message_type: "delegation_response",
      adp_header: {
        protocol_version: "1.0",
        message_id: "uuid-generated-id",
        response_to: "original-request-message-id",
        timestamp: new Date(primaryResponse.timestamp).toISOString(),
        source: {
          type: "narrow_model",
          id: primaryResponse.nmId,
          domain: "medical"
        }
      },
      payload: {
        response_content: primaryResponse.content.substring(0, 100) + "...",
        confidence_metrics: {
          overall_confidence: primaryResponse.confidenceMetrics.overallConfidence,
          domain_match: primaryResponse.confidenceMetrics.domainMatch,
          factual_confidence: primaryResponse.confidenceMetrics.factualConfidence
        },
        alignment_assessment: {
          safety_check: primaryResponse.alignmentAssessment.safetyCheck,
          bias_evaluation: primaryResponse.alignmentAssessment.biasEvaluation,
          hallucination_risk: primaryResponse.alignmentAssessment.hallucinationRisk,
          harm_potential: primaryResponse.alignmentAssessment.harmPotential
        },
        metadata: {
          processing_time_ms: primaryResponse.processingTimeMs,
          tokens_used: primaryResponse.tokensUsed,
          human_review_recommended: false
        }
      }
    };
  };

  const generateLogMessage = () => {
    return {
      message_type: "ca_log_entry",
      adp_header: {
        protocol_version: "1.0",
        message_id: "uuid-generated-id",
        timestamp: new Date().toISOString(),
        source: {
          type: "master_controller",
          id: "mc-instance-id"
        },
        destination: {
          type: "coordination_agent",
          organization: "responsible-gov-org"
        }
      },
      log_payload: {
        event_type: "delegation",
        session_tracking: {
          original_request_id: "initial-message-id",
          full_conversation_hash: "privacy-preserving-hash"
        },
        participants: {
          mc_id: "master-controller-id",
          nm_id: routingResult?.primary || "narrow-model-id",
          user_hash: "anonymized-user-identifier"
        },
        alignment_data: {
          flags_raised: [],
          confidence_scores: { accuracy: 0.85, safety: 0.95 },
          human_review_triggered: false,
          remediation_needed: false
        },
        performance_metrics: {
          total_latency_ms: responses[0]?.processingTimeMs || 0,
          routing_accuracy: 0.92,
          user_satisfaction: "pending"
        }
      }
    };
  };

  const generateFlagMessage = () => {
    return {
      message_type: "alignment_flag",
      adp_header: {
        protocol_version: "1.0",
        message_id: "uuid-generated-id",
        timestamp: new Date().toISOString(),
        priority: "high",
        source: {
          type: "narrow_model",
          id: "flagging-entity-id"
        },
        destinations: [
          { type: "coordination_agent", id: "ca-id" },
          { type: "master_controller", id: "mc-id" }
        ]
      },
      flag_payload: {
        alert_type: "bias",
        severity: "moderate",
        related_message_id: "triggering-message-id",
        detection_method: "confidence_threshold",
        flag_details: {
          description: "Potential bias detected in response generation",
          evidence: "Response shows preference for certain demographics",
          affected_domains: ["medical"],
          user_impact: "May provide biased medical recommendations"
        },
        recommended_actions: {
          immediate: ["warn_user", "escalate"],
          investigation: "review training data and model weights",
          remediation: "retrain with bias-corrected dataset"
        }
      }
    };
  };

  const getMessage = () => {
    switch (activeMessage) {
      case "request":
        return generateRequestMessage();
      case "response":
        return generateResponseMessage();
      case "log":
        return generateLogMessage();
      case "flag":
        return generateFlagMessage();
      default:
        return {};
    }
  };

  return (
    <Card className="bg-dark-card border-dark-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-white">
          <Code className="mr-2 text-adp-blue" size={20} />
          ADP Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Message Type Selector */}
        <div className="flex space-x-2 mb-4">
          <Button
            size="sm"
            onClick={() => setActiveMessage("request")}
            className={`text-xs font-medium ${
              activeMessage === "request" 
                ? "bg-adp-blue text-white" 
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}
          >
            Request
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveMessage("response")}
            className={`text-xs font-medium ${
              activeMessage === "response" 
                ? "bg-adp-blue text-white" 
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}
          >
            Response
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveMessage("log")}
            className={`text-xs font-medium ${
              activeMessage === "log" 
                ? "bg-adp-blue text-white" 
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}
          >
            CA Log
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveMessage("flag")}
            className={`text-xs font-medium ${
              activeMessage === "flag" 
                ? "bg-adp-blue text-white" 
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}
          >
            Flag
          </Button>
        </div>

        {/* Message Content */}
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-auto max-h-80">
          <pre className="text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(getMessage(), null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
