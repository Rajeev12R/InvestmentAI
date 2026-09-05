import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  BarChart3, 
  Calculator, 
  Swords, 
  FileText, 
  Star, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Zap, 
  Layers, 
  Lock,
  Globe2,
  ChevronRight,
  HelpCircle,
  Award,
  Activity,
  DollarSign
} from 'lucide-react';

const GLOBAL_POPULAR_TICKERS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', price: '$138.25', gain: '+3.14%' },
  { ticker: 'AAPL', name: 'Apple Inc', price: '$228.50', gain: '+0.64%' },
  { ticker: 'MSFT', name: 'Microsoft', price: '$448.20', gain: '+1.10%' },
  { ticker: 'TSLA', name: 'Tesla Inc', price: '$248.10', gain: '+2.85%' },
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: '₹2,980.50', gain: '+1.82%' },
  { ticker: 'TCS.NS', name: 'Tata Consultancy', price: '₹4,512.00', gain: '+1.35%' },
  { ticker: 'AMZN', name: 'Amazon.com', price: '$186.40', gain: '+0.95%' },
  { ticker: 'GOOGL', name: 'Alphabet Inc', price: '$165.30', gain: '+1.28%' }
];

const PRICING_PLANS = [
  {
    name: 'Standard Tier',
    price: '$0',
    period: 'forever free',
    badge: 'Free Tier',
    highlight: false,
    description: 'Essential quantitative analytics and real-time sentiment synthesis for individual investors.',
    features: [
      'Global Equity Audits (US, Europe, Asia & India)',
      'Balance Sheet & Capital Structure Ratios',
      'AI Qualitative Suitability Thesis & Score',
      'Live Press & SEC/NSE News Sentiment Feeds',
      'Portfolio Watchlist (Up to 5 tickers)'
    ],
    cta: 'Start Analyzing Free',
    action: '/'
  },
  {
    name: 'Professional',
    price: '$29',
    period: 'per month',
    badge: 'Most Popular',
    highlight: true,
    description: 'Advanced financial modeling, DCF sensitivity engines, and institutional comparison tools.',
    features: [
      'Unlimited High-Speed Financial Analyses',
      'Interactive 5-Year DCF Intrinsic Valuation Model',
      'Multi-Stock Head-to-Head Battle Comparisons',
      'Printable Institutional PDF Investment Memos',
      'Shareable Branded Social Scorecards',
      'Unlimited Portfolio Watchlist with Price Alerts',
      'Deep Solvency, Liquidity & Leverage Audits'
    ],
    cta: 'Get Pro Access',
    action: '/compare'
  },
  {
    name: 'Institutional / RIA',
    price: '$149',
    period: 'per month',
    badge: 'Enterprise',
    highlight: false,
    description: 'Custom research workflows and white-label reporting for wealth managers and funds.',
    features: [
      'Everything in Professional Plan',
      'White-Label Client PDF Memos (Custom Branding)',
      'Custom Multi-Factor Weighting Matrices',
      'Full REST API Access (5,000 req/mo)',
      'Priority Cloud Execution & 99.9% SLA',
      'Dedicated Institutional Account Manager'
    ],
    cta: 'Contact Sales',
    action: '/compare'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/company/${searchTerm.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-28 flex flex-col items-center justify-center text-center max-w-7xl mx-auto w-full">
        
        {/* Soft Background Accents */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-100 via-indigo-50 to-emerald-50 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        {/* Version Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700 mb-6 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Institutional Financial Intelligence &bull; Global Market Coverage</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-5xl leading-[1.08] mb-6">
          Global Financial Intelligence. <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
            Automated at Institutional Speed.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          Instant balance sheet audits, interactive 5-year DCF fair value models, multi-stock comparison battles, and institutional investment memos across all global exchanges.
        </p>

        {/* Search Box */}
        <div className="w-full max-w-2xl relative mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-3xl blur-md opacity-20" />
          <form 
            onSubmit={handleSubmit}
            className="relative bg-white border border-slate-300 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center gap-2 shadow-lg"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Enter any global company name or ticker (e.g. AAPL, NVDA, RELIANCE, TCS)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none uppercase font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Analyze Stock</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Global Trending Equities Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs max-w-4xl">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">
            Active Global Equities:
          </span>
          {GLOBAL_POPULAR_TICKERS.map((item) => (
            <button
              key={item.ticker}
              onClick={() => navigate(`/company/${item.ticker}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-blue-400 rounded-full text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs text-xs font-semibold"
            >
              <span>{item.name}</span>
              <span className="text-[10px] text-slate-400 font-mono font-bold">({item.ticker})</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">{item.gain}</span>
            </button>
          ))}
        </div>

        {/* Institutional Trust Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-200 w-full max-w-4xl text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Audited Global Feeds</span>
              <span className="text-[10px] text-slate-500">Real-time exchange data</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
              <Calculator className="h-4.5 w-4.5 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">5-Year DCF Modeler</span>
              <span className="text-[10px] text-slate-500">Intrinsic fair value targets</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
              <BarChart3 className="h-4.5 w-4.5 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">MDN Financial Glossaries</span>
              <span className="text-[10px] text-slate-500">Hover for formulas & metrics</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
              <Award className="h-4.5 w-4.5 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Institutional Standards</span>
              <span className="text-[10px] text-slate-500">Trusted research metrics</span>
            </div>
          </div>
        </div>

      </section>

      {/* Interactive Terminal Mockup Showcase (Light Theme) */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 max-w-6xl mx-auto w-full">
        <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-mono text-slate-600 font-semibold">terminal.investmentai.io &bull; NVIDIA Corp (NVDA)</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synthesis Complete</span>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
            
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Investment Suitability Score</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900">88<span className="text-sm font-normal text-slate-400">/100</span></span>
                <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase">INVEST</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Exceptional operating profit margin of 62.4% and market dominance in accelerated compute infrastructure.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">DCF Intrinsic Fair Value Target</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-blue-600">$165.00</span>
                <span className="text-emerald-700 text-xs font-bold font-mono">+19.3% Upside</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                5-year discounted cash flow projection based on 22% forward free cash flow growth and 9.5% WACC.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Instant Platform Actions</span>
              <div className="space-y-2 pt-1">
                <Link 
                  to="/company/NVDA"
                  className="flex items-center justify-between bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-colors shadow-2xs"
                >
                  <span>Open Full Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link 
                  to="/compare?tickers=NVDA,AMD"
                  className="flex items-center justify-between bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  <span>Compare vs AMD</span>
                  <Swords className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Matrix (Light Theme) */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-white border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Institutional Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Engineered for Discerning Investors
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Every tool and model required to evaluate equity risk, calculate fair values, and draft thesis memos in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1: DCF Engine */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 hover:border-slate-300 transition-colors shadow-2xs">
              <div className="bg-blue-50 text-blue-600 border border-blue-200 p-3 rounded-2xl w-fit">
                <Calculator className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Interactive DCF Modeler</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Adjust growth rates, terminal multipliers, and discount rates with real-time slider controls to compute fair value targets.
              </p>
            </div>

            {/* Feature 2: Head-to-Head Compare */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 hover:border-slate-300 transition-colors shadow-2xs">
              <div className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-3 rounded-2xl w-fit">
                <Swords className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Head-to-Head Multi-Stock Battle</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Battle 2–4 stocks side-by-side. AI assigns category victor badges across Growth, Valuation, Margins, and Solvency.
              </p>
            </div>

            {/* Feature 3: Institutional PDF Memo */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 hover:border-slate-300 transition-colors shadow-2xs">
              <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 rounded-2xl w-fit">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">1-Click PDF Investment Memos</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Generate clean, 3-page Institutional Investment Memos formatted for printing, client presentations, and investment clubs.
              </p>
            </div>

            {/* Feature 4: Risk Radar */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 hover:border-slate-300 transition-colors shadow-2xs">
              <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-2xl w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Quantitative Risk Radar</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Deep audit of liquidity margins (current/quick ratio), debt-to-cash leverage multiples, and historical beta volatility.
              </p>
            </div>

            {/* Feature 5: News Sentiment */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 hover:border-slate-300 transition-colors shadow-2xs">
              <div className="bg-amber-50 text-amber-600 border border-amber-200 p-3 rounded-2xl w-fit">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Sentiment & Catalyst Feeds</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Scans global press wires and news indices to map positive momentum triggers and emerging governance threats.
              </p>
            </div>

            {/* Feature 6: Watchlist */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 hover:border-slate-300 transition-colors shadow-2xs">
              <div className="bg-purple-50 text-purple-600 border border-purple-200 p-3 rounded-2xl w-fit">
                <Star className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Persistent Portfolio Radar</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Track your favorite equities with implied fair value discounts, customized investment thesis notes, and live pricing.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Pricing Plans Section (Light Theme) */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 max-w-7xl mx-auto w-full space-y-12">
        
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Transparent Pricing
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Plans for Individuals & Institutions
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Start free, or unlock institutional models and unlimited analyses with Professional.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {PRICING_PLANS.map((plan, idx) => (
            <div 
              key={idx}
              className={`rounded-3xl p-8 flex flex-col justify-between space-y-8 transition-all bg-white border ${
                plan.highlight 
                  ? 'border-2 border-blue-600 shadow-xl relative scale-105' 
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ {plan.period}</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700 font-medium">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={plan.action}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-all shadow-2xs block ${
                  plan.highlight 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

      </section>

      {/* Footer (Light Theme) */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className="bg-blue-600 p-1 rounded-md text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span>Investment <span className="text-blue-600">AI</span> &bull; 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/compare" className="hover:text-blue-600 transition-colors">Compare</Link>
            <Link to="/watchlist" className="hover:text-blue-600 transition-colors">Watchlist</Link>
            <a href="https://google.com/finance" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Markets</a>
          </div>

          <p className="text-[11px] text-slate-500">
            Institutional equity research & analytical modeling platform.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;

