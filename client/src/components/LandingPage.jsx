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
  BookOpen
} from 'lucide-react';

const INDIAN_TICKERS = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Retail', gain: '+1.8%' },
  { ticker: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Automotive & EV', gain: '+2.4%' },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking & Financials', gain: '+0.9%' },
  { ticker: 'INFY.NS', name: 'Infosys', sector: 'IT Services', gain: '+1.5%' },
  { ticker: 'ZOMATO.NS', name: 'Zomato', sector: 'Consumer Tech', gain: '+3.7%' },
  { ticker: 'SUZLON.NS', name: 'Suzlon Energy', sector: 'Renewable Power', gain: '+4.2%' },
  { ticker: 'TATAPOWER.NS', name: 'Tata Power', sector: 'Green Energy', gain: '+2.1%' },
  { ticker: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG & Agri', gain: '+0.5%' }
];

const GLOBAL_TICKERS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Semiconductors & AI', gain: '+3.1%' },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Consumer Tech', gain: '+0.6%' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Cloud & Software', gain: '+1.1%' },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Automotive & AI', gain: '+2.8%' },
  { ticker: 'AMZN', name: 'Amazon.com', sector: 'E-Commerce & Cloud', gain: '+0.9%' },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Search & Cloud', gain: '+1.3%' }
];

const PRICING_PLANS = [
  {
    name: 'Starter Tier',
    price: '$0',
    period: 'forever free',
    badge: 'Free Tier',
    highlight: false,
    description: 'Perfect for retail investors discovering fundamental and sentiment analysis.',
    features: [
      'Daily Equity Analysis (NSE, BSE & US Equities)',
      'Basic Fundamental Audits & Ratios',
      'Plain-English Aarav Mode Explanations',
      'Latest News & Sentiment Feeds',
      'Portfolio Watchlist (Up to 5 stocks)'
    ],
    cta: 'Start Analyzing Free',
    action: '/'
  },
  {
    name: 'Pro Analyst',
    price: '$29',
    period: 'per month',
    badge: 'Most Popular',
    highlight: true,
    description: 'For active investors and research analysts requiring deep quantitative valuation models.',
    features: [
      'Unlimited High-Speed AI Analyses',
      'Interactive 5-Year DCF Valuation Modeler',
      'Multi-Stock Head-to-Head Comparisons',
      'Printable Institutional PDF Investment Memos',
      'Shareable Social Scorecard Cards',
      'Unlimited Watchlist & Target Price Alerts',
      'Quantitative Risk & Leverage Auditing'
    ],
    cta: 'Get Pro Access',
    action: '/compare'
  },
  {
    name: 'Institutional / RIA',
    price: '$149',
    period: 'per month',
    badge: 'Wealth Managers',
    highlight: false,
    description: 'Built for family offices, RIAs, wealth managers, and boutique investment firms.',
    features: [
      'Everything in Pro Analyst',
      'White-Label Client PDF Memos (Custom Logo)',
      'Custom Investment Thesis Scoring Weights',
      'Full REST API Access (5,000 req/mo)',
      'Priority Model Queue & 99.9% SLA',
      'Dedicated Account Manager Support'
    ],
    cta: 'Contact Sales',
    action: '/compare'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [marketTab, setMarketTab] = useState('india'); // 'india' or 'global'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/company/${searchTerm.trim().toUpperCase()}`);
    }
  };

  const activeTickers = marketTab === 'india' ? INDIAN_TICKERS : GLOBAL_TICKERS;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-28 flex flex-col items-center justify-center text-center max-w-7xl mx-auto w-full">
        
        {/* Ambient Radial Background Glows */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-blue-600/25 via-indigo-600/20 to-emerald-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-10 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        {/* Version Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/25 rounded-full text-xs font-bold text-blue-400 mb-6 shadow-inner backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>InvestmentAI 2.0 &bull; Built for India (NSE/BSE) & Global Equities</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl leading-[1.08] mb-6">
          Wall Street Intelligence. <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Simplified for Everyone.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          Instant balance sheet audits, interactive 5-year DCF fair value models, multi-stock battles, and plain-English AI explanations for non-MBAs.
        </p>

        {/* Search Box */}
        <div className="w-full max-w-2xl relative mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-md opacity-30 group-hover:opacity-100 transition duration-500" />
          <form 
            onSubmit={handleSubmit}
            className="relative bg-slate-900 border border-slate-700/80 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center gap-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Enter company or ticker (e.g. TATAMOTORS, RELIANCE, NVDA)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none uppercase font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Analyze Stock</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Market Category Selector Tabs */}
        <div className="flex items-center gap-2 mb-4 bg-slate-900/90 border border-slate-800 p-1 rounded-full text-xs font-bold shadow-inner">
          <button
            onClick={() => setMarketTab('india')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              marketTab === 'india' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇮🇳 Indian Equities (NSE/BSE)
          </button>
          <button
            onClick={() => setMarketTab('global')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              marketTab === 'global' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇺🇸 US Tech Titans (NASDAQ)
          </button>
        </div>

        {/* Trending Equities Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs max-w-4xl">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">
            {marketTab === 'india' ? 'Popular Indian Chips:' : 'Popular Global Chips:'}
          </span>
          {activeTickers.map((item) => (
            <button
              key={item.ticker}
              onClick={() => navigate(`/company/${item.ticker}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-full text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs text-xs font-semibold"
            >
              <span>{item.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">({item.ticker})</span>
              <span className="text-[10px] text-emerald-400 font-mono">{item.gain}</span>
            </button>
          ))}
        </div>

        {/* Institutional Trust Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-800/80 w-full max-w-4xl text-left">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">NSE & SEC Feeds</span>
              <span className="text-[10px] text-slate-450">Audited financial data</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calculator className="h-5 w-5 text-blue-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">5-Year DCF Engine</span>
              <span className="text-[10px] text-slate-450">Intrinsic fair value targets</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-indigo-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">Aarav ELI5 Mode</span>
              <span className="text-[10px] text-slate-450">Plain-English AI glossary</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Award className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">100k+ Reports</span>
              <span className="text-[10px] text-slate-450">Used by retail & pro analysts</span>
            </div>
          </div>
        </div>

      </section>


      {/* Interactive Terminal Mockup Showcase */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 max-w-6xl mx-auto w-full">
        <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">terminal.investmentai.io &bull; NVIDIA Corp (NVDA)</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Synthesis Complete</span>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Suitability Verdict</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-white">88<span className="text-sm font-normal text-slate-500">/100</span></span>
                <span className="bg-emerald-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full uppercase">INVEST</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Exceptional operating margin of 62.4% and market dominance in accelerated compute infrastructure.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DCF Fair Value Target</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-blue-400">$165.00</span>
                <span className="text-emerald-400 text-xs font-bold font-mono">+19.3% Upside</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                5-year discounted cash flow projection based on 22% forward free cash flow growth and 9.5% WACC.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instant Pro Actions</span>
              <div className="space-y-2 pt-1">
                <Link 
                  to="/company/NVDA"
                  className="flex items-center justify-between bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  <span>Open Full Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link 
                  to="/compare?tickers=NVDA,AMD"
                  className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  <span>Compare vs AMD</span>
                  <Swords className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bento Grid Feature Matrix */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate-900/40 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Institutional Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Engineered for Discerning Investors
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Every tool and model required to evaluate equity risk, calculate fair values, and draft thesis memos in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1: DCF Engine */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="bg-blue-500/10 text-blue-400 p-3 rounded-2xl w-fit">
                <Calculator className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Interactive DCF Modeler</h4>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Adjust growth rates, terminal multipliers, and discount rates with real-time slider controls to compute fair value targets.
              </p>
            </div>

            {/* Feature 2: Head-to-Head Compare */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-2xl w-fit">
                <Swords className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Head-to-Head Multi-Stock Compare</h4>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Battle 2–4 stocks side-by-side. AI assigns category victor badges across Growth, Valuation, Margins, and Solvency.
              </p>
            </div>

            {/* Feature 3: Institutional PDF Memo */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl w-fit">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">1-Click PDF Investment Memos</h4>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Generate clean, 3-page Institutional Investment Memos formatted for printing, client presentations, and investment clubs.
              </p>
            </div>

            {/* Feature 4: Risk Radar */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="bg-rose-500/10 text-rose-400 p-3 rounded-2xl w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Quantitative Risk Radar</h4>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Deep audit of liquidity margins (current/quick ratio), debt-to-cash leverage multiples, and historical beta volatility.
              </p>
            </div>

            {/* Feature 5: News Sentiment */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="bg-amber-500/10 text-amber-400 p-3 rounded-2xl w-fit">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Sentiment & Catalyst Feeds</h4>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Scans global press wires and news indices to map positive momentum triggers and emerging litigation/governance threats.
              </p>
            </div>

            {/* Feature 6: Watchlist */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="bg-purple-500/10 text-purple-400 p-3 rounded-2xl w-fit">
                <Star className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Persistent Portfolio Radar</h4>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Track your favorite equities with implied fair value discounts, customized investment thesis notes, and live pricing.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 max-w-7xl mx-auto w-full space-y-12">
        
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Transparent Pricing
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Plans for Individuals & Institutions
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Start free, or unlock institutional models and unlimited analyses with Pro.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {PRICING_PLANS.map((plan, idx) => (
            <div 
              key={idx}
              className={`rounded-3xl p-8 flex flex-col justify-between space-y-8 transition-all ${
                plan.highlight 
                  ? 'bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-900 border-2 border-blue-500/60 shadow-2xl shadow-blue-500/10 relative scale-105' 
                  : 'bg-slate-900 border border-slate-800'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400 font-semibold">/ {plan.period}</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={plan.action}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-all shadow-md block ${
                  plan.highlight 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <div className="bg-blue-600 p-1 rounded-md text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span>Investment <span className="text-blue-500">AI</span> &bull; 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/compare" className="hover:text-slate-300 transition-colors">Compare</Link>
            <Link to="/watchlist" className="hover:text-slate-300 transition-colors">Watchlist</Link>
            <a href="https://google.com/finance" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">Markets</a>
          </div>

          <p className="text-[11px] text-slate-600">
            For financial research & educational support purposes only.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
