// Vortex Secure - VPS Management Dashboard
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Server, 
  Terminal, 
  Wifi, 
  WifiOff,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Lock,
  Play,
  RotateCcw,
  Eye,
  Settings
} from 'lucide-react';
import { vpsAPI, type VPSServer } from '@/lib/vps-api';

export function VPSManagementPage() {
  const [servers, setServers] = useState<VPSServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monitorConfigured, setMonitorConfigured] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [executingCommand, setExecutingCommand] = useState(false);

  useEffect(() => {
    loadVPSData();
    // Refresh every 30 seconds
    const interval = setInterval(loadVPSData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVPSData = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await vpsAPI.getStatus();
      setMonitorConfigured(status.configured);

      const { servers: nextServers, lastUpdated: updatedAt } = await vpsAPI.getServers();
      setServers(nextServers);
      setLastUpdated(updatedAt ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'VPS health data unavailable';
      setError(message);
      setMonitorConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async (serverId: string, cmd: string) => {
    if (!cmd.trim()) return;
    
    setExecutingCommand(true);
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);
    
    try {
      const { output } = await vpsAPI.executeCommand(serverId, cmd);
      setTerminalOutput(prev => [...prev, output, '']);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Command execution failed';
      setTerminalOutput(prev => [...prev, `Error: ${message}`, '']);
    } finally {
      setExecutingCommand(false);
      setCommand('');
    }
  };

  const restartService = async (serverId: string, serviceName: string) => {
    setTerminalOutput(prev => [...prev, `$ sudo systemctl restart ${serviceName}`]);

    try {
      await vpsAPI.restartService(serverId, serviceName);
      setTerminalOutput(prev => [...prev, `Restarting ${serviceName}...`, 'Service restarted successfully', '']);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restart service';
      setTerminalOutput(prev => [...prev, `Error: ${message}`, '']);
    }
    
    // Update service status
    setServers(prev => prev.map(server => 
      server.id === serverId ? {
        ...server,
        services: server.services.map(service => 
          service.name === serviceName ? { ...service, status: 'running' as const } : service
        )
      } : server
    ));
  };

  const fixSSHConnection = async (serverId: string) => {
    setTerminalOutput(prev => [...prev, '$ sudo systemctl restart sshd']);

    try {
      await vpsAPI.fixSSH(serverId);
      setTerminalOutput(prev => [...prev, 
        'Restarting SSH daemon...',
        'SSH connection should be restored',
        ''
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fix SSH connection';
      setTerminalOutput(prev => [...prev, `Error: ${message}`, '']);
    }

    // Update SSH status
    setServers(prev => prev.map(server => 
      server.id === serverId ? { ...server, sshStatus: 'connected' as const } : server
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'running':
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
      case 'stopped':
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
      case 'refused':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'running':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'offline':
      case 'stopped':
      case 'timeout':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
      case 'refused':
        return <Power className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">VPS Management</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPS Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your VPS infrastructure</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            {servers.filter(s => s.status === 'online').length} / {servers.length} Online
          </Badge>
          <Button onClick={loadVPSData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {(error || monitorConfigured === false) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">VPS health data unavailable</h3>
              <p className="text-sm text-red-700 mt-1">
                The VPS monitoring service may be offline or not configured.
              </p>
              {error && (
                <p className="text-xs text-red-600 mt-2">{error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}

      {/* Server Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servers.map((server) => (
          <Card key={server.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Server className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{server.name}</CardTitle>
                    <p className="text-sm text-gray-500">{server.ip} • {server.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs ${getStatusColor(server.status)}`}>
                    {getStatusIcon(server.status)}
                    <span className="ml-1">{server.status}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SSH Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {server.sshStatus === 'connected' ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">SSH Connection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs ${getStatusColor(server.sshStatus)}`}>
                    {server.sshStatus}
                  </Badge>
                  {server.sshStatus !== 'connected' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => fixSSHConnection(server.id)}
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Fix SSH
                    </Button>
                  )}
                </div>
              </div>

              {/* System Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Memory</span>
                    <span className="text-sm font-medium">
                      {server.memory.used.toFixed(1)}GB / {server.memory.total.toFixed(1)}GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(server.memory.used / server.memory.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Disk</span>
                    <span className="text-sm font-medium">
                      {server.disk.used.toFixed(1)}GB / {server.disk.total.toFixed(1)}GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(server.disk.used / server.disk.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <h4 className="text-sm font-medium mb-2">Services</h4>
                <div className="space-y-2">
                  {server.services.map((service, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(service.status)}
                        <span className="text-sm font-medium">{service.name}</span>
                        {service.port && (
                          <Badge variant="outline" className="text-xs">
                            :{service.port}
                          </Badge>
                        )}
                        {service.restart_count > 0 && (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            {service.restart_count} restarts
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {service.status !== 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => restartService(server.id, service.name)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedServer(server.id)}
                >
                  <Terminal className="h-3 w-3 mr-1" />
                  Terminal
                </Button>
                <Button size="sm" variant="outline">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restart
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="h-3 w-3 mr-1" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Terminal Console */}
      {selectedServer && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Terminal - {servers.find(s => s.id === selectedServer)?.name}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedServer(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              {terminalOutput.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
              {executingCommand && (
                <div className="flex items-center">
                  <span className="animate-pulse">Executing...</span>
                </div>
              )}
            </div>
            <div className="flex items-center mt-4 space-x-2">
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command (e.g., pm2 list, systemctl status nginx)"
                className="font-mono"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    executeCommand(selectedServer, command);
                  }
                }}
                disabled={executingCommand}
              />
              <Button 
                onClick={() => executeCommand(selectedServer, command)}
                disabled={executingCommand}
              >
                Execute
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCommand('pm2 list')}
              >
                PM2 Status
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCommand('systemctl status nginx')}
              >
                Nginx Status
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCommand('pm2 restart api')}
              >
                Restart API
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCommand('free -h')}
              >
                Memory Usage
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCommand('df -h')}
              >
                Disk Usage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
