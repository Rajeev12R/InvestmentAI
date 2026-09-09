import express from 'express';
import {
  runIngestionController,
  ingestEventController,
  getIngestedEventsController,
  getIngestionStatusController,
  getEventDetailsController,
  getIngestionTimelineController
} from '../controllers/ingestionController.js';

const router = express.Router();

router.post('/run', runIngestionController);
router.post('/trigger-job', runIngestionController);
router.post('/event', ingestEventController);
router.get('/status', getIngestionStatusController);
router.get('/:ticker/status', getIngestionStatusController);
router.get('/raw/:ticker', getIngestedEventsController);
router.get('/:ticker/events', getIngestedEventsController);
router.get('/timeline/:ticker', getIngestionTimelineController);
router.get('/event/:eventId', getEventDetailsController);

export default router;

