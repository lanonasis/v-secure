// Memories Management Page
// Interface for managing memory entries with real data

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Brain,
  MessageSquare,
  FileText,
  Lightbulb,
  Code,
  Bookmark,
  Database,
  RefreshCw,
  Trash2,
  Eye,
  Edit,
  TrendingUp,
  Filter,
  Download,
} from 'lucide-react';
import { useMemories } from '../hooks/useMemories';

// Memory types - aligned with database schema
type MemoryCategory = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';

// Icon mapping for categories
const categoryIcons: Record<MemoryCategory, React.ReactNode> = {
  context: <MessageSquare className="h-5 w-5" />,
  project: <Code className="h-5 w-5" />,
  knowledge: <Lightbulb className="h-5 w-5" />,
  reference: <Bookmark className="h-5 w-5" />,
  personal: <FileText className="h-5 w-5" />,
  workflow: <Brain className="h-5 w-5" />,
};

const categoryColors: Record<MemoryCategory, string> = {
  context: 'bg-blue-100 text-blue-800',
  project: 'bg-purple-100 text-purple-800',
  knowledge: 'bg-yellow-100 text-yellow-800',
  reference: 'bg-pink-100 text-pink-800',
  personal: 'bg-green-100 text-green-800',
  workflow: 'bg-orange-100 text-orange-800',
};

const categoryLabels: Record<MemoryCategory, string> = {
  context: 'Context',
  project: 'Project',
  knowledge: 'Knowledge',
  reference: 'Reference',
  personal: 'Personal',
  workflow: 'Workflow',
};

export function MemoriesPage() {
  const { memories, stats, loading, error, deleteMemory, refresh } = useMemories();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');

  // Filter memories
  const filteredMemories = memories.filter(memory => {
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
    if (selectedCategory !== 'all' && memory.memory_type !== selectedCategory) {
      return false;
    }
    return true;
  });

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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      try {
        await deleteMemory(id);
      } catch (err) {
        console.error('Failed to delete memory:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Memories</h1>
            <p className="text-gray-600 mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Memories</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error loading memories</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <p className="text-sm font-medium text-gray-600">Recent (24h)</p>
                <p className="text-3xl font-bold text-green-600">{stats.recent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-3xl font-bold text-purple-600">{stats.byCategory.project}</p>
              </div>
              <Code className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Knowledge</p>
                <p className="text-3xl font-bold text-orange-600">{stats.byCategory.knowledge}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-orange-600" />
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search memories..."
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
                {Object.keys(categoryLabels).map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat as MemoryCategory]}</option>
                ))}
              </select>

              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memories Grid */}
      <div className="grid gap-4">
        {filteredMemories.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No memories found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first memory'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMemories.map((memory) => (
            <Card key={memory.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {memory.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={categoryColors[memory.memory_type]}>
                        {categoryIcons[memory.memory_type]}
                        <span className="ml-1">{categoryLabels[memory.memory_type]}</span>
                      </Badge>
                      {memory.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(memory.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600 line-clamp-2">{memory.content}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <div className="font-medium">{formatTimeAgo(memory.updated_at)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <div className="font-medium">{formatTimeAgo(memory.created_at)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
