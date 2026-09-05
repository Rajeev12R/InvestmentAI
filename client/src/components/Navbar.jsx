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
    <header className="h-16 border-b border-slate-200 bg-white text-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 shadow-xs">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="flex items-center gap-2 font-sans tracking-tight text-lg font-bold text-slate-900 hover:opacity-90 transition-opacity">
          <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center text-white shadow-xs">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span>Investment <span className="text-blue-600">AI</span></span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full text-[11px] text-blue-700 font-semibold">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>Real-time Markets</span>
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
              className="w-full bg-slate-100 hover:bg-slate-200/60 border border-transparent focus:border-blue-500 focus:bg-white rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none shadow-inner transition-all"
            />
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 sm:gap-5 text-xs font-bold uppercase tracking-wider">
        <Link 
          to="/compare" 
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
            location.pathname === '/compare' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'text-slate-600 hover:text-blue-600'
          }`}
        >
          <Swords className="h-3.5 w-3.5" />
          <span>Compare</span>
        </Link>

        <Link 
          to="/watchlist" 
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
            location.pathname === '/watchlist' 
              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
              : 'text-slate-600 hover:text-amber-600'
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
