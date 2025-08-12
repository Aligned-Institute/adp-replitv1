import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { QueryInterface } from "@/components/query-interface";
import { RoutingDiagram } from "@/components/routing-diagram";
import { NMHealthMonitor } from "@/components/nm-health-monitor";
import { QueryResults } from "@/components/query-results";
import { MessageFormats } from "@/components/message-formats";
import { CoordinationLogs } from "@/components/coordination-logs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Network, 
  Activity, 
  Box, 
  Clock, 
  TrendingUp 
} from "lucide-react";
import type { 
  SystemStats, 
  QueryResponse, 
  RoutingResult, 
  CoordinationLog,
  NarrowModel 
} from "@shared/schema";

export default function Dashboard() {
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [queryResponses, setQueryResponses] = useState<QueryResponse[]>([]);
  const [lastRoutingResult, setLastRoutingResult] = useState<RoutingResult | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<CoordinationLog[]>([]);

  // Fetch initial data
  const { data: stats, refetch: refetchStats } = useQuery<SystemStats>({
    queryKey: ["/api/stats"],
  });

  const { data: logs, refetch: refetchLogs } = useQuery<CoordinationLog[]>({
    queryKey: ["/api/logs"],
  });

  const { data: narrowModels } = useQuery<NarrowModel[]>({
    queryKey: ["/api/narrow-models"],
  });

  // WebSocket connection
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (data) => {
      switch (data.type) {
        case "query_completed":
          setQueryResponses(data.responses || []);
          setLastRoutingResult(data.routingResult);
          setCurrentSession(data.sessionId);
          refetchStats();
          refetchLogs();
          break;
        case "system_update":
          if (data.stats) setSystemStats(data.stats);
          if (data.logs) setRecentLogs(data.logs);
          break;
        case "system_stats":
          setSystemStats(data.data);
          break;
      }
    },
    onConnect: () => {
      console.log("WebSocket connected");
    },
    onDisconnect: () => {
      console.log("WebSocket disconnected");
    }
  });

  // Use websocket data if available, otherwise fallback to query data
  const displayStats = systemStats || stats;
  const displayLogs = recentLogs.length > 0 ? recentLogs : (logs || []);

  useEffect(() => {
    if (currentSession) {
      sendMessage({ type: "join_session", sessionId: currentSession });
    }
  }, [currentSession, sendMessage]);

  const handleQuerySubmitted = (sessionId: string) => {
    setCurrentSession(sessionId);
    setQueryResponses([]);
    setLastRoutingResult(null);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-adp-blue rounded-lg flex items-center justify-center">
                <Network className="text-white" size={16} />
              </div>
              <h1 className="text-xl font-semibold">ADP Protocol Dashboard</h1>
              <Badge variant="secondary" className="bg-adp-green/20 text-adp-green">
                Live Demo
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-adp-green animate-pulse' : 'bg-adp-red'}`} />
              <span className="text-gray-300">
                {displayStats?.activeNms || 0}/{displayStats?.totalNms || 0} NMs Active
              </span>
            </div>
            <div className="text-sm text-gray-400">v1.0.0</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Query Interface */}
        <div className="w-80 bg-dark-card border-r border-dark-border overflow-y-auto">
          <QueryInterface 
            onQuerySubmitted={handleQuerySubmitted}
            currentSession={currentSession}
            sessionStats={displayStats}
          />
        </div>

        {/* Main Dashboard */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* System Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-dark-card border-dark-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">System Health</p>
                      <p className="text-lg font-semibold text-adp-green">
                        {displayStats?.systemHealth?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-adp-green/20 rounded-lg flex items-center justify-center">
                      <Activity className="text-adp-green" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-dark-card border-dark-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active NMs</p>
                      <p className="text-lg font-semibold">
                        {displayStats?.activeNms || 0}/{displayStats?.totalNms || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-adp-blue/20 rounded-lg flex items-center justify-center">
                      <Box className="text-adp-blue" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-dark-card border-dark-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Avg Response</p>
                      <p className="text-lg font-semibold">
                        {displayStats?.avgResponseTime || 0}ms
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-adp-amber/20 rounded-lg flex items-center justify-center">
                      <Clock className="text-adp-amber" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-dark-card border-dark-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Queries</p>
                      <p className="text-lg font-semibold">
                        {displayStats?.totalQueries || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-purple-400" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Routing Visualization */}
              <div className="lg:col-span-2">
                <RoutingDiagram 
                  routingResult={lastRoutingResult}
                  narrowModels={narrowModels || []}
                />
              </div>

              {/* NM Health Monitor */}
              <div>
                <NMHealthMonitor narrowModels={narrowModels || []} />
              </div>
            </div>

            {/* Query Results and Message Formats */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Query Results */}
              <QueryResults 
                responses={queryResponses}
                routingResult={lastRoutingResult}
              />

              {/* ADP Message Formats */}
              <MessageFormats 
                routingResult={lastRoutingResult}
                responses={queryResponses}
              />
            </div>

            {/* Coordination Agent Logs */}
            <CoordinationLogs logs={displayLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}
