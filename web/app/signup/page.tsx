'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Github, Mail, Chrome, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { signInWithProvider, signUpWithEmail, isSupabaseConfigured } from '../lib/supabase';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isConfigured = isSupabaseConfigured();

  const handleOAuthSignUp = async (provider: 'github' | 'google') => {
    if (!isConfigured) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }
    try {
      setError(null);
      setLoading(provider);
      await signInWithProvider(provider);
    } catch (err) {
      console.error('OAuth signup failed:', err);
      setError('Sign up failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading('email');
      await signUpWithEmail(email, password, {
        full_name: fullName,
        company,
      });
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Email signup failed:', err);
      const message = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setError(message);
    } finally {
      setLoading(null);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-500/20 border border-green-500/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Check Your Email</h1>
          <p className="text-gray-300 mb-8">
            We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>.
            Please check your inbox and click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center text-vortex-cyan hover:text-vortex-blue transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
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
          <h1 className="text-3xl font-bold text-white">Create Your Account</h1>
          <p className="text-gray-400 mt-2">Start your 14-day free trial</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 shadow-xl backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthSignUp('github')}
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
              onClick={() => handleOAuthSignUp('google')}
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
              <span className="bg-slate-800 px-3 text-gray-400">Or sign up with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vortex-cyan focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
                Company (Optional)
              </label>
              <input
                id="company"
                type="text"
                placeholder="Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vortex-cyan focus:border-transparent"
              />
            </div>

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
              <input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vortex-cyan focus:border-transparent"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vortex-cyan focus:border-transparent"
                required
              />
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
              Create Account
            </button>
          </form>

          {/* Terms */}
          <p className="mt-6 text-xs text-center text-gray-400">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-vortex-cyan hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-vortex-cyan hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-vortex-cyan hover:underline font-medium">
            Sign in
          </Link>
        </p>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Free Trial', value: '14 days' },
            { label: 'No Credit Card', value: 'Required' },
            { label: 'Cancel', value: 'Anytime' },
          ].map((item, i) => (
            <div key={i} className="text-gray-400">
              <div className="text-sm">{item.label}</div>
              <div className="text-xs text-gray-500">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
