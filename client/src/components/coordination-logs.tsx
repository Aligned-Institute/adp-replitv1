import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import type { CoordinationLog } from "@shared/schema";

interface CoordinationLogsProps {
  logs: CoordinationLog[];
}

export function CoordinationLogs({ logs }: CoordinationLogsProps) {
  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "delegation":
        return "bg-adp-green";
      case "response":
        return "bg-adp-blue";
      case "flag":
        return "bg-adp-amber";
      case "error":
        return "bg-adp-red";
      default:
        return "bg-gray-500";
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="bg-dark-card border-dark-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-white">
          <ClipboardList className="mr-2 text-adp-blue" size={20} />
          Coordination Agent Logs
          <Badge variant="secondary" className="ml-auto bg-gray-600 text-xs">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg text-sm">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getEventColor(log.eventType)}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white capitalize">
                      {log.eventType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">
                    {log.description}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Session: {log.sessionId}
                      {(log.metadata as any).primary && ` | Primary: ${(log.metadata as any).primary}`}
                      {(log.metadata as any).avgProcessingTime && ` | Avg Time: ${(log.metadata as any).avgProcessingTime}ms`}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No coordination logs available</p>
              <p className="text-gray-500 text-sm">Logs will appear as queries are processed</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
