import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { JWTPayload } from '@/types/auth';

const AUTH_GATEWAY_RESOLVE_URL = 'https://auth.lanonasis.com/v1/auth/resolve';

type ResolveError = Error & { status?: number };

interface ResolvedIdentity {
  actor_id: string;
  actor_type: string;
  user_id: string;
  organization_id: string;
  access_level?: string;
  api_key_id?: string;
  auth_source?: string;
}

// Unified user type that works with both JWT and Supabase auth
export interface UnifiedUser extends JWTPayload {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  user_id?: string;
  organization_id?: string;
  access_level?: string;
  actor_id?: string;
  actor_type?: string;
  api_key_id?: string;
  auth_source?: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: UnifiedUser;
    }
  }
}

const isStatusError = (error: unknown): error is ResolveError => {
  return error instanceof Error && 'status' in error;
};

const parseJsonSafely = (rawText: string): unknown => {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
};

const extractResolvedIdentity = (responseBody: unknown): ResolvedIdentity | null => {
  if (!responseBody || typeof responseBody !== 'object') {
    return null;
  }

  const responseRecord = responseBody as Record<string, unknown>;
  const identityCandidate =
    responseRecord.identity && typeof responseRecord.identity === 'object'
      ? (responseRecord.identity as Record<string, unknown>)
      : responseRecord;

  const userId = identityCandidate.user_id;
  const organizationId = identityCandidate.organization_id;
  if (typeof userId !== 'string' || typeof organizationId !== 'string') {
    return null;
  }

  const actorId = typeof identityCandidate.actor_id === 'string' ? identityCandidate.actor_id : userId;
  const actorType = typeof identityCandidate.actor_type === 'string' ? identityCandidate.actor_type : 'user';
  const accessLevel =
    typeof identityCandidate.access_level === 'string'
      ? identityCandidate.access_level
      : typeof identityCandidate.role === 'string'
        ? identityCandidate.role
        : undefined;

  return {
    actor_id: actorId,
    actor_type: actorType,
    user_id: userId,
    organization_id: organizationId,
    access_level: accessLevel,
    api_key_id: typeof identityCandidate.api_key_id === 'string' ? identityCandidate.api_key_id : undefined,
    auth_source: typeof identityCandidate.auth_source === 'string' ? identityCandidate.auth_source : undefined,
  };
};

const resolveIdentityFromGateway = async (
  credential: string,
  source: 'bearer' | 'api_key'
): Promise<ResolvedIdentity> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (source === 'api_key') {
    headers['X-API-Key'] = credential;
  } else {
    headers.Authorization = `Bearer ${credential}`;
  }

  const body = JSON.stringify({
    credential,
    type: 'auto',
    platform: 'api',
    ...(source === 'api_key'
      ? { key: credential, api_key: credential }
      : { token: credential }),
  });

  const response = await fetch(AUTH_GATEWAY_RESOLVE_URL, {
    method: 'POST',
    headers,
    body,
  });

  const rawText = await response.text();
  const parsedBody = parseJsonSafely(rawText);

  if (!response.ok) {
    const responseRecord = parsedBody && typeof parsedBody === 'object'
      ? (parsedBody as Record<string, unknown>)
      : null;
    const message =
      (responseRecord?.message as string | undefined) ||
      (responseRecord?.error as string | undefined) ||
      `Auth gateway resolve request failed (${response.status})`;
    const statusError = new Error(message) as ResolveError;
    statusError.status = response.status;
    throw statusError;
  }

  const resolvedIdentity = extractResolvedIdentity(parsedBody);
  if (!resolvedIdentity) {
    throw new Error('Auth gateway resolve response is missing user_id or organization_id');
  }

  return resolvedIdentity;
};

const attachResolvedIdentityToRequest = (
  req: Request,
  resolvedIdentity: ResolvedIdentity,
  fallbackAuthSource: 'api_key' | 'oauth_token'
): void => {
  const accessLevel = resolvedIdentity.access_level || 'authenticated';

  req.user = {
    userId: resolvedIdentity.user_id,
    organizationId: resolvedIdentity.organization_id,
    role: accessLevel,
    plan: 'free',
    id: resolvedIdentity.user_id,
    user_id: resolvedIdentity.user_id,
    organization_id: resolvedIdentity.organization_id,
    access_level: accessLevel,
    actor_id: resolvedIdentity.actor_id,
    actor_type: resolvedIdentity.actor_type,
    api_key_id: resolvedIdentity.api_key_id,
    auth_source: resolvedIdentity.auth_source || fallbackAuthSource,
  };
};

const sendInvalidCredentialResponse = (
  res: Response,
  error: unknown,
  credentialLabel: string
): void => {
  const gatewayStatus = isStatusError(error) ? error.status : undefined;
  const statusCode = gatewayStatus && gatewayStatus >= 500 ? 503 : 401;
  const errorCode = statusCode === 503 ? 'Auth gateway unavailable' : 'Invalid token';
  const message =
    statusCode === 503
      ? 'Authentication service is temporarily unavailable'
      : `The provided ${credentialLabel} is invalid or expired`;

  if (statusCode === 503) {
    logger.error('Auth gateway resolve request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: gatewayStatus,
    });
  } else {
    logger.warn('Invalid credential provided', {
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: gatewayStatus,
      credentialType: credentialLabel,
    });
  }

  res.status(statusCode).json({
    error: errorCode,
    message,
  });
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKey = typeof apiKeyHeader === 'string' ? apiKeyHeader.trim() : '';

    // Priority 1: Authorization: Bearer <token>
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (!token) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Please provide a valid Bearer token or API key'
        });
        return;
      }

      // JWT-style bearer token
      if (token.includes('.')) {
        try {
          const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

          req.user = decoded;

          logger.debug('User authenticated via JWT', {
            userId: decoded.userId,
            organizationId: decoded.organizationId,
            role: decoded.role
          });

          next();
          return;
        } catch (jwtError) {
          logger.warn('Invalid JWT token provided', {
            error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
            token: token.substring(0, 20) + '...'
          });

          res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid or expired'
          });
          return;
        }
      }

      // Opaque bearer token (for example OAuth access tokens)
      try {
        const resolvedIdentity = await resolveIdentityFromGateway(token, 'bearer');
        attachResolvedIdentityToRequest(req, resolvedIdentity, 'oauth_token');

        logger.debug('User authenticated via auth-gateway resolve (opaque bearer)', {
          userId: resolvedIdentity.user_id,
          organizationId: resolvedIdentity.organization_id,
          accessLevel: resolvedIdentity.access_level,
          authSource: resolvedIdentity.auth_source,
        });

        next();
        return;
      } catch (error) {
        sendInvalidCredentialResponse(res, error, 'token');
        return;
      }
    }

    // Priority 2: X-API-Key: <key>
    if (apiKey) {
      try {
        const resolvedIdentity = await resolveIdentityFromGateway(apiKey, 'api_key');
        attachResolvedIdentityToRequest(req, resolvedIdentity, 'api_key');

        logger.debug('User authenticated via auth-gateway resolve (API key)', {
          userId: resolvedIdentity.user_id,
          organizationId: resolvedIdentity.organization_id,
          accessLevel: resolvedIdentity.access_level,
          apiKeyId: resolvedIdentity.api_key_id,
          authSource: resolvedIdentity.auth_source,
        });

        next();
        return;
      } catch (error) {
        sendInvalidCredentialResponse(res, error, 'API key');
        return;
      }
    }

    // No supported credentials provided
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token or API key'
    });
    return;
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
    return;
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

export const requirePlan = (allowedPlans: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`
      });
      return;
    }

    next();
  };
};
