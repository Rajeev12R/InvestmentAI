import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, TrendingUp, Swords, Star, Globe2 } from 'lucide-react';

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
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md text-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 shadow-xs">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="flex items-center gap-2.5 font-sans tracking-tight text-lg font-bold text-slate-900 hover:opacity-90 transition-opacity">
          <div className="bg-blue-600 p-1.5 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="font-extrabold tracking-tight">Investment<span className="text-blue-600">AI</span></span>
        </Link>
      </div>

      {!isLandingPage && (
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search any global stock or ticker (e.g. AAPL, NVDA, RELIANCE, TCS)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs transition-all uppercase font-semibold"
            />
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold uppercase tracking-wider">
        <Link 
          to="/compare" 
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
            location.pathname === '/compare' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
          }`}
        >
          <Swords className="h-3.5 w-3.5" />
          <span>Compare</span>
        </Link>

        <Link 
          to="/watchlist" 
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
            location.pathname === '/watchlist' 
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
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


