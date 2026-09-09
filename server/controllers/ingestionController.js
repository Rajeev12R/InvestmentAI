import { ingestionEngine } from '../ingestion/ingestion.engine.js';
import { rawEventStore } from '../ingestion/rawEventStore.js';
import { ingestionScheduler } from '../ingestion/ingestionScheduler.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { getCompanyNews } from '../tools/news.tool.js';

export async function runIngestionController(req, res) {
  try {
    const { ticker, workspaceId = 'default' } = req.body || {};
    if (!ticker) {
      return res.status(400).json({ success: false, error: 'Ticker is required' });
    }

    const upperTicker = ticker.toUpperCase();

    // Pull live news for ticker
    const newsArticles = await getCompanyNews(upperTicker);
    const ingestedEvents = [];

    for (const article of newsArticles.slice(0, 5)) {
      const result = await ingestionEngine.ingestExternalEvent({
        workspaceId,
        ticker: upperTicker,
        company: upperTicker,
        source: article.source || 'YAHOO_FINANCE',
        sourceId: article.url || article.sourceId || `NEWS_${Date.now()}`,
        sourceUrl: article.url || '',
        publishedAt: article.publishedAt,
        rawPayload: {
          title: article.title,
          description: article.description,
          category: article.category,
          severity: article.severity
        }
      });
      ingestedEvents.push(result);
    }

    return res.json({
      success: true,
      data: {
        ticker: upperTicker,
        eventsProcessed: ingestedEvents.length,
        results: ingestedEvents
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function ingestEventController(req, res) {
  try {
    const { workspaceId = 'default', ticker, company, source, publishedAt, rawPayload } = req.body || {};
    if (!ticker || !source || !rawPayload) {
      return res.status(400).json({ success: false, error: 'ticker, source, and rawPayload are required.' });
    }

    const result = await ingestionEngine.ingestExternalEvent({
      workspaceId,
      ticker,
      company,
      source,
      publishedAt,
      rawPayload
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getIngestedEventsController(req, res) {
  try {
    const { ticker } = req.params;
    const records = rawEventStore.getAllRecords(ticker);
    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getIngestionStatusController(req, res) {
  try {
    const { ticker } = req.params;
    const logs = ingestionScheduler.getStatusLogs(ticker);
    return res.json({ success: true, data: { isRunning: ingestionScheduler.isRunning, logs } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getEventDetailsController(req, res) {
  try {
    const { eventId } = req.params;
    const record = rawEventStore.getRawRecord(eventId);
    if (!record) {
      return res.status(404).json({ success: false, error: `Event record ${eventId} not found` });
    }
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getIngestionTimelineController(req, res) {

  try {
    const { ticker } = req.params;
    const { workspaceId = 'default' } = req.query;
    const timeline = workspaceRepository.getTimelineEvents(workspaceId, ticker);
    return res.json({ success: true, data: timeline });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

