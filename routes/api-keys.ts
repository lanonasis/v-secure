import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
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

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiKeyProject:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         organizationId:
 *           type: string
 *           format: uuid
 *         ownerId:
 *           type: string
 *           format: uuid
 *         teamMembers:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         settings:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     ApiKey:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         keyType:
 *           type: string
 *           enum: [api_key, database_url, oauth_token, certificate, ssh_key, webhook_secret, encryption_key]
 *         environment:
 *           type: string
 *           enum: [development, staging, production]
 *         projectId:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         accessLevel:
 *           type: string
 *           enum: [public, authenticated, team, admin, enterprise]
 *         status:
 *           type: string
 *           enum: [active, rotating, deprecated, expired, compromised]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         usageCount:
 *           type: integer
 *         lastRotated:
 *           type: string
 *           format: date-time
 *         rotationFrequency:
 *           type: integer
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *         createdBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     MCPTool:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         toolId:
 *           type: string
 *         toolName:
 *           type: string
 *         organizationId:
 *           type: string
 *           format: uuid
 *         permissions:
 *           type: object
 *           properties:
 *             keys:
 *               type: array
 *               items:
 *                 type: string
 *             environments:
 *               type: array
 *               items:
 *                 type: string
 *             maxConcurrentSessions:
 *               type: integer
 *             maxSessionDuration:
 *               type: integer
 *         webhookUrl:
 *           type: string
 *           format: url
 *         autoApprove:
 *           type: boolean
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         status:
 *           type: string
 *           enum: [active, suspended, pending_approval]
 *         createdBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ============================================================================
// PROJECT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/api-keys/projects:
 *   post:
 *     summary: Create a new API key project
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - organizationId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *               teamMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKeyProject'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/projects', [
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('organizationId').isUUID().withMessage('Organization ID must be a valid UUID'),
  body('description').optional().isString(),
  body('teamMembers').optional().isArray(),
  body('settings').optional().isObject()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const project = await apiKeyService.createProject(req.body, req.user.id);
    
    logger.info('API key project created', {
      projectId: project.id,
      userId: req.user.id,
      organizationId: project.organizationId
    });

    res.status(201).json(project);
  } catch (error: unknown) {
    logger.error('Failed to create API key project', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * @swagger
 * /api/v1/api-keys/projects:
 *   get:
 *     summary: Get all API key projects for the user's organization
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiKeyProject'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/projects', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const projects = await apiKeyService.getProjects(req.user.organizationId);
    res.json(projects);
  } catch (error: unknown) {
    logger.error('Failed to get API key projects', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// ============================================================================
// API KEY ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - value
 *               - keyType
 *               - projectId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               value:
 *                 type: string
 *                 minLength: 1
 *               keyType:
 *                 type: string
 *                 enum: [api_key, database_url, oauth_token, certificate, ssh_key, webhook_secret, encryption_key]
 *               environment:
 *                 type: string
 *                 enum: [development, staging, production]
 *                 default: development
 *               accessLevel:
 *                 type: string
 *                 enum: [public, authenticated, team, admin, enterprise]
 *                 default: team
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               rotationFrequency:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 90
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', [
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('value').isLength({ min: 1 }).withMessage('Value is required'),
  body('keyType').isIn(['api_key', 'database_url', 'oauth_token', 'certificate', 'ssh_key', 'webhook_secret', 'encryption_key']),
  body('environment').optional().isIn(['development', 'staging', 'production']),
  body('accessLevel').optional().isIn(['public', 'authenticated', 'team', 'admin', 'enterprise']),
  body('projectId').isUUID().withMessage('Project ID must be a valid UUID'),
  body('tags').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
  body('rotationFrequency').optional().isInt({ min: 1, max: 365 }),
  body('metadata').optional().isObject()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const apiKey = await apiKeyService.createApiKey(req.body, req.user.id);
    
    logger.info('API key created', {
      keyId: apiKey.id,
      keyName: apiKey.name,
      userId: req.user.id,
      organizationId: apiKey.organizationId
    });

    // Remove sensitive data from response
    const safeApiKey = { ...apiKey };
    delete (safeApiKey as any).value;

    res.status(201).json(safeApiKey);
  } catch (error: unknown) {
    logger.error('Failed to create API key', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * @swagger
 * /api/v1/api-keys:
 *   get:
 *     summary: Get all API keys for the user's organization
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by project ID
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', [
  query('projectId').optional().isUUID()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const { projectId } = req.query;
    const apiKeys = await apiKeyService.getApiKeys(req.user.organizationId, projectId as string | undefined);
    res.json(apiKeys);
  } catch (error: unknown) {
    logger.error('Failed to get API keys', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

/**
 * @swagger
 * /api/v1/api-keys/{keyId}:
 *   get:
 *     summary: Get a specific API key by ID
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 *       500:
 *         description: Internal server error
 */
router.get('/:keyId', [
  param('keyId').isUUID()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const keyId = req.params.keyId;
    if (!keyId) {
      res.status(400).json({ error: 'Key ID is required' });
      return;
    }
    const apiKey = await apiKeyService.getApiKeyById(keyId);
    res.json(apiKey);
  } catch (error: unknown) {
    logger.error('Failed to get API key', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'API key not found' });
    } else {
      res.status(500).json({ error: 'Failed to get API key' });
    }
  }
});

/**
 * @swagger
 * /api/v1/api-keys/{keyId}:
 *   put:
 *     summary: Update an API key
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               value:
 *                 type: string
 *                 minLength: 1
 *               keyType:
 *                 type: string
 *                 enum: [api_key, database_url, oauth_token, certificate, ssh_key, webhook_secret, encryption_key]
 *               environment:
 *                 type: string
 *                 enum: [development, staging, production]
 *               accessLevel:
 *                 type: string
 *                 enum: [public, authenticated, team, admin, enterprise]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               rotationFrequency:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: API key updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 *       500:
 *         description: Internal server error
 */
router.put('/:keyId', [
  param('keyId').isUUID(),
  body('name').optional().isLength({ min: 1, max: 255 }),
  body('value').optional().isLength({ min: 1 }),
  body('keyType').optional().isIn(['api_key', 'database_url', 'oauth_token', 'certificate', 'ssh_key', 'webhook_secret', 'encryption_key']),
  body('environment').optional().isIn(['development', 'staging', 'production']),
  body('accessLevel').optional().isIn(['public', 'authenticated', 'team', 'admin', 'enterprise']),
  body('tags').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
  body('rotationFrequency').optional().isInt({ min: 1, max: 365 }),
  body('metadata').optional().isObject()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const keyId = req.params.keyId;
    if (!keyId) {
      res.status(400).json({ error: 'Key ID is required' });
      return;
    }
    const apiKey = await apiKeyService.updateApiKey(keyId, req.body, req.user.id);
    
    logger.info('API key updated', {
      keyId: apiKey.id,
      userId: req.user.id,
      organizationId: apiKey.organizationId
    });

    res.json(apiKey);
  } catch (error: unknown) {
    logger.error('Failed to update API key', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'API key not found' });
    } else {
      res.status(500).json({ error: 'Failed to update API key' });
    }
  }
});

/**
 * @swagger
 * /api/v1/api-keys/{keyId}:
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Key Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     responses:
 *       204:
 *         description: API key deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:keyId', [
  param('keyId').isUUID()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const keyId = req.params.keyId;
    if (!keyId) {
      res.status(400).json({ error: 'Key ID is required' });
      return;
    }
    await apiKeyService.deleteApiKey(keyId, req.user.id);
    
    logger.info('API key deleted', {
      keyId: keyId,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error: unknown) {
    logger.error('Failed to delete API key', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'API key not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }
});

// ============================================================================
// MCP TOOL ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/api-keys/mcp/tools:
 *   post:
 *     summary: Register a new MCP tool for secure API key access
 *     tags: [MCP Integration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toolId
 *               - toolName
 *               - organizationId
 *               - permissions
 *             properties:
 *               toolId:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               toolName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *               permissions:
 *                 type: object
 *                 properties:
 *                   keys:
 *                     type: array
 *                     items:
 *                       type: string
 *                   environments:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [development, staging, production]
 *                   maxConcurrentSessions:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10
 *                     default: 3
 *                   maxSessionDuration:
 *                     type: integer
 *                     minimum: 60
 *                     maximum: 3600
 *                     default: 900
 *               webhookUrl:
 *                 type: string
 *                 format: url
 *               autoApprove:
 *                 type: boolean
 *                 default: false
 *               riskLevel:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *     responses:
 *       201:
 *         description: MCP tool registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MCPTool'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/mcp/tools', [
  body('toolId').isLength({ min: 1, max: 255 }),
  body('toolName').isLength({ min: 1, max: 255 }),
  body('organizationId').isUUID(),
  body('permissions').isObject(),
  body('permissions.keys').isArray(),
  body('permissions.environments').isArray(),
  body('permissions.maxConcurrentSessions').optional().isInt({ min: 1, max: 10 }),
  body('permissions.maxSessionDuration').optional().isInt({ min: 60, max: 3600 }),
  body('webhookUrl').optional().isURL(),
  body('autoApprove').optional().isBoolean(),
  body('riskLevel').optional().isIn(['low', 'medium', 'high', 'critical'])
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const tool = await apiKeyService.registerMCPTool(req.body, req.user.id);
    
    logger.info('MCP tool registered', {
      toolId: tool.toolId,
      userId: req.user.id,
      organizationId: tool.organizationId
    });

    res.status(201).json(tool);
  } catch (error: unknown) {
    logger.error('Failed to register MCP tool', error);
    res.status(500).json({ error: 'Failed to register MCP tool' });
  }
});

/**
 * @swagger
 * /api/v1/api-keys/mcp/tools:
 *   get:
 *     summary: Get all MCP tools for the user's organization
 *     tags: [MCP Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of MCP tools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MCPTool'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/mcp/tools', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const tools = await apiKeyService.getMCPTools(req.user.organizationId);
    res.json(tools);
  } catch (error: unknown) {
    logger.error('Failed to get MCP tools', error);
    res.status(500).json({ error: 'Failed to get MCP tools' });
  }
});

// ============================================================================
// MCP ACCESS ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/api-keys/mcp/request-access:
 *   post:
 *     summary: Request access to API keys via MCP
 *     tags: [MCP Integration]
 *     security:
 *       - bearerAuth: []
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
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *               keyNames:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               environment:
 *                 type: string
 *                 enum: [development, staging, production]
 *               justification:
 *                 type: string
 *                 minLength: 1
 *               estimatedDuration:
 *                 type: integer
 *                 minimum: 60
 *                 maximum: 3600
 *               context:
 *                 type: object
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
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/mcp/request-access', [
  body('toolId').isLength({ min: 1 }),
  body('organizationId').isUUID(),
  body('keyNames').isArray({ min: 1 }),
  body('environment').isIn(['development', 'staging', 'production']),
  body('justification').isLength({ min: 1 }),
  body('estimatedDuration').isInt({ min: 60, max: 3600 }),
  body('context').optional().isObject()
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const requestId = await apiKeyService.createMCPAccessRequest(req.body);
    
    logger.info('MCP access request created', {
      requestId,
      toolId: req.body.toolId,
      userId: req.user.id,
      organizationId: req.body.organizationId
    });

    res.status(201).json({
      requestId,
      status: 'pending', // This could be 'approved' if auto-approved
      message: 'Access request created successfully'
    });
  } catch (error: unknown) {
    logger.error('Failed to create MCP access request', error);
    res.status(500).json({ error: 'Failed to create access request' });
  }
});

/**
 * @swagger
 * /api/v1/api-keys/mcp/sessions/{sessionId}/proxy-token:
 *   post:
 *     summary: Get a proxy token for a specific API key
 *     tags: [MCP Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyName
 *             properties:
 *               keyName:
 *                 type: string
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
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Session invalid or expired
 *       500:
 *         description: Internal server error
 */
router.post('/mcp/sessions/:sessionId/proxy-token', [
  param('sessionId').isLength({ min: 1 }),
  body('keyName').isLength({ min: 1 })
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const sessionId = req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }
    const { proxyToken, expiresAt } = await apiKeyService.getProxyTokenForKey(
      sessionId,
      req.body.keyName
    );
    
    logger.info('Proxy token generated', {
      sessionId: sessionId,
      keyName: req.body.keyName,
      userId: req.user.id
    });

    res.json({ proxyToken, expiresAt });
  } catch (error: unknown) {
    logger.error('Failed to generate proxy token', error);
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('expired'))) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate proxy token' });
    }
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/api-keys/analytics/usage:
 *   get:
 *     summary: Get usage analytics for API keys
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific API key
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Usage analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/analytics/usage', [
  query('keyId').optional().isUUID(),
  query('days').optional().isInt({ min: 1, max: 365 })
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const { keyId, days } = req.query;
    const analytics = await apiKeyService.getUsageAnalytics(
      req.user.organizationId,
      keyId as string | undefined,
      days ? parseInt(days as string) : 30
    );
    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get usage analytics', error);
    res.status(500).json({ error: 'Failed to get usage analytics' });
  }
});

/**
 * @swagger
 * /api/v1/api-keys/analytics/security-events:
 *   get:
 *     summary: Get security events for API keys
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *     responses:
 *       200:
 *         description: Security events data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/analytics/security-events', [
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
], validateRequest, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User authentication required' });
      return;
    }

    const { severity } = req.query;
    const events = await apiKeyService.getSecurityEvents(
      req.user.organizationId,
      severity as string | undefined
    );
    res.json(events);
  } catch (error: unknown) {
    logger.error('Failed to get security events', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

export default router;