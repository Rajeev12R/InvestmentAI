import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ExternalLink, FileText, Loader2, Search, ShieldAlert, TrendingUp } from 'lucide-react';
import { ACTIVE_IPOS } from './IPOPage.jsx';
import { getIpoIntelligence } from '../utils/api.js';

const parseNumber = (value) => Number.parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;

const IPOReviewDashboard = () => {
  const { ticker } = useParams();
  const [articles, setArticles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const ipo = ACTIVE_IPOS.find((item) => item.ticker.toUpperCase() === ticker.toUpperCase());

  if (!ipo) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-500" />
        <h1 className="text-xl font-black uppercase text-slate-900">IPO not found</h1>
        <Link to="/ipo" className="rounded-full bg-slate-900 px-5 py-2 text-xs font-black uppercase text-white">Back to IPO board</Link>
      </div>
    );
  }

  const price = parseNumber(ipo.price);
  const impliedListing = price + ipo.gmp;
  const demandMultiple = parseNumber(ipo.subscription);
  const gates = [
    { label: 'Offer is open for applications', value: ipo.status === 'OPEN' || ipo.status === 'CLOSING TODAY', good: ipo.status !== 'CLOSE' },
    { label: 'Grey-market premium is positive', value: ipo.gmp > 0, good: ipo.gmp > 0 },
    { label: 'Subscription demand has cleared 1x', value: demandMultiple >= 1, good: demandMultiple >= 1 },
    { label: 'Prospectus evidence required', value: 'Manual review', good: false }
  ];
  const positiveGates = gates.filter((gate) => gate.good).length;
  const decision = positiveGates >= 3 ? 'REVIEW FOR SUBSCRIPTION' : positiveGates >= 2 ? 'WATCHLIST' : 'AVOID FOR NOW';

  const handleExternalAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await getIpoIntelligence(ipo.name, ipo.ticker);
      setArticles(response?.data?.articles || []);
    } catch (error) {
      setAnalysisError(error.message || 'Unable to retrieve external IPO intelligence.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/ipo" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-amber-700">
          <ArrowLeft className="h-4 w-4" /> IPO board
        </Link>

        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-900 px-6 py-8 text-white md:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
                  <FileText className="h-4 w-4" /> IPO underwriting dashboard <span className="text-slate-500">/</span> {ipo.exchange}
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">{ipo.name}</h1>
                <p className="mt-2 text-sm text-slate-300">{ipo.ticker} · pre-listing offer review · {ipo.status}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 md:min-w-52">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provisional stance</p>
                <p className="mt-2 text-lg font-black text-amber-300">{decision}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExternalAnalysis}
              disabled={isAnalyzing}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-70"
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isAnalyzing ? 'Analyzing external sources...' : 'Analyze external sources'}
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-200 md:grid-cols-4">
            {[
              ['Offer price', `₹${ipo.price}`],
              ['GMP', `₹${ipo.gmp} (${ipo.gmpPercent.toFixed(2)}%)`],
              ['Subscription', ipo.subscription],
              ['Issue size', ipo.size]
            ].map(([label, value]) => (
              <div key={label} className="p-5"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-lg font-black text-slate-900">{value}</p></div>
            ))}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-black uppercase tracking-tight">Underwriting gates</h2></div>
            <div className="mt-6 divide-y divide-slate-100">
              {gates.map((gate) => (
                <div key={gate.label} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">{gate.good ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}<span className="text-sm font-semibold text-slate-700">{gate.label}</span></div>
                  <span className={`text-[10px] font-black uppercase ${gate.good ? 'text-emerald-600' : 'text-amber-600'}`}>{typeof gate.value === 'boolean' ? (gate.value ? 'Pass' : 'Fail') : gate.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-black uppercase tracking-tight">Offer pricing</h2></div>
              <div className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Implied listing indication</span><strong>₹{impliedListing.toFixed(2)}</strong></div><div className="flex justify-between"><span className="text-slate-500">GMP signal</span><strong className="text-emerald-600">+{ipo.gmpPercent.toFixed(2)}%</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max(ipo.gmpPercent, 4), 100)}%` }} /></div></div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-black uppercase tracking-tight">Important dates</h2></div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs"><div><p className="text-slate-400">Open</p><strong>{ipo.open}</strong></div><div><p className="text-slate-400">Close</p><strong>{ipo.close}</strong></div><div><p className="text-slate-400">Listing</p><strong>{ipo.listing}</strong></div></div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3"><Search className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-black uppercase tracking-tight">External intelligence</h2></div>
              <p className="mt-2 text-xs text-slate-500">Read-only GNews results for company announcements, offer coverage, risks, and market commentary.</p>
            </div>
            {articles.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{articles.length} sources</span>}
          </div>
          {analysisError && <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{analysisError}</p>}
          {articles.length === 0 && !analysisError && <p className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500">Run external analysis to fetch current IPO coverage.</p>}
          {articles.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {articles.map((article) => (
                <article key={`${article.url}-${article.title}`} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider text-slate-400"><span>{article.source}</span><span className={article.sentiment === 'NEGATIVE' ? 'text-rose-600' : article.sentiment === 'POSITIVE' ? 'text-emerald-600' : 'text-slate-500'}>{article.sentiment}</span></div>
                  <h3 className="mt-3 text-sm font-black leading-snug text-slate-900">{article.title}</h3>
                  {article.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{article.description}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-slate-400"><span>{article.category} · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Date unavailable'}</span>{article.url && <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black uppercase text-blue-600 hover:text-blue-800">Open <ExternalLink className="h-3 w-3" /></a>}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-relaxed text-amber-900">
          This is a pre-listing underwriting view. It deliberately does not use public-equity research, listed-market valuation, or company news analysis. Prospectus, promoter, dilution, and use-of-proceeds evidence should be verified before placing an order.
        </div>
      </div>
    </div>
  );
};

export default IPOReviewDashboard;