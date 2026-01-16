// Vortex Secure - Main Application Component
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase, getCurrentUser } from './lib/supabase';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { SecretsPage } from './pages/SecretsPage';
import { MCPMonitoringPage } from './pages/MCPMonitoringPage';
import { VPSManagementPage } from './pages/VPSManagementPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MCPServicesPage } from './pages/MCPServicesPage';
import { APIKeysPage } from './pages/APIKeysPage';
import { MCPUsagePage } from './pages/MCPUsagePage';
import { MemoriesPage } from './pages/MemoriesPage';
import { User } from '@supabase/supabase-js';
import './App.css';

// Demo mode - set to true for testing without Supabase auth
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || true;

// Demo user for testing
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'admin@vortex-secure.demo',
  user_metadata: { name: 'Demo Admin' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

// In production (secureme.lanonasis.com), app is at root
// In development, use /dashboard for local rewrite testing
const DASHBOARD_BASE = import.meta.env.PROD ? '/' : '/dashboard';

function App() {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? DEMO_USER : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return; // Skip auth in demo mode

    // Check initial session
    getCurrentUser().then(user => {
      setUser(user);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Router basename={DASHBOARD_BASE}>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header user={user} />
            
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
              <div className="container mx-auto px-6 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/secrets" element={<SecretsPage />} />
                  <Route path="/mcp-services" element={<MCPServicesPage />} />
                  <Route path="/api-keys" element={<APIKeysPage />} />
                  <Route path="/mcp-usage" element={<MCPUsagePage />} />
                  <Route path="/mcp-monitoring" element={<MCPMonitoringPage />} />
                  <Route path="/vps-management" element={<VPSManagementPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/memories" element={<MemoriesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
