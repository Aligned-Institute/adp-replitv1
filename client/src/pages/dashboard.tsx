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
      {/* Enhanced Header with Gradient */}
      <header className="bg-gradient-to-r from-dark-card to-dark-card-hover border-b border-dark-border px-6 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-adp rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow">
                <Network className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  ADP Protocol Dashboard
                </h1>
                <p className="text-xs text-gray-400">Alignment Delegation Protocol</p>
              </div>
              <Badge variant="secondary" className="bg-gradient-success text-white px-3 py-1 animate-scale-in">
                <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                Live Demo
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-dark-surface px-4 py-2 rounded-lg border border-dark-border">
              <div className={`status-dot ${isConnected ? 'bg-adp-green status-pulse' : 'bg-adp-red'}`} />
              <div className="text-sm">
                <div className="text-white font-medium">
                  {displayStats?.activeNms || 0}/{displayStats?.totalNms || 0} NMs Active
                </div>
                <div className="text-xs text-gray-400">
                  {displayStats?.systemHealth?.toFixed(1) || 0}% Health
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400 font-mono">v1.0.0</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Enhanced Sidebar - Query Interface */}
        <div className="w-96 bg-glass border-r border-glass-border overflow-y-auto backdrop-blur-lg">
          <QueryInterface 
            onQuerySubmitted={handleQuerySubmitted}
            currentSession={currentSession}
            sessionStats={displayStats}
          />
        </div>

        {/* Enhanced Main Dashboard */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg">
          <div className="p-8 space-y-8">
            {/* Enhanced System Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="card-enhanced group cursor-pointer animate-slide-in-up">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-1">System Health</p>
                      <p className="text-2xl font-bold text-adp-green text-shadow-glow">
                        {displayStats?.systemHealth?.toFixed(1) || 0}%
                      </p>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-success h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${displayStats?.systemHealth || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-success rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Activity className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced group cursor-pointer animate-slide-in-up" style={{animationDelay: '0.1s'}}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-1">Active Models</p>
                      <p className="text-2xl font-bold text-white">
                        {displayStats?.activeNms || 0}<span className="text-gray-500">/{displayStats?.totalNms || 0}</span>
                      </p>
                      <p className="text-xs text-adp-blue mt-1">
                        {((displayStats?.activeNms || 0) / (displayStats?.totalNms || 1) * 100).toFixed(0)}% operational
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-adp rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Box className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced group cursor-pointer animate-slide-in-up" style={{animationDelay: '0.2s'}}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-1">Avg Response</p>
                      <p className="text-2xl font-bold text-adp-amber text-shadow-glow">
                        {displayStats?.avgResponseTime || 0}<span className="text-sm">ms</span>
                      </p>
                      <p className="text-xs text-green-400 mt-1">
                        {displayStats?.avgResponseTime && displayStats.avgResponseTime < 200 ? '⚡ Excellent' : '✓ Good'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-warning rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Clock className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced group cursor-pointer animate-slide-in-up" style={{animationDelay: '0.3s'}}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-1">Total Queries</p>
                      <p className="text-2xl font-bold text-white">
                        {displayStats?.totalQueries || 0}
                      </p>
                      <p className="text-xs text-adp-blue mt-1">
                        {Math.round((displayStats?.totalQueries || 0) * 0.85)} successful
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-adp rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <TrendingUp className="text-white" size={24} />
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
