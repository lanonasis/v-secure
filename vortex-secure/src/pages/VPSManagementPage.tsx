// Vortex Secure - VPS Management Dashboard
import React, { useState, useEffect } from 'react';
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
  PowerOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Lock,
  Unlock,
  Play,
  Square,
  RotateCcw,
  Eye,
  Settings,
  Shield
} from 'lucide-react';

interface VPSServer {
  id: string;
  name: string;
  ip: string;
  location: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  sshStatus: 'connected' | 'timeout' | 'refused' | 'unknown';
  uptime: string;
  load: number;
  memory: { used: number; total: number };
  disk: { used: number; total: number };
  network: { in: number; out: number };
  services: ServiceStatus[];
  lastCheck: string;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port?: number;
  pid?: number;
  memory?: number;
  restart_count?: number;
}

export function VPSManagementPage() {
  const [servers, setServers] = useState<VPSServer[]>([]);
  const [loading, setLoading] = useState(true);
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
    // Mock VPS data - replace with actual API calls
    setTimeout(() => {
      setServers([
        {
          id: 'vps-1',
          name: 'connection-point-main',
          ip: '45.123.456.789',
          location: 'New York, US',
          status: 'online',
          sshStatus: 'timeout',
          uptime: '15d 4h 32m',
          load: 0.65,
          memory: { used: 3.2, total: 8.0 },
          disk: { used: 45.6, total: 80.0 },
          network: { in: 1.2, out: 2.4 },
          lastCheck: new Date().toISOString(),
          services: [
            { name: 'nginx', status: 'running', port: 80, pid: 1234, memory: 45, restart_count: 0 },
            { name: 'node (api)', status: 'stopped', port: 3000, restart_count: 3 },
            { name: 'postgresql', status: 'running', port: 5432, pid: 5678, memory: 120, restart_count: 0 },
            { name: 'redis', status: 'running', port: 6379, pid: 9101, memory: 25, restart_count: 1 },
            { name: 'pm2', status: 'error', restart_count: 2 }
          ]
        },
        {
          id: 'vps-2',
          name: 'backup-server',
          ip: '45.123.456.790',
          location: 'London, UK',
          status: 'online',
          sshStatus: 'connected',
          uptime: '7d 12h 15m',
          load: 0.25,
          memory: { used: 1.8, total: 4.0 },
          disk: { used: 120.5, total: 200.0 },
          network: { in: 0.8, out: 1.1 },
          lastCheck: new Date().toISOString(),
          services: [
            { name: 'nginx', status: 'running', port: 80, pid: 2345, memory: 35 },
            { name: 'backup-sync', status: 'running', pid: 3456, memory: 80 },
            { name: 'monitoring', status: 'running', port: 9090, pid: 4567, memory: 60 }
          ]
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const executeCommand = async (serverId: string, cmd: string) => {
    if (!cmd.trim()) return;
    
    setExecutingCommand(true);
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);
    
    // Mock command execution - replace with actual SSH API
    setTimeout(() => {
      let output = '';
      switch (cmd.toLowerCase()) {
        case 'systemctl status nginx':
          output = '● nginx.service - A high performance web server\n   Loaded: loaded\n   Active: active (running)';
          break;
        case 'pm2 list':
          output = '┌─────┬────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐\n│ id  │ name   │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │\n├─────┼────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤\n│ 0   │ api    │ default     │ 1.0.0   │ fork    │ 0        │ 0      │ 3    │ stopped   │ 0%       │ 0b       │ root     │ disabled │\n└─────┴────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘';
          break;
        case 'pm2 restart api':
          output = '[PM2] Restarting /path/to/api\n[PM2] Process successfully started';
          break;
        case 'free -h':
          output = '              total        used        free      shared  buff/cache   available\nMem:           8.0G        3.2G        1.5G        256M        3.3G        4.5G\nSwap:          2.0G          0B        2.0G';
          break;
        case 'df -h':
          output = 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        80G   46G   31G  60% /\n/dev/sda2       200G  121G   69G  64% /backup';
          break;
        case 'netstat -tlnp | grep :80':
          output = 'tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1234/nginx';
          break;
        default:
          output = `Command '${cmd}' executed on ${serverId}`;
      }
      
      setTerminalOutput(prev => [...prev, output, '']);
      setExecutingCommand(false);
      setCommand('');
    }, 1500);
  };

  const restartService = async (serverId: string, serviceName: string) => {
    setTerminalOutput(prev => [...prev, `$ sudo systemctl restart ${serviceName}`, `Restarting ${serviceName}...`, 'Service restarted successfully', '']);
    
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
    setTerminalOutput(prev => [...prev, 
      '$ sudo systemctl restart sshd',
      'Restarting SSH daemon...',
      '$ sudo ufw allow 2222/tcp',
      'SSH port 2222 opened',
      '$ sudo service networking restart',
      'Network services restarted',
      'SSH connection should be restored',
      ''
    ]);

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