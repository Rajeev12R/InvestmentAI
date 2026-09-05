import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Compass, TrendingUp, Swords, Star } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/company/${searchTerm.trim().toUpperCase()}`);
      setSearchTerm('');
    }
  };

  const isLandingPage = location.pathname === '/';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md text-slate-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="flex items-center gap-2.5 font-sans tracking-tight text-lg font-bold text-white hover:opacity-90 transition-opacity">
          <div className="bg-blue-600 p-1.5 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="font-extrabold tracking-tight">Investment<span className="text-blue-500">AI</span></span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[11px] text-emerald-400 font-semibold shadow-inner">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Markets Connected</span>
        </div>
      </div>

      {!isLandingPage && (
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
            <input
              type="text"
              placeholder="Search ticker (e.g. AAPL, NVDA, TCS.NS)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none shadow-inner transition-all uppercase font-medium"
            />
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold uppercase tracking-wider">
        <Link 
          to="/compare" 
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
            location.pathname === '/compare' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Swords className="h-3.5 w-3.5" />
          <span>Compare</span>
        </Link>

        <Link 
          to="/watchlist" 
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
            location.pathname === '/watchlist' 
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Star className="h-3.5 w-3.5" />
          <span>Watchlist</span>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
