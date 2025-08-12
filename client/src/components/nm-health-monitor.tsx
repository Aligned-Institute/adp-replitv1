import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import type { NarrowModel } from "@shared/schema";

interface NMHealthMonitorProps {
  narrowModels: NarrowModel[];
}

export function NMHealthMonitor({ narrowModels }: NMHealthMonitorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-adp-green";
      case "degraded":
        return "bg-adp-amber";
      case "unavailable":
        return "bg-adp-red";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-adp-green";
      case "degraded":
        return "text-adp-amber";
      case "unavailable":
        return "text-adp-red";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className="bg-dark-card border-dark-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-white">
          <Activity className="mr-2 text-adp-green" size={20} />
          NM Health Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {narrowModels.map((nm) => (
          <div key={nm.id} className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{nm.id}</span>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(nm.status)}`} />
                <span className={`text-xs capitalize ${getStatusTextColor(nm.status)}`}>
                  {nm.status}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Domain:</span>
                <span className="text-white capitalize">{nm.domain}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Accuracy:</span>
                <span className="text-white">{(nm.accuracyScore * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Avg Response:</span>
                <span className="text-white">{nm.responseTimeAvg.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Load:</span>
                <span className="text-white">{nm.currentLoad}/{nm.maxConcurrent}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Weight:</span>
                <span className="text-white">{nm.weight.toFixed(2)}</span>
              </div>
            </div>

            {/* Capabilities */}
            <div className="mt-2">
              <div className="text-xs text-gray-400 mb-1">Capabilities:</div>
              <div className="flex flex-wrap gap-1">
                {nm.capabilities.map((capability) => (
                  <Badge 
                    key={capability} 
                    variant="secondary" 
                    className="text-xs bg-gray-600 text-gray-300"
                  >
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}

        {narrowModels.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No narrow models available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
