import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Terminal, Send } from "lucide-react";
// Generate UUID for browser compatibility
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import type { SystemStats } from "@shared/schema";

interface QueryInterfaceProps {
  onQuerySubmitted: (sessionId: string) => void;
  currentSession: string | null;
  sessionStats?: SystemStats | null;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  domain: string;
  priority: string;
  query: string;
}

export function QueryInterface({ onQuerySubmitted, currentSession, sessionStats }: QueryInterfaceProps) {
  const [domain, setDomain] = useState("medical");
  const [priority, setPriority] = useState("normal");
  const [query, setQuery] = useState("What are the current treatment protocols for atrial fibrillation in elderly patients?");
  const { toast } = useToast();

  const { data: scenarios } = useQuery<Scenario[]>({
    queryKey: ["/api/scenarios"],
  });

  const processQueryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/query", data);
      return await response.json();
    },
    onSuccess: (data) => {
      onQuerySubmitted(data.sessionId);
      toast({
        title: "Query Processed",
        description: "Your query has been delegated and processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a query to process.",
        variant: "destructive",
      });
      return;
    }

    processQueryMutation.mutate({
      domain,
      priority,
      originalQuery: query,
      requireValidation: true,
      sessionId: currentSession || generateUUID()
    });
  };

  const loadScenario = (scenario: Scenario) => {
    setDomain(scenario.domain);
    setPriority(scenario.priority);
    setQuery(scenario.query);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Query Input */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-white">
            <Terminal className="mr-2 text-adp-blue" size={20} />
            Query Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">Query</Label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-700 border-gray-600 text-white h-24 resize-none"
                placeholder="Enter your query here..."
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-adp-blue hover:bg-blue-600 text-white"
              disabled={processQueryMutation.isPending}
            >
              {processQueryMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="mr-2" size={16} />
                  Process Query
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preset Scenarios */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-300">Demo Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scenarios?.map((scenario) => (
            <Button
              key={scenario.id}
              variant="ghost"
              className="w-full text-left bg-gray-700 hover:bg-gray-600 p-3 h-auto justify-start"
              onClick={() => loadScenario(scenario)}
            >
              <div className="w-full">
                <div className="font-medium text-white">{scenario.name}</div>
                <div className="text-gray-400 text-xs">{scenario.description}</div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Current Session */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-300">Session Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session ID:</span>
            <span className="font-mono text-xs text-white">
              {currentSession ? currentSession.slice(0, 12) + "..." : "None"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Queries:</span>
            <span className="text-white">{sessionStats?.totalQueries || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Avg Response:</span>
            <span className="text-white">{sessionStats?.avgResponseTime || 0}ms</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
