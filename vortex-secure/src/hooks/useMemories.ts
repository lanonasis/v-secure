// Hook for memories management with real API data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type MemoryCategory = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';
type MemoryStatus = 'active' | 'archived' | 'pinned';

interface Memory {
  id: string;
  title: string;
  content: string;
  memory_type: MemoryCategory;
  status: MemoryStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface MemoryStats {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  recent: number;
  totalSize: number;
}

interface UseMemoriesReturn {
  memories: Memory[];
  stats: MemoryStats;
  loading: boolean;
  error: string | null;
  searchMemories: (query: string) => Promise<Memory[]>;
  createMemory: (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) => Promise<Memory>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMemories(): UseMemoriesReturn {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMemories([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setMemories((data || []).map(mapMemoryFromDB));
    } catch (err: any) {
      setError(err.message);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const stats: MemoryStats = {
    total: memories.length,
    byCategory: {
      context: memories.filter(m => m.memory_type === 'context').length,
      project: memories.filter(m => m.memory_type === 'project').length,
      knowledge: memories.filter(m => m.memory_type === 'knowledge').length,
      reference: memories.filter(m => m.memory_type === 'reference').length,
      personal: memories.filter(m => m.memory_type === 'personal').length,
      workflow: memories.filter(m => m.memory_type === 'workflow').length,
    },
    recent: memories.filter(m => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return new Date(m.updated_at) > dayAgo;
    }).length,
    totalSize: memories.reduce((sum, m) => sum + (m.content?.length || 0), 0),
  };

  const searchMemories = async (query: string): Promise<Memory[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data || []).map(mapMemoryFromDB);
  };

  const createMemory = async (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Promise<Memory> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('memories')
      .insert([{
        user_id: user.id,
        title: memory.title,
        content: memory.content,
        memory_type: memory.memory_type,
        tags: memory.tags || [],
        metadata: memory.metadata || {},
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    const newMemory = mapMemoryFromDB(data);
    setMemories(prev => [newMemory, ...prev]);
    return newMemory;
  };

  const updateMemory = async (id: string, updates: Partial<Memory>): Promise<void> => {
    const { error } = await supabase
      .from('memories')
      .update({
        title: updates.title,
        content: updates.content,
        memory_type: updates.memory_type,
        tags: updates.tags,
        metadata: updates.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    setMemories(prev =>
      prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m)
    );
  };

  const deleteMemory = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  return {
    memories,
    stats,
    loading,
    error,
    searchMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    refresh: fetchMemories,
  };
}

function mapMemoryFromDB(row: any): Memory {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    memory_type: row.memory_type || 'knowledge',
    status: row.status || 'active',
    tags: row.tags || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata,
  };
}

export default useMemories;
