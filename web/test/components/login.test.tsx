import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';

// Mock Supabase client
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
  signInWithEmail: vi.fn(),
  signInWithProvider: vi.fn(),
  getSession: vi.fn().mockResolvedValue(null),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  isSupabaseConfigured: () => true,
}));

// Simple component test
describe('Login Page', () => {
  let LoginPage: ComponentType;

  beforeAll(
    async () => {
      ({ default: LoginPage } = await import('@/app/login/page'));
    },
    10000
  );

  it('renders login form elements', async () => {
    render(<LoginPage />);

    // Check for form elements (using actual placeholder text)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has OAuth provider buttons', async () => {
    render(<LoginPage />);

    // Check for OAuth buttons
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('has link to signup page', async () => {
    render(<LoginPage />);

    // Link text is "Start free trial"
    const signupLink = screen.getByRole('link', { name: /start free trial/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });
});
