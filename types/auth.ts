import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique user identifier
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "user@example.com"
 *         organization_id:
 *           type: string
 *           format: uuid
 *           description: Organization the user belongs to
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *         role:
 *           type: string
 *           enum: [admin, user, viewer]
 *           description: User's role within the organization
 *           example: "admin"
 *         plan:
 *           type: string
 *           enum: [free, pro, enterprise]
 *           description: User's subscription plan
 *           example: "pro"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *           example: "2025-01-01T12:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last account update timestamp
 *           example: "2025-01-01T12:00:00Z"
 */
export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: 'admin' | 'user' | 'viewer';
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User's password (minimum 8 characters)
 *           example: "securePassword123"
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - organization_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "admin@company.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User's password (minimum 8 characters)
 *           example: "securePassword123"
 *         organization_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Name of the organization to create
 *           example: "Acme Corporation"
 */
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organization_name: z.string().min(2)
});

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 *           description: JWT authentication token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         expires_at:
 *           type: string
 *           format: date-time
 *           description: Token expiration timestamp
 *           example: "2025-01-02T12:00:00Z"
 */
export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  plan: string;
  iat?: number;
  exp?: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     TokenRefreshResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: New JWT authentication token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         expires_at:
 *           type: string
 *           format: date-time
 *           description: Token expiration timestamp
 *           example: "2025-01-02T12:00:00Z"
 */
export interface TokenRefreshResponse {
  token: string;
  expires_at: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error type or code
 *           example: "Validation Error"
 *         message:
 *           type: string
 *           description: Human-readable error message
 *           example: "The provided data is invalid"
 *         details:
 *           type: object
 *           description: Additional error details (optional)
 *           example:
 *             field: "email"
 *             code: "invalid_format"
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;