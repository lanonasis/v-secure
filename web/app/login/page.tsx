'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Github, Chrome, Mail, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signInWithProvider, signInWithEmail, getSession, isSupabaseConfigured } from '../lib/supabase';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    // Check if already logged in
    getSession().then((session) => {
      if (session) {
        router.push(redirectTo);
      }
    });

    // Check for messages from URL params
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam));
    }
  }, [router, redirectTo, searchParams]);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    if (!isConfigured) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }
    try {
      setError(null);
      setLoading(provider);
      await signInWithProvider(provider);
    } catch (err) {
      console.error('OAuth login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }

    try {
      setLoading('email');
      await signInWithEmail(email, password);
      router.push(redirectTo);
    } catch (err: unknown) {
      console.error('Email login failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center text-gray-400 hover:text-white transition mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>

      {/* Logo and Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-r from-vortex-blue to-vortex-cyan p-3 rounded-full">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 mt-2">Sign in to your VortexShield account</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 shadow-xl backdrop-blur-sm">
        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-sm text-green-300">{message}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading === 'github'}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white transition disabled:opacity-50"
          >
            {loading === 'github' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Github className="h-5 w-5" />
            )}
            Continue with GitHub
          </button>

          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading === 'google'}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white transition disabled:opacity-50"
          >
            {loading === 'google' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Chrome className="h-5 w-5" />
            )}
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800 px-3 text-gray-400">Or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vortex-cyan focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vortex-cyan focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-vortex-cyan focus:ring-vortex-cyan focus:ring-offset-0"
              />
              <span className="text-sm text-gray-400">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-vortex-cyan hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading === 'email'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            {loading === 'email' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            Sign In
          </button>
        </form>
      </div>

      {/* Sign Up Link */}
      <p className="mt-6 text-center text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-vortex-cyan hover:underline font-medium">
          Start free trial
        </Link>
      </p>

      {/* Security Notice */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Protected by VortexShield Enterprise Security
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-md text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-vortex-cyan border-t-transparent mx-auto mb-4" />
      <p className="text-gray-400">Loading...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
