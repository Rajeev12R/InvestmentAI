import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/company/:ticker" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;