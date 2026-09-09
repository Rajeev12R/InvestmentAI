import React, { useState } from 'react';
import EventCard from './EventCard.jsx';
import { Radio, RefreshCw, Filter, ShieldCheck } from 'lucide-react';

export default function EventTimeline({
  events = [],
  selectedEvent = null,
  onSelectEvent = () => {},
  onTriggerIngestion = () => {},
  loading = false,
  ticker = ''
}) {
  const [filterType, setFilterType] = useState('ALL');

  const filteredEvents = events.filter(e => {
    if (filterType === 'ALL') return true;
    if (filterType === 'FINANCIAL') return e.eventType?.includes('EARNINGS') || e.eventType?.includes('REPORT') || e.eventType?.includes('REVENUE');
    if (filterType === 'CORPORATE') return e.eventType?.includes('BUYBACK') || e.eventType?.includes('DIVIDEND') || e.eventType?.includes('ACQUISITION');
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Continuous Intelligence Ingestion</h3>
            <p className="text-xs text-slate-400">Automated event discovery & deterministic verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTriggerIngestion(ticker)}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Scan Feeds
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 flex items-center gap-1 text-[11px]"><Filter className="w-3 h-3" /> Filter:</span>
        {['ALL', 'FINANCIAL', 'CORPORATE'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              filterType === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500 font-mono">{filteredEvents.length} Discovered</span>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          No external events ingested yet. Click <strong>Scan Feeds</strong> to discover latest news and filings.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {filteredEvents.map((evt, idx) => (
            <EventCard
              key={evt.rawRecordId || evt.eventId || idx}
              event={evt}
              onSelect={onSelectEvent}
              isSelected={selectedEvent?.eventId === evt.eventId || selectedEvent?.rawRecordId === evt.rawRecordId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
