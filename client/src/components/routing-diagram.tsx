import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, Brain, Combine } from "lucide-react";
import type { RoutingResult, NarrowModel } from "@shared/schema";

interface RoutingDiagramProps {
  routingResult: RoutingResult | null;
  narrowModels: NarrowModel[];
  isProcessingQuery?: boolean;
}

export function RoutingDiagram({ routingResult, narrowModels, isProcessingQuery = false }: RoutingDiagramProps) {
  const getNMById = (id: string) => narrowModels.find(nm => nm.id === id);

  const primaryNM = routingResult?.primary ? getNMById(routingResult.primary) : null;
  const validationNMs = routingResult?.validation?.map(id => getNMById(id)).filter(Boolean) || [];
  
  // Determine states based on query processing and results
  const hasQuery = isProcessingQuery || routingResult;
  const isQueryActive = isProcessingQuery;
  const hasResults = routingResult && !isProcessingQuery;

  return (
    <Card className="card-enhanced animate-slide-in-up">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center text-white">
          <div className="w-8 h-8 bg-gradient-adp rounded-lg flex items-center justify-center mr-3 shadow-lg">
            <Route className="text-white" size={18} />
          </div>
          <div>
            <div className="text-white">Routing Visualization</div>
            <div className="text-xs text-gray-400 font-normal">Real-time delegation flow</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Enhanced Master Controller */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-40 h-20 bg-gradient-adp rounded-xl border shadow-lg transition-all duration-500 ${
              isQueryActive ? 'border-adp-green blink-twice-master' : 'border-adp-blue'
            }`}>
              <div className="text-center">
                <div className={`text-sm font-bold transition-colors duration-500 ${
                  isQueryActive ? 'text-adp-green' : 'text-white'
                }`}>Master</div>
                <div className={`text-xs transition-colors duration-500 ${
                  isQueryActive ? 'text-green-200' : 'text-blue-200'
                }`}>Controller</div>
              </div>
            </div>
          </div>

          {/* Enhanced Routing Decision */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-3 bg-dark-surface rounded-xl px-6 py-3 border border-dark-border">
              <Brain className="text-adp-amber" size={20} />
              <span className="text-sm font-semibold text-white">
                {hasQuery 
                  ? (routingResult?.routingMethod?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Query")
                  : "Idle"
                }
              </span>
              {isQueryActive && (
                <div className="w-3 h-3 bg-adp-green rounded-full animate-pulse shadow-lg" />
              )}
              {hasResults && (
                <div className="w-3 h-3 bg-adp-green rounded-full shadow-lg" />
              )}
            </div>
          </div>

          {/* Narrow Models Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Enhanced Primary NM */}
            <div className="space-y-2">
              <div className={`text-center text-sm font-semibold transition-colors duration-500 ${
                isQueryActive ? 'text-adp-green blink-twice-primary' : 'text-gray-300'
              }`}>Primary Model</div>
              {primaryNM ? (
                <div className="bg-gradient-success/20 border-2 border-adp-green rounded-xl p-4 text-center shadow-lg animate-scale-in">
                  <div className="text-sm font-bold text-adp-green">{primaryNM.id}</div>
                  <div className="space-y-1 mt-2">
                    <div className="text-xs text-gray-300">Weight: <span className="font-semibold">{primaryNM.weight.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-300">Load: <span className="font-semibold">{primaryNM.currentLoad}/{primaryNM.maxConcurrent}</span></div>
                    <div className="text-xs text-gray-300">Accuracy: <span className="font-semibold">{(primaryNM.accuracyScore * 100).toFixed(0)}%</span></div>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl p-4 text-center transition-all duration-500 ${
                  isQueryActive 
                    ? 'bg-gradient-success/20 border-2 border-adp-green shadow-lg blink-twice-primary' 
                    : 'bg-dark-surface border border-dark-border'
                }`}>
                  <div className={`text-sm font-semibold transition-colors duration-500 ${
                    isQueryActive ? 'text-adp-green' : 'text-gray-400'
                  }`}>
                    {isQueryActive ? 'Selected' : 'No Selection'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isQueryActive ? 'Processing query...' : 'Awaiting delegation'}
                  </div>
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
