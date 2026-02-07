/**
 * Login Page Integration Tests
 * 
 * Tests the complete login flow including:
 * - Form rendering and interaction
 * - Email/password authentication
 * - OAuth provider authentication
 * - Error handling
 * - Redirect behavior
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { useRouter } from 'next/navigation';

// Mock Next.js router
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockGetSession = vi.fn();
const mockIsSupabaseConfigured = vi.fn(() => true);

vi.mock('@/app/lib/supabase', () => ({
  signInWithEmail: vi.fn(async (email: string, password: string) => {
    return mockSignInWithPassword(email, password);
  }),
  signInWithProvider: vi.fn(async (provider: string) => {
    return mockSignInWithOAuth(provider);
  }),
  getSession: vi.fn(async () => {
    return mockGetSession();
  }),
  isSupabaseConfigured: mockIsSupabaseConfigured,
}));

describe('Login Page Integration Tests', () => {
  let LoginPage: ComponentType;

  beforeAll(
    async () => {
      ({ default: LoginPage } = await import('@/app/login/page'));
    },
    10000
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('error');
    mockSearchParams.delete('message');
    mockSearchParams.delete('redirect');
    mockGetSession.mockResolvedValue(null);
    mockIsSupabaseConfigured.mockReturnValue(true);
  });

  describe('Form Rendering', () => {
    it('should render all login form elements', async () => {
      render(<LoginPage />);

      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    });

    it('should show error message from URL params', async () => {
      mockSearchParams.set('error', 'Invalid credentials');
      render(<LoginPage />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should show success message from URL params', async () => {
      mockSearchParams.set('message', 'Login successful');
      render(<LoginPage />);

      expect(screen.getByText('Login successful')).toBeInTheDocument();
    });
  });

  describe('Email/Password Authentication', () => {
    it('should successfully login with valid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockPush).toHaveBeenCalledWith('/console');
      });
    });

    it('should display error on invalid credentials', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Invalid login credentials'));

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('should require password', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('should toggle password visibility', async () => {
      render(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput.type).toBe('password');

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(passwordInput.type).toBe('text');
      });
    });
  });

  describe('OAuth Authentication', () => {
    it('should initiate GitHub OAuth flow', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

      render(<LoginPage />);

      const githubButton = screen.getByRole('button', { name: /github/i });
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('github');
      });
    });

    it('should initiate Google OAuth flow', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('google');
      });
    });

    it('should handle OAuth errors', async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error('OAuth failed'));

      render(<LoginPage />);

      const githubButton = screen.getByRole('button', { name: /github/i });
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect to custom redirect URL', async () => {
      mockSearchParams.set('redirect', '/custom-page');
      mockSignInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null,
      });

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-page');
      });
    });

    it('should redirect to console by default', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null,
      });

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/console');
      });
    });

    it('should redirect if already logged in', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/console');
      });
    });
  });

  describe('Configuration Check', () => {
    it('should show error when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/authentication is not configured/i)).toBeInTheDocument();
      });
    });
  });
});
