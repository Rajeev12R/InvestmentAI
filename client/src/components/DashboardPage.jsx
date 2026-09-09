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
import EvidenceDrawer from './Dashboard/EvidenceDrawer';
import InvestorProfileModal from './Dashboard/InvestorProfileModal';
import ResearchPanel from './Research/ResearchPanel';
import { AlertCircle, ArrowLeft, RefreshCw, FileText, Share2, Star, ShieldCheck, Sliders } from 'lucide-react';

const DashboardPage = () => {
  const { ticker } = useParams();
  const [loading, setLoading] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Modals & Drawers state
  const [isExportMemoOpen, setIsExportMemoOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSavedInWatchlist, setIsSavedInWatchlist] = useState(false);

  // Active Investor Fit Profile
  const [investorProfile, setInvestorProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('investmentai_investor_profile');
      return saved ? JSON.parse(saved) : {
        horizon: 'Long (3-5 Years)',
        riskTolerance: 'Moderate / Balanced',
        goal: 'Capital Growth & Compounding'
      };
    } catch {
      return {
        horizon: 'Long (3-5 Years)',
        riskTolerance: 'Moderate / Balanced',
        goal: 'Capital Growth & Compounding'
      };
    }
  });

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
      console.error(e);
    }
  };

  const handleSaveProfile = (newProfile) => {
    setInvestorProfile(newProfile);
    try {
      localStorage.setItem('investmentai_investor_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.error(e);
    }
    // Re-run analysis with updated investor profile
    handleRetry();
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setProgressIndex(0);

    const timer = setInterval(() => {
      setProgressIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    analyzeCompany(ticker, false, investorProfile)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.message || 'Failed to analyze company.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Network error occurred.');
      })
      .finally(() => {
        if (isMounted) {
          clearInterval(timer);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [ticker, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (loading) {
    return <LoadingProgress currentStep={progressIndex} ticker={ticker} />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Analysis Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'Unable to retrieve real-time market data or financial statements for this security.'}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Terminal
            </Link>
            <button
              onClick={handleRetry}
              className="flex-1 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            title="Back to Global Terminal"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {data.companyProfile?.sector || 'Global Equity'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {data.companyProfile?.exchange || 'Exchange Listed'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
              {data.companyProfile?.name || ticker} <span className="text-blue-600 font-bold text-base">({data.companyProfile?.ticker || ticker})</span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Truth Layer Evidence Button */}
          <button
            onClick={() => setIsEvidenceDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-full text-xs font-bold text-emerald-800 transition-all cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Audit & Evidence</span>
          </button>

          {/* Watchlist Toggle */}
          <button
            onClick={toggleWatchlist}
            className={`inline-flex items-center gap-1.5 border px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
              isSavedInWatchlist 
                ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${isSavedInWatchlist ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            <span>{isSavedInWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
          >
            <Share2 className="h-3.5 w-3.5 text-blue-600" />
            Share
          </button>

          {/* Export Institutional Memo */}
          <button
            onClick={() => setIsExportMemoOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            Export Memo
          </button>

          {/* Refresh */}
          <button
            onClick={handleRetry}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
            title="Refresh Analysis"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* 10-Second Executive Verdict Header */}
        <ExecutiveSummary 
          recommendation={data.recommendation}
          qualityScore={data.companyQualityScore || data.investmentScore}
          attractivenessScore={data.stockAttractivenessScore || Math.round(data.investmentScore * 0.9)}
          investorFitScore={data.investorFitScore || 85}
          confidence={data.confidence}
          horizon={data.investmentHorizon}
          fairValue={data.valuation?.fairValuePriceTarget}
          currentPrice={data.stockData?.currentPrice}
          upside={data.valuation?.upsidePotential}
          marginOfSafety={data.valuation?.marginOfSafety}
          pros={data.pros}
          cons={data.cons}
          onOpenEvidence={() => setIsEvidenceDrawerOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* Company & Stock Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CompanyOverview profile={data.companyProfile} />
          <StockOverview stock={data.stockData} />
        </div>

        {/* Governed DCF & Valuation Model */}
        <div className="w-full">
          <ValuationModel 
            valuation={data.valuation} 
            stock={data.stockData} 
            financials={data.financials} 
          />
        </div>

        {/* Financial Statements & Risk Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <FinancialHealth financials={data.financials} />
          </div>
          <div className="lg:col-span-5">
            <RiskAssessment risks={data.risks} />
          </div>
        </div>

        {/* AI Strategic Reasoning & Catalysts */}
        <div className="w-full">
          <AIRecommendation 
            recommendation={data.recommendation}
            score={data.investmentScore}
            pros={data.pros}
            cons={data.cons}
            keyFactors={data.keyFactors}
            reasoning={data.reasoning}
            phase3Decision={data.phase3Decision || data.decision}
          />
        </div>

        {/* Institutional AI Research Analyst (Phase 4) */}
        <div className="w-full">
          <ResearchPanel 
            research={data.research}
            ticker={data.companyProfile?.ticker || ticker}
            currency={data.stockData?.currency || 'USD'}
            onOpenEvidence={() => setIsEvidenceDrawerOpen(true)}
          />
        </div>

        {/* Competitor Benchmarking & News Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompetitorAnalysis 
            competitors={data.competitors} 
            currentTicker={data.companyProfile?.ticker || ticker}
          />
          <LatestNews news={data.newsData} />
        </div>

      </div>

      {/* Modals & Drawers */}
      <EvidenceDrawer 
        isOpen={isEvidenceDrawerOpen}
        onClose={() => setIsEvidenceDrawerOpen(false)}
        provenance={data.provenance || []}
        confidence={typeof data.confidence === 'object' ? data.confidence : { overall: data.confidence }}
      />

      <InvestorProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        activeProfile={investorProfile}
        onSaveProfile={handleSaveProfile}
      />

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
