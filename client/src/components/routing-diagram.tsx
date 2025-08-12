import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, Brain, Combine } from "lucide-react";
import type { RoutingResult, NarrowModel } from "@shared/schema";

interface RoutingDiagramProps {
  routingResult: RoutingResult | null;
  narrowModels: NarrowModel[];
}

export function RoutingDiagram({ routingResult, narrowModels }: RoutingDiagramProps) {
  const getNMById = (id: string) => narrowModels.find(nm => nm.id === id);

  const primaryNM = routingResult?.primary ? getNMById(routingResult.primary) : null;
  const validationNMs = routingResult?.validation?.map(id => getNMById(id)).filter(Boolean) || [];

  return (
    <Card className="bg-dark-card border-dark-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-white">
          <Route className="mr-2 text-adp-blue" size={20} />
          Routing Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Master Controller */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-12 bg-adp-blue/20 border-2 border-adp-blue rounded-lg">
              <div className="text-center">
                <div className="text-xs text-adp-blue font-semibold">Master</div>
                <div className="text-xs text-adp-blue">Controller</div>
              </div>
            </div>
          </div>

          {/* Routing Decision */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gray-700 rounded-lg px-4 py-2">
              <Brain className="text-adp-amber" size={16} />
              <span className="text-sm font-medium text-white">
                {routingResult?.routingMethod?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Awaiting Query"}
              </span>
              {routingResult && (
                <div className="w-2 h-2 bg-adp-green rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Narrow Models Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Primary NM */}
            <div className="space-y-2">
              <div className="text-center text-xs text-gray-400">Primary</div>
              {primaryNM ? (
                <div className="bg-adp-green/20 border-2 border-adp-green rounded-lg p-3 text-center">
                  <div className="text-sm font-semibold text-adp-green">{primaryNM.id}</div>
                  <div className="text-xs text-gray-300">Weight: {primaryNM.weight.toFixed(2)}</div>
                  <div className="text-xs text-gray-300">Load: {primaryNM.currentLoad}/{primaryNM.maxConcurrent}</div>
                  <div className="text-xs text-gray-300">Accuracy: {(primaryNM.accuracyScore * 100).toFixed(0)}%</div>
                </div>
              ) : (
                <div className="bg-gray-600 border border-gray-500 rounded-lg p-3 text-center">
                  <div className="text-sm font-semibold text-gray-400">No Selection</div>
                  <div className="text-xs text-gray-500">Awaiting delegation</div>
                </div>
              )}
            </div>

            {/* Validation NMs */}
            {[0, 1].map((index) => {
              const validationNM = validationNMs[index];
              return (
                <div key={index} className="space-y-2">
                  <div className="text-center text-xs text-gray-400">Validation</div>
                  {validationNM ? (
                    <div className="bg-gray-600 border border-gray-500 rounded-lg p-3 text-center">
                      <div className="text-sm font-semibold text-white">{validationNM.id}</div>
                      <div className="text-xs text-gray-300">Weight: {validationNM.weight.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">Load: {validationNM.currentLoad}/{validationNM.maxConcurrent}</div>
                      <div className="text-xs text-gray-300">Accuracy: {(validationNM.accuracyScore * 100).toFixed(0)}%</div>
                    </div>
                  ) : (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-center">
                      <div className="text-sm font-semibold text-gray-500">Not Selected</div>
                      <div className="text-xs text-gray-600">--</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Results Aggregation */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-purple-500/20 border border-purple-500 rounded-lg px-4 py-2">
              <Combine className="text-purple-400" size={16} />
              <span className="text-sm font-medium text-purple-400">Response Aggregation</span>
            </div>
          </div>

          {/* Routing Stats */}
          {routingResult && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Method:</span>
                  <span className="text-white">{routingResult.routingMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available:</span>
                  <span className="text-white">{routingResult.totalAvailable || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Primary:</span>
                  <span className="text-white">{routingResult.primary || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Validators:</span>
                  <span className="text-white">{routingResult.validation.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
