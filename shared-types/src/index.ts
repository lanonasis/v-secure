// Shared TypeScript types and interfaces for Onasis ecosystem

import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'user' | 'service';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Privacy and Data Masking Types
export interface MaskingOptions {
  type: 'email' | 'phone' | 'ssn' | 'credit-card' | 'custom';
  pattern?: string;
  preserveLength?: boolean;
  maskChar?: string;
}

export interface PrivacyConfig {
  enableMasking: boolean;
  defaultMaskChar: string;
  preserveFormat: boolean;
  logLevel: 'none' | 'basic' | 'detailed';
}

// Service Configuration Types
export interface ServiceConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  endpoints: Record<string, string>;
  features: string[];
}

// Database Schema Types
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  schema?: string;
  ssl?: boolean;
}

// Billing and Usage Types
export interface UsageMetrics {
  requests: number;
  dataProcessed: number;
  errors: number;
  timestamp: Date;
}

export interface BillingInfo {
  userId: string;
  planType: 'basic' | 'pro' | 'enterprise';
  usage: UsageMetrics;
  cost: number;
  billingPeriod: {
    start: Date;
    end: Date;
  };
}

// Component Props Types (for UI consistency)
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
