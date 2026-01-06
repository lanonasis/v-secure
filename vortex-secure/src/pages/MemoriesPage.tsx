// Memories Management Page
// MCP-style interface for managing memory entries and analytics

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Brain,
  MessageSquare,
  FileText,
  Lightbulb,
  Code,
  Bookmark,
  Clock,
  Database,
  RefreshCw,
  Power,
  Trash2,
  Eye,
  Edit,
  Archive,
  Tag,
  Calendar,
  TrendingUp,
  Filter,
  Download,
} from 'lucide-react';

// Memory types
type MemoryCategory = 'conversation' | 'code' | 'document' | 'insight' | 'task' | 'reference' | 'other';
type MemoryStatus = 'active' | 'archived' | 'pinned' | 'expired';

interface Memory {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  status: MemoryStatus;
  tags: string[];
  source: string;
  created_at: string;
  updated_at: string;
  accessed_at?: string;
  access_count: number;
  is_encrypted: boolean;
  size_bytes: number;
  metadata?: Record<string, unknown>;
}

// Icon mapping for categories
const categoryIcons: Record<MemoryCategory, React.ReactNode> = {
  conversation: <MessageSquare className="h-5 w-5" />,
  code: <Code className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
  insight: <Lightbulb className="h-5 w-5" />,
  task: <CheckCircle className="h-5 w-5" />,
  reference: <Bookmark className="h-5 w-5" />,
  other: <Brain className="h-5 w-5" />,
};

const categoryColors: Record<MemoryCategory, string> = {
  conversation: 'bg-blue-100 text-blue-800',
  code: 'bg-purple-100 text-purple-800',
  document: 'bg-green-100 text-green-800',
  insight: 'bg-yellow-100 text-yellow-800',
  task: 'bg-orange-100 text-orange-800',
  reference: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<MemoryCategory, string> = {
  conversation: 'Conversation',
  code: 'Code',
  document: 'Document',
  insight: 'Insight',
  task: 'Task',
  reference: 'Reference',
  other: 'Other',
};

const statusColors: Record<MemoryStatus, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
  pinned: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800',
};

// Mock data for demonstration
const mockMemories: Memory[] = [
  {
    id: '1',
    title: 'API Authentication Flow',
    content: 'Implemented OAuth 2.0 PKCE flow for mobile clients. Key considerations: token refresh, secure storage, and silent auth...',
    category: 'code',
    status: 'pinned',
    tags: ['oauth', 'security', 'mobile'],
    source: 'claude-session',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    accessed_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    access_count: 12,
    is_encrypted: true,
    size_bytes: 2048,
  },
  {
    id: '2',
    title: 'Compliance Requirements Discussion',
    content: 'PCI DSS requirements for handling payment data. Need to implement: encryption at rest, audit logging, access controls...',
    category: 'conversation',
    status: 'active',
    tags: ['compliance', 'pci-dss', 'security'],
    source: 'chat-session',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    accessed_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    access_count: 8,
    is_encrypted: true,
    size_bytes: 4096,
  },
  {
    id: '3',
    title: 'Database Schema Design',
    content: 'User tables, memory entries schema, API keys structure. Foreign key relationships and indexes for performance...',
    category: 'document',
    status: 'active',
    tags: ['database', 'schema', 'postgresql'],
    source: 'documentation',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    access_count: 25,
    is_encrypted: false,
    size_bytes: 8192,
  },
  {
    id: '4',
    title: 'Performance Optimization Ideas',
    content: 'Key insights: 1) Use connection pooling, 2) Implement caching layer, 3) Consider read replicas for heavy queries...',
    category: 'insight',
    status: 'active',
    tags: ['performance', 'optimization', 'architecture'],
    source: 'analysis',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    access_count: 5,
    is_encrypted: false,
    size_bytes: 1536,
  },
  {
    id: '5',
    title: 'Implement MCP Router Integration',
    content: 'TODO: Wire up the MCP router with credential encryption, add health checks, implement rate limiting per service...',
    category: 'task',
    status: 'active',
    tags: ['mcp', 'integration', 'priority'],
    source: 'task-tracker',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    access_count: 3,
    is_encrypted: false,
    size_bytes: 1024,
  },
  {
    id: '6',
    title: 'Supabase RLS Patterns',
    content: 'Reference: Row Level Security policies for multi-tenant applications. auth.uid() patterns, policy examples...',
    category: 'reference',
    status: 'active',
    tags: ['supabase', 'rls', 'security'],
    source: 'external-doc',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    access_count: 18,
    is_encrypted: false,
    size_bytes: 3072,
  },
];

export function MemoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<MemoryStatus | 'all'>('all');
  const [memories, setMemories] = useState<Memory[]>(mockMemories);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Filter memories
  const filteredMemories = memories.filter(memory => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !memory.title.toLowerCase().includes(search) &&
        !memory.content.toLowerCase().includes(search) &&
        !memory.tags.some(tag => tag.toLowerCase().includes(search))
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && memory.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'all' && memory.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  // Calculate stats
  const stats = {
    total: memories.length,
    active: memories.filter(m => m.status === 'active').length,
    pinned: memories.filter(m => m.status === 'pinned').length,
    totalSize: memories.reduce((acc, m) => acc + m.size_bytes, 0),
    encrypted: memories.filter(m => m.is_encrypted).length,
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return d.toLocaleDateString();
  };

  // Actions
  const handlePin = (id: string) => {
    setMemories(prev =>
      prev.map(m =>
        m.id === id ? { ...m, status: m.status === 'pinned' ? 'active' : 'pinned' } : m
      )
    );
  };

  const handleArchive = (id: string) => {
    setMemories(prev =>
      prev.map(m =>
        m.id === id ? { ...m, status: 'archived' } : m
      )
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      setMemories(prev => prev.filter(m => m.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Memories</h1>
          <p className="text-gray-600 mt-1">
            Manage and search your stored memories and knowledge
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Memory
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Memories</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pinned</p>
                <p className="text-3xl font-bold text-purple-600">{stats.pinned}</p>
              </div>
              <Bookmark className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Encrypted</p>
                <p className="text-3xl font-bold text-orange-600">{stats.encrypted}</p>
              </div>
              <Database className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage</p>
                <p className="text-3xl font-bold text-pink-600">{formatSize(stats.totalSize)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search memories, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as MemoryCategory | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="conversation">Conversation</option>
                <option value="code">Code</option>
                <option value="document">Document</option>
                <option value="insight">Insight</option>
                <option value="task">Task</option>
                <option value="reference">Reference</option>
                <option value="other">Other</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as MemoryStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pinned">Pinned</option>
                <option value="archived">Archived</option>
                <option value="expired">Expired</option>
              </select>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMemories.map((memory) => (
          <Card
            key={memory.id}
            className={`relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
              memory.status === 'pinned' ? 'ring-2 ring-purple-500' : ''
            }`}
            onClick={() => setSelectedMemory(memory)}
          >
            {memory.status === 'pinned' && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  <Bookmark className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              </div>
            )}

            {memory.is_encrypted && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  🔒 Encrypted
                </Badge>
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${categoryColors[memory.category].split(' ')[0]}`}>
                  {categoryIcons[memory.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-1">{memory.title}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {categoryLabels[memory.category]}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {memory.content}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {memory.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-2 w-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {memory.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{memory.tags.length - 3}
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Accessed</span>
                  <span className="font-medium">{formatTimeAgo(memory.accessed_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Access Count</span>
                  <span className="font-medium">{memory.access_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Size</span>
                  <span className="font-medium">{formatSize(memory.size_bytes)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePin(memory.id)}
                  className={memory.status === 'pinned' ? 'text-purple-600' : ''}
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(memory.id)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(memory.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMemories.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No memories found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${categoryColors[selectedMemory.category].split(' ')[0]}`}>
                  {categoryIcons[selectedMemory.category]}
                </div>
                <div>
                  <CardTitle className="text-xl">{selectedMemory.title}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">{categoryLabels[selectedMemory.category]}</Badge>
                    <Badge className={statusColors[selectedMemory.status]}>{selectedMemory.status}</Badge>
                    {selectedMemory.is_encrypted && (
                      <Badge className="bg-green-100 text-green-800">🔒 Encrypted</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMemory(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Content</h4>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedMemory.content}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Source</h4>
                    <p className="text-sm">{selectedMemory.source}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Size</h4>
                    <p className="text-sm">{formatSize(selectedMemory.size_bytes)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Created</h4>
                    <p className="text-sm">{formatTimeAgo(selectedMemory.created_at)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Access Count</h4>
                    <p className="text-sm">{selectedMemory.access_count} times</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => handlePin(selectedMemory.id)}>
                    <Bookmark className="h-4 w-4 mr-2" />
                    {selectedMemory.status === 'pinned' ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => handleArchive(selectedMemory.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={() => {
                      handleDelete(selectedMemory.id);
                      setSelectedMemory(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MemoriesPage;
