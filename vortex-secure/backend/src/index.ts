// Vortex Secure - SuperTokens Express Backend
// Based on the official SuperTokens tutorial

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import supertokens from 'supertokens-node';
import { middleware, errorHandler } from 'supertokens-node/framework/express/index.js';
import { verifySession } from 'supertokens-node/recipe/session/framework/express/index.js';
import { SessionRequest } from 'supertokens-node/framework/express/index.js';
import { initSuperTokens, appInfo } from './config.js';

// Initialize SuperTokens
initSuperTokens();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for SuperTokens
app.use(
  cors({
    origin: appInfo.websiteDomain,
    allowedHeaders: ['content-type', ...supertokens.getAllCORSHeaders()],
    credentials: true
  })
);

// Parse JSON bodies
app.use(express.json());

// SuperTokens middleware - adds /auth/* routes automatically
// This provides:
// - POST /auth/signup - Sign up with email/password
// - POST /auth/signin - Sign in with email/password
// - POST /auth/signout - Sign out
// - POST /auth/session/refresh - Refresh access token
// - GET /auth/session/data - Get session data
app.use(middleware());

// ============================================
// Public Routes (no authentication required)
// ============================================

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Vortex Secure Auth API',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      auth: '/auth/*',
      session: '/session-info',
      health: '/health'
    }
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Protected Routes (authentication required)
// ============================================

// Session info endpoint - demonstrates protected route pattern
// Uses verifySession middleware to ensure user is authenticated
app.get('/session-info', verifySession(), async (req: SessionRequest, res: Response) => {
  const session = req.session;

  if (!session) {
    return res.status(401).json({ error: 'No session found' });
  }

  // Get session information
  const userId = session.getUserId();
  const sessionHandle = session.getHandle();
  const accessTokenPayload = session.getAccessTokenPayload();

  res.json({
    sessionHandle,
    userId,
    accessTokenPayload,
    message: 'You have successfully accessed a protected route!'
  });
});

// Get current user profile
app.get('/api/me', verifySession(), async (req: SessionRequest, res: Response) => {
  const session = req.session;

  if (!session) {
    return res.status(401).json({ error: 'No session found' });
  }

  const userId = session.getUserId();

  // In a real application, you would fetch user data from your database
  res.json({
    id: userId,
    // Additional user data would come from your database
    message: 'Authenticated user profile'
  });
});

// Protected API example - list secrets (demo)
app.get('/api/secrets', verifySession(), async (req: SessionRequest, res: Response) => {
  const session = req.session;

  if (!session) {
    return res.status(401).json({ error: 'No session found' });
  }

  const userId = session.getUserId();

  // Demo response - in production, query your database
  res.json({
    userId,
    secrets: [
      {
        id: 'demo-1',
        name: 'API_KEY',
        environment: 'development',
        status: 'active'
      },
      {
        id: 'demo-2',
        name: 'DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
        environment: 'production',
        status: 'active'
      }
    ],
    message: 'Protected secrets list accessed successfully'
  });
});

// ============================================
// Error Handling
// ============================================

// SuperTokens error handler - must be after all routes
app.use(errorHandler());

// Generic error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🔐 Vortex Secure Auth Server                          ║
║                                                            ║
║     Server running on: http://localhost:${PORT}              ║
║     Auth endpoints:    http://localhost:${PORT}/auth/*       ║
║     Protected route:   http://localhost:${PORT}/session-info ║
║                                                            ║
║     SuperTokens Core: ${process.env.SUPERTOKENS_CONNECTION_URI || 'try.supertokens.com (demo)'}
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
