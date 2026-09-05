import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analyzeCompany } from '../utils/api';
import LoadingProgress from './LoadingProgress';
import ExecutiveSummary from './Dashboard/ExecutiveSummary';
import CompanyOverview from './Dashboard/CompanyOverview';
import FinancialHealth from './Dashboard/FinancialHealth';
import StockOverview from './Dashboard/StockOverview';
import LatestNews from './Dashboard/LatestNews';
import CompetitorAnalysis from './Dashboard/CompetitorAnalysis';
import RiskAssessment from './Dashboard/RiskAssessment';
import AIRecommendation from './Dashboard/AIRecommendation';
import ValuationModel from './Dashboard/ValuationModel';
import ExportMemoModal from './Dashboard/ExportMemoModal';
import ShareScorecardModal from './Dashboard/ShareScorecardModal';
import { AlertCircle, ArrowLeft, RefreshCw, FileText, Share2, Star, Check } from 'lucide-react';

const DashboardPage = () => {
  const { ticker } = useParams();
  const [loading, setLoading] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Modals state
  const [isExportMemoOpen, setIsExportMemoOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSavedInWatchlist, setIsSavedInWatchlist] = useState(false);

  // Check Watchlist status
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('investmentai_watchlist') || '[]');
      const exists = saved.some(item => (item.ticker || '').toUpperCase() === (ticker || '').toUpperCase());
      setIsSavedInWatchlist(exists);
    } catch (e) {
      console.error(e);
    }
  }, [ticker, data]);

  const toggleWatchlist = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('investmentai_watchlist') || '[]');
      const cleanTicker = (ticker || '').toUpperCase();
      const exists = saved.some(item => (item.ticker || '').toUpperCase() === cleanTicker);

      let updated;
      if (exists) {
        updated = saved.filter(item => (item.ticker || '').toUpperCase() !== cleanTicker);
        setIsSavedInWatchlist(false);
      } else {
        const newItem = {
          ticker: cleanTicker,
          name: data?.companyProfile?.name || cleanTicker,
          price: data?.stockData?.currentPrice || 0,
          fairValue: data?.valuation?.fairValuePriceTarget || data?.stockData?.currentPrice || 0,
          upside: data?.valuation?.upsidePotential || 0,
          recommendation: data?.recommendation || 'HOLD',
          score: data?.investmentScore || 50,
          currency: data?.stockData?.currency || 'USD',
          addedAt: new Date().toISOString()
        };
        updated = [newItem, ...saved];
        setIsSavedInWatchlist(true);
      }
      localStorage.setItem('investmentai_watchlist', JSON.stringify(updated));
    } catch (e) {
      console.error('Watchlist Error:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setData(null);
    setProgressIndex(0);

    const progressTimer = setInterval(() => {
      if (isMounted) {
        setProgressIndex((prev) => {
          if (prev < 6) {
            return prev + 1;
          }
          return prev;
        });
      }
    }, 2200);

    const fetchData = async () => {
      try {
        const response = await analyzeCompany(ticker);
        
        if (!isMounted) return;

        if (response.success && response.data) {
          setProgressIndex(6);
          setTimeout(() => {
            if (isMounted) {
              setData(response.data);
              setLoading(false);
            }
          }, 800);
        } else {
          throw new Error(response.message || 'No analysis data returned.');
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError(err.message || 'An unexpected error occurred during company analysis.');
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      clearInterval(progressTimer);
    };
  }, [ticker, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[calc(100vh-4rem)]">
        <LoadingProgress ticker={ticker} progressIndex={progressIndex} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-lg bg-white border border-red-200 rounded-2xl p-6 space-y-6 shadow-md text-center">
          <div className="flex justify-center">
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-rose-600" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-rose-600 uppercase">Analysis Failed</span>
            <h1 className="text-lg font-bold text-slate-900">Analysis Pipeline Aborted</h1>
            <div className="bg-slate-50 border border-slate-250 p-4 rounded-xl text-left text-xs font-semibold text-rose-700 max-h-32 overflow-y-auto leading-relaxed shadow-inner">
              {error}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-full text-xs font-semibold text-slate-700 uppercase transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to search
            </Link>
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-full text-xs font-semibold uppercase transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
            title="Return to Query Center"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                PRO REPORT ACTIVE
              </span>
              <span className="text-[10px] font-semibold text-slate-450 uppercase">
                Updated: {new Date().toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
              {data.companyProfile?.name || ticker} <span className="text-blue-600 font-bold text-base">({data.companyProfile?.ticker || ticker})</span>
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Watchlist Toggle */}
          <button
            onClick={toggleWatchlist}
            className={`inline-flex items-center gap-1.5 border px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
              isSavedInWatchlist 
                ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${isSavedInWatchlist ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            <span>{isSavedInWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
          </button>

          {/* Share Scorecard Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Share2 className="h-3.5 w-3.5 text-blue-600" />
            Share
          </button>

          {/* Export Institutional Memo Button */}
          <button
            onClick={() => setIsExportMemoOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            Export Memo (PDF)
          </button>

          {/* Refresh */}
          <button
            onClick={handleRetry}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-sm"
            title="Refresh Analysis"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ExecutiveSummary 
              recommendation={data.recommendation}
              score={data.investmentScore}
              confidence={data.confidence}
              horizon={data.investmentHorizon}
            />
          </div>
          <div className="lg:col-span-1">
            <CompanyOverview profile={data.companyProfile} />
          </div>
          <div className="lg:col-span-1">
            <StockOverview stock={data.stockData} />
          </div>
        </div>

        {/* Interactive DCF & Fair Value Model */}
        <div className="w-full">
          <ValuationModel 
            valuation={data.valuation} 
            stock={data.stockData} 
            financials={data.financials} 
          />
        </div>

        {/* Financials & Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <FinancialHealth financials={data.financials} />
          </div>
          <div className="lg:col-span-5">
            <RiskAssessment risks={data.risks} />
          </div>
        </div>

        {/* AI Catalyst Rationale Grid */}
        <div className="w-full">
          <AIRecommendation 
            recommendation={data.recommendation}
            score={data.investmentScore}
            pros={data.pros}
            cons={data.cons}
            keyFactors={data.keyFactors}
            reasoning={data.reasoning}
          />
        </div>

        {/* Competitor Analysis & Latest News */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompetitorAnalysis competitors={data.competitors} />
          <LatestNews news={data.newsData} />
        </div>

      </div>

      {/* Modals */}
      <ExportMemoModal 
        isOpen={isExportMemoOpen} 
        onClose={() => setIsExportMemoOpen(false)} 
        data={data} 
        ticker={ticker} 
      />

      <ShareScorecardModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        data={data} 
        ticker={ticker} 
      />
    </div>
  );
};

export default DashboardPage;

