/**
 * @file attention.routes.js
 * Express routes for Attention Intelligence.
 */

import express from 'express';
import { attentionController } from '../controllers/attentionController.js';

const router = express.Router();

router.get('/', attentionController.getLatestAttention);
router.get('/ai-context', attentionController.getAIContext);
router.get('/item/:attentionId', attentionController.getAttentionItemById);
router.get('/:ticker', attentionController.getAttentionByTicker);
router.post('/generate', attentionController.generatePackage);

export default router;
