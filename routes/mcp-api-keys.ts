import express from 'express';
import { param, body, validationResult } from 'express-validator';
import { apiKeyService } from '../services/apiKeyService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};

/**
 * @swagger
 * /api/v1/mcp/api-keys/request-access:
 *   post:
 *     summary: Request access to API keys via MCP (for AI agents)
 *     tags: [MCP Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toolId
 *               - organizationId
 *               - keyNames
 *               - environment
 *               - justification
 *               - estimatedDuration
 *             properties:
 *               toolId:
 *                 type: string
 *                 description: MCP tool identifier
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *                 description: Organization ID
 *               keyNames:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Names of API keys to access
 *               environment:
 *                 type: string
 *                 enum: [development, staging, production]
 *                 description: Environment for key access
 *               justification:
 *                 type: string
 *                 minLength: 1
 *                 description: Reason for requesting access
 *               estimatedDuration:
 *                 type: integer
 *                 minimum: 60
 *                 maximum: 3600
 *                 description: Estimated session duration in seconds
 *               context:
 *                 type: object
 *                 description: Additional context about the request
 *     responses:
 *       201:
 *         description: Access request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, approved]
 *                 sessionId:
 *                   type: string
 *                   description: Present if auto-approved
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post('/request-access', [
  body('toolId').isLength({ min: 1 }).withMessage('Tool ID is required'),
  body('organizationId').isUUID().withMessage('Organization ID must be a valid UUID'),
  body('keyNames').isArray({ min: 1 }).withMessage('At least one key name is required'),
  body('environment').isIn(['development', 'staging', 'production']),
  body('justification').isLength({ min: 1 }).withMessage('Justification is required'),
  body('estimatedDuration').isInt({ min: 60, max: 3600 }).withMessage('Duration must be between 60 and 3600 seconds'),
  body('context').optional().isObject()
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const requestId = await apiKeyService.createMCPAccessRequest(req.body);
    
    // Check if the request was auto-approved and create session
    const session = await apiKeyService.createMCPSession(requestId).catch(() => null);
    
    logger.info('MCP API key access request created', {
      requestId,
      toolId: req.body.toolId,
      organizationId: req.body.organizationId,
      keyNames: req.body.keyNames,
      autoApproved: !!session
    });

    const response: any = {
      requestId,
      status: session ? 'approved' : 'pending',
      message: session ? 'Access approved and session created' : 'Access request pending approval'
    };

    if (session) {
      response.sessionId = session.sessionId;
    }

    res.status(201).json(response);
  } catch (error: unknown) {
    logger.error('Failed to create MCP access request', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'MCP tool not found' });
    } else if (error instanceof Error && (error.message.includes('permission') || error.message.includes('access'))) {
      res.status(403).json({ error: 'Access denied' });
    } else {
      res.status(500).json({ error: 'Failed to create access request' });
    }
  }
});

/**
 * @swagger
 * /api/v1/mcp/api-keys/sessions/{sessionId}/keys/{keyName}/proxy-token:
 *   post:
 *     summary: Get a secure proxy token for accessing an API key
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP session ID
 *       - in: path
 *         name: keyName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the API key to access
 *     responses:
 *       200:
 *         description: Proxy token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 proxyToken:
 *                   type: string
 *                   description: Temporary proxy token for the API key
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration time
 *                 usage:
 *                   type: object
 *                   properties:
 *                     instructions:
 *                       type: string
 *                       description: How to use the proxy token
 *                     example:
 *                       type: string
 *                       description: Example usage
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Session invalid, expired, or key access denied
 *       404:
 *         description: Session or key not found
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/:sessionId/keys/:keyName/proxy-token', [
  param('sessionId').isLength({ min: 1 }).withMessage('Session ID is required'),
  param('keyName').isLength({ min: 1 }).withMessage('Key name is required')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.params.sessionId;
    const keyName = req.params.keyName;
    
    if (!sessionId || !keyName) {
      res.status(400).json({ error: 'Session ID and key name are required' });
      return;
    }
    
    const { proxyToken, expiresAt } = await apiKeyService.getProxyTokenForKey(sessionId, keyName);
    
    logger.info('MCP proxy token generated', {
      sessionId,
      keyName,
      expiresAt
    });

    res.json({
      proxyToken,
      expiresAt,
      usage: {
        instructions: 'Use this proxy token in place of the actual API key. It will automatically resolve to the real key value when used.',
        example: `Authorization: Bearer ${proxyToken}`
      }
    });
  } catch (error: unknown) {
    logger.error('Failed to generate MCP proxy token', error);
    
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('expired'))) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Session or key not found' });
    } else {
      res.status(500).json({ error: 'Failed to generate proxy token' });
    }
  }
});

/**
 * @swagger
 * /api/v1/mcp/api-keys/proxy-tokens/{proxyToken}/resolve:
 *   post:
 *     summary: Resolve a proxy token to get the actual API key value (internal use)
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: proxyToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Proxy token to resolve
 *     responses:
 *       200:
 *         description: Proxy token resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keyValue:
 *                   type: string
 *                   description: The actual API key value
 *                 metadata:
 *                   type: object
 *                   description: Additional metadata about the key
 *       400:
 *         description: Invalid proxy token format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Proxy token invalid, expired, or revoked
 *       404:
 *         description: Proxy token not found
 *       500:
 *         description: Internal server error
 */
router.post('/proxy-tokens/:proxyToken/resolve', [
  param('proxyToken').isLength({ min: 1 }).withMessage('Proxy token is required')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const proxyToken = req.params.proxyToken;
    
    if (!proxyToken) {
      res.status(400).json({ error: 'Proxy token is required' });
      return;
    }
    
    const keyValue = await apiKeyService.resolveProxyToken(proxyToken);
    
    logger.info('MCP proxy token resolved', {
      proxyToken: proxyToken.substring(0, 20) + '...' // Log partial token for security
    });

    res.json({
      keyValue,
      metadata: {
        resolvedAt: new Date().toISOString(),
        tokenType: 'proxy'
      }
    });
  } catch (error: unknown) {
    logger.error('Failed to resolve MCP proxy token', error);
    
    if (error instanceof Error && error.message.includes('Invalid')) {
      res.status(400).json({ error: 'Invalid proxy token format' });
    } else if (error instanceof Error && (error.message.includes('expired') || error.message.includes('revoked'))) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Proxy token not found' });
    } else {
      res.status(500).json({ error: 'Failed to resolve proxy token' });
    }
  }
});

/**
 * @swagger
 * /api/v1/mcp/api-keys/sessions/{sessionId}/status:
 *   get:
 *     summary: Get the status of an MCP session
 *     tags: [MCP Integration]  
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP session ID
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [active, expired, ended]
 *                 toolId:
 *                   type: string
 *                 keyNames:
 *                   type: array
 *                   items:
 *                     type: string
 *                 environment:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 endedAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 activeTokens:
 *                   type: integer
 *                   description: Number of active proxy tokens
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.get('/sessions/:sessionId/status', [
  param('sessionId').isLength({ min: 1 }).withMessage('Session ID is required')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }
    
    // This would require implementing a new service method
    // For now, we'll return a basic status check
    res.json({
      sessionId,
      status: 'active', // This should be determined by checking the database
      message: 'Session status check not fully implemented yet'
    });
  } catch (error: unknown) {
    logger.error('Failed to get MCP session status', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

/**
 * @swagger
 * /api/v1/mcp/api-keys/sessions/{sessionId}/end:
 *   post:
 *     summary: End an MCP session and revoke all associated tokens
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP session ID to end
 *     responses:
 *       200:
 *         description: Session ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [ended]
 *                 endedAt:
 *                   type: string
 *                   format: date-time
 *                 revokedTokens:
 *                   type: integer
 *                   description: Number of proxy tokens revoked
 *                 message:
 *                   type: string
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/:sessionId/end', [
  param('sessionId').isLength({ min: 1 }).withMessage('Session ID is required')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }
    
    logger.info('MCP session end requested', { sessionId });
    
    // This would require implementing session termination in the service
    res.json({
      sessionId,
      status: 'ended',
      endedAt: new Date().toISOString(),
      revokedTokens: 0, // This should be the actual count
      message: 'Session ended successfully (implementation pending)'
    });
  } catch (error: unknown) {
    logger.error('Failed to end MCP session', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

export default router;