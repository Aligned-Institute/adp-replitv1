import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Shield } from "lucide-react";
import type { QueryResponse, RoutingResult } from "@shared/schema";

interface QueryResultsProps {
  responses: QueryResponse[];
  routingResult: RoutingResult | null;
}

export function QueryResults({ responses, routingResult }: QueryResultsProps) {
  const [activeTab, setActiveTab] = useState<"primary" | "validation" | "comparison">("primary");

  const primaryResponse = responses.find(r => r.isPrimary);
  const validationResponses = responses.filter(r => !r.isPrimary);

  const getAlignmentColor = (value: string) => {
    switch (value) {
      case "passed":
      case "low":
      case "none":
        return "text-adp-green";
      case "moderate":
        return "text-adp-amber";
      case "high":
      case "flagged":
        return "text-adp-red";
      default:
        return "text-gray-400";
    }
  };

  return (
    <Card className="bg-dark-card border-dark-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-white">
          <MessageSquare className="mr-2 text-adp-blue" size={20} />
          Query Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-4 border-b border-dark-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("primary")}
            className={`pb-2 px-1 border-b-2 ${
              activeTab === "primary" 
                ? "border-adp-blue text-adp-blue" 
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Primary Response
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("validation")}
            className={`pb-2 px-1 border-b-2 ${
              activeTab === "validation" 
                ? "border-adp-blue text-adp-blue" 
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Validation
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("comparison")}
            className={`pb-2 px-1 border-b-2 ${
              activeTab === "comparison" 
                ? "border-adp-blue text-adp-blue" 
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Comparison
          </Button>
        </div>

        {/* Primary Response Content */}
        {activeTab === "primary" && (
          <div className="space-y-4">
            {primaryResponse ? (
              <>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">{primaryResponse.nmId}</span>
                    <Badge variant="secondary" className="bg-adp-green/20 text-adp-green">
                      Confidence: {(primaryResponse.confidenceMetrics.overallConfidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed mb-4">
                    {primaryResponse.content}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Processing Time:</span>
                      <span className="text-white">{primaryResponse.processingTimeMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tokens Used:</span>
                      <span className="text-white">{primaryResponse.tokensUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Domain Match:</span>
                      <span className="text-white">
                        {(primaryResponse.confidenceMetrics.domainMatch * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Factual Confidence:</span>
                      <span className="text-white">
                        {(primaryResponse.confidenceMetrics.factualConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alignment Assessment */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                  <h4 className="text-sm font-semibold mb-3 flex items-center text-white">
                    <Shield className="mr-2 text-adp-green" size={16} />
                    Alignment Assessment
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Safety:</span>
                      <span className={getAlignmentColor(primaryResponse.alignmentAssessment.safetyCheck)}>
                        {primaryResponse.alignmentAssessment.safetyCheck}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bias:</span>
                      <span className={getAlignmentColor(primaryResponse.alignmentAssessment.biasEvaluation)}>
                        {primaryResponse.alignmentAssessment.biasEvaluation}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hallucination:</span>
                      <span className={getAlignmentColor(primaryResponse.alignmentAssessment.hallucinationRisk)}>
                        {primaryResponse.alignmentAssessment.hallucinationRisk}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Harm Potential:</span>
                      <span className={getAlignmentColor(primaryResponse.alignmentAssessment.harmPotential)}>
                        {primaryResponse.alignmentAssessment.harmPotential}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No primary response available</p>
                <p className="text-gray-500 text-sm">Submit a query to see results</p>
              </div>
            )}
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === "validation" && (
          <div className="space-y-4">
            {validationResponses.length > 0 ? (
              validationResponses.map((response) => (
                <div key={response.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">{response.nmId}</span>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                      Validation
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed mb-3">
                    {response.content}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence:</span>
                      <span className="text-white">
                        {(response.confidenceMetrics.overallConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Processing Time:</span>
                      <span className="text-white">{response.processingTimeMs}ms</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No validation responses available</p>
              </div>
            )}
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === "comparison" && (
          <div className="space-y-4">
            {responses.length > 1 ? (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3 text-white">Response Comparison</h4>
                  <div className="space-y-3">
                    {responses.map((response) => (
                      <div key={response.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <span className="text-sm text-white">{response.nmId}</span>
                        <div className="flex space-x-4 text-xs">
                          <span className="text-gray-400">
                            Confidence: <span className="text-white">
                              {(response.confidenceMetrics.overallConfidence * 100).toFixed(0)}%
                            </span>
                          </span>
                          <span className="text-gray-400">
                            Time: <span className="text-white">{response.processingTimeMs}ms</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3 text-white">Consensus Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Confidence:</span>
                      <span className="text-white">
                        {((responses.reduce((sum, r) => sum + r.confidenceMetrics.overallConfidence, 0) / responses.length) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Response Time:</span>
                      <span className="text-white">
                        {Math.round(responses.reduce((sum, r) => sum + r.processingTimeMs, 0) / responses.length)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Multiple responses required for comparison</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
