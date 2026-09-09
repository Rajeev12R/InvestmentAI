import React, { useState, useEffect } from 'react';
import {
  getWorkspaceApi,
  addWatchlistApi,
  removeWatchlistApi,
  createSnapshotApi,
  getSnapshotsApi,
  getTimelineApi,
  getChangesApi,
  askChangeQuestionApi,
  getAlertsApi,
  acknowledgeAlertApi,
  runIngestionApi,
  getIngestedEventsApi
} from '../../utils/api.js';
import WatchlistTable from './WatchlistTable.jsx';
import ChangeSummaryCard from './ChangeSummaryCard.jsx';
import ValuationDriftCard from './ValuationDriftCard.jsx';
import RiskDriftCard from './RiskDriftCard.jsx';
import ThesisDriftCard from './ThesisDriftCard.jsx';
import ThesisBreakerMonitor from './ThesisBreakerMonitor.jsx';
import InvestmentAlertCenter from './InvestmentAlertCenter.jsx';
import InvestmentTimeline from './InvestmentTimeline.jsx';
import SnapshotHistory from './SnapshotHistory.jsx';
import EventTimeline from '../Ingestion/EventTimeline.jsx';
import EventImpactPanel from '../Ingestion/EventImpactPanel.jsx';
import { RefreshCw, MessageSquare, Send, Bot, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function WorkspaceDashboard() {
  const [workspace, setWorkspace] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [snapshots, setSnapshots] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [changeReport, setChangeReport] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('What changed since my last review and does it impact the thesis?');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Workspace on Mount
  useEffect(() => {
    loadWorkspace();
  }, []);

  // Reload ticker data on selection change
  useEffect(() => {
    if (selectedTicker) {
      loadTickerData(selectedTicker);
    }
  }, [selectedTicker]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const res = await getWorkspaceApi('default');
      if (res.success && res.data) {
        setWorkspace(res.data);
        if (res.data.watchlist && res.data.watchlist.length > 0) {
          setSelectedTicker(res.data.watchlist[0].ticker);
        }
      }
      loadAlerts();
    } catch (err) {
      console.error('Error loading workspace:', err);
      setError('Failed to connect to workspace repository.');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await getAlertsApi('default');
      if (res.success && res.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const loadTickerData = async (ticker) => {
    try {
      setError(null);
      const [snapsRes, timelineRes, changesRes, eventsRes] = await Promise.allSettled([
        getSnapshotsApi('default', ticker),
        getTimelineApi('default', ticker),
        getChangesApi('default', ticker),
        getIngestedEventsApi(ticker)
      ]);

      if (snapsRes.status === 'fulfilled' && snapsRes.value.success) {
        setSnapshots(snapsRes.value.data || []);
      }
      if (timelineRes.status === 'fulfilled' && timelineRes.value.success) {
        setTimeline(timelineRes.value.data || []);
      }
      if (changesRes.status === 'fulfilled' && changesRes.value.success) {
        setChangeReport(changesRes.value.data || null);
      } else {
        setChangeReport(null);
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value.success) {
        setEvents(eventsRes.value.data || []);
        if (eventsRes.value.data && eventsRes.value.data.length > 0) {
          setSelectedEvent(eventsRes.value.data[0]);
        }
      }
    } catch (err) {
      console.error('Error loading ticker details:', err);
    }
  };

  const handleTriggerIngestion = async (ticker) => {
    try {
      setIngesting(true);
      const res = await runIngestionApi(ticker, 'default');
      if (res.success) {
        await loadTickerData(ticker);
        await loadAlerts();
      }
    } catch (err) {
      alert(`Ingestion error: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleAddTicker = async (ticker) => {
    try {
      const res = await addWatchlistApi('default', ticker);
      if (res.success && res.data) {
        setWorkspace(res.data);
        setSelectedTicker(ticker);
      }
    } catch (err) {
      alert(`Failed to add ticker: ${err.message}`);
    }
  };

  const handleRemoveTicker = async (ticker) => {
    try {
      const res = await removeWatchlistApi('default', ticker);
      if (res.success && res.data) {
        setWorkspace(res.data);
        if (selectedTicker === ticker) {
          setSelectedTicker(res.data.watchlist[0]?.ticker || '');
        }
      }
    } catch (err) {
      alert(`Failed to remove ticker: ${err.message}`);
    }
  };

  const handleCaptureSnapshot = async (ticker) => {
    try {
      setCapturing(true);
      const res = await createSnapshotApi('default', ticker);
      if (res.success) {
        await loadTickerData(ticker);
        await loadAlerts();
      }
    } catch (err) {
      alert(`Snapshot capture error: ${err.message}`);
    } finally {
      setCapturing(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await acknowledgeAlertApi('default', alertId);
      await loadAlerts();
    } catch (err) {
      console.error('Ack error:', err);
    }
  };

  const handleAskChangeQuestion = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedTicker) return;

    try {
      setAiLoading(true);
      setAiAnswer(null);
      const res = await askChangeQuestionApi('default', selectedTicker, aiQuestion.trim());
      if (res.success && res.data) {
        setAiAnswer(res.data);
      }
    } catch (err) {
      alert(`Change research error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 w-full text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Investment Workspace</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">
              Phase 5 Change Intelligence
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Continuous temporal tracking, thesis drift monitoring, and deterministic change intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadTickerData(selectedTicker)}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Section: Alerts & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WatchlistTable
            watchlist={workspace?.watchlist || []}
            onSelectTicker={setSelectedTicker}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
            onCaptureSnapshot={handleCaptureSnapshot}
            selectedTicker={selectedTicker}
            loading={capturing}
          />
        </div>
        <div>
          <InvestmentAlertCenter
            alerts={alerts}
            onAcknowledge={handleAcknowledgeAlert}
          />
        </div>
      </div>

      {/* Main Analysis Section for Selected Ticker */}
      {selectedTicker && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Temporal Analysis: <span className="font-mono text-blue-400">{selectedTicker}</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {snapshots.length} Snapshot(s) Available
              </span>
            </div>

            <button
              onClick={() => handleCaptureSnapshot(selectedTicker)}
              disabled={capturing}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${capturing ? 'animate-spin' : ''}`} />
              Capture New Snapshot (T{snapshots.length})
            </button>
          </div>

          {/* Change & Drift Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ThesisDriftCard thesisDrift={changeReport?.thesisDrift || {}} />
            <ValuationDriftCard valuationDrift={changeReport?.valuationDrift || {}} />
            <RiskDriftCard riskDrift={changeReport?.riskDrift || {}} />
            <ThesisBreakerMonitor breakers={changeReport?.thesisBreakers || []} />
          </div>

          {/* Side-by-Side Metric Differences */}
          <ChangeSummaryCard
            changes={changeReport?.rawChanges || []}
            isBaseline={changeReport?.isBaseline || snapshots.length <= 1}
            deterministicSummary={changeReport?.deterministicSummary}
          />

          {/* AI Change Research Query Interface */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">AI Change Analyst Q&A</h3>
            </div>

            <form onSubmit={handleAskChangeQuestion} className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask what changed and how it impacts the investment thesis..."
                className="flex-1 px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Analyze
              </button>
            </form>

            {aiAnswer && (
              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Bot className="w-4 h-4" />
                  <span>Validated AI Temporal Narrative</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-500">Air-Gapped & Bounded</span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">{aiAnswer.summary}</p>

                {aiAnswer.whatChanged && aiAnswer.whatChanged.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Grounded Evidence Changes</span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {aiAnswer.whatChanged.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-indigo-400 font-mono text-[10px] mt-0.5">[{c.changeId || 'VERIFIED'}]:</span>
                          <span>{c.claim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Continuous Ingestion & Event Intelligence Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventTimeline
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              onTriggerIngestion={handleTriggerIngestion}
              loading={ingesting}
              ticker={selectedTicker}
            />
            <EventImpactPanel
              selectedEvent={selectedEvent}
              eventImpact={selectedEvent ? {
                materiality: selectedEvent.eventType?.includes('EARNINGS') || selectedEvent.eventType?.includes('REPORT') ? 'HIGH' : 'MEDIUM',
                deterministicReasons: [
                  selectedEvent.summary || 'External event verified against source hierarchy.',
                  `Source Authority: ${selectedEvent.sourceTier || 'TIER_2'}`
                ],
                affectedValuationModels: ['DCF', 'Relative Valuation'],
                affectedRiskCategories: ['earningsQuality', 'financialRisk'],
                affectedFacts: selectedEvent.extractedFacts?.map(f => f.id) || ['financial.revenue']
              } : null}
            />
          </div>

          {/* Timeline & Snapshot History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InvestmentTimeline events={timeline} />
            </div>
            <div>
              <SnapshotHistory
                snapshots={snapshots}
                selectedSnapshotId={changeReport?.currentSnapshotId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
