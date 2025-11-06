import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '@/middleware/auth';
import { SecretService } from '@/services/secretService';

const router = express.Router();
const secretService = new SecretService();

/**
 * Upsert a secret key/value pair
 */
router.post(
  '/secrets',
  authMiddleware,
  body('key').isString().notEmpty(),
  body('value').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { key, value } = req.body;
    try {
      await secretService.storeSecret(key, value);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * Retrieve a secret by key
 */
router.get(
  '/secrets/:key',
  authMiddleware,
  param('key').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const key = req.params.key;
    try {
      const value = await secretService.getSecret(key);
      if (value === null) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      res.json({ key, value });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
