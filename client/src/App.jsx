import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TickerBar from './components/TickerBar';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import ComparePage from './components/ComparePage';
import WatchlistPage from './components/WatchlistPage';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
        <TickerBar />
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/company/:ticker" element={<DashboardPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;