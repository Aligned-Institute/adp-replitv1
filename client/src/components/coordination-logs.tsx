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
    <Card className="card-enhanced animate-slide-in-up" style={{animationDelay: '0.3s'}}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center text-white">
          <div className="w-8 h-8 bg-gradient-adp rounded-lg flex items-center justify-center mr-3 shadow-lg">
            <ClipboardList className="text-white" size={18} />
          </div>
          <div className="flex-1">
            <div className="text-white">Coordination Agent Logs</div>
            <div className="text-xs text-gray-400 font-normal">Real-time system events</div>
          </div>
          <Badge variant="secondary" className="bg-gradient-success text-white px-3 py-1 animate-pulse-glow">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={log.id} className="flex items-start space-x-4 p-4 bg-dark-surface rounded-xl border border-dark-border hover:border-adp-blue transition-all duration-300 animate-slide-in-up" style={{animationDelay: `${index * 0.05}s`}}>
                <div className={`status-dot ${getEventColor(log.eventType)} mt-1 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white capitalize text-sm">
                      {log.eventType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 leading-relaxed">
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
