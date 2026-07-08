import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Compass, TrendingUp, HelpCircle } from 'lucide-react';

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
    <header className="h-16 border-b border-slate-200 bg-white text-slate-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-sans tracking-tight text-lg font-bold text-slate-900 hover:opacity-90 transition-opacity">
          <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span>Investment <span className="text-blue-600">AI</span></span>
        </Link>
        
        <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full text-xs text-blue-700 font-medium">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>Real-time Markets Connected</span>
        </div>
      </div>

      {!isLandingPage && (
        <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search by company or ticker symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-200/60 border border-transparent focus:border-blue-500 focus:bg-white rounded-full pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none shadow-inner transition-all duration-200"
            />
          </div>
        </form>
      )}

      <div className="flex items-center gap-5 text-sm font-medium text-slate-600">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          Search
        </Link>
        <a 
          href="https://google.com/finance" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-blue-600 transition-colors flex items-center gap-0.5"
        >
          Markets
        </a>
      </div>
    </header>
  );
};

export default Navbar;
