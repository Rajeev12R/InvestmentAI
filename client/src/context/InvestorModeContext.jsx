import React, { createContext, useContext, useState, useEffect } from 'react';

const InvestorModeContext = createContext();

export const InvestorModeProvider = ({ children }) => {
  // 'simple' (Aarav / ELI5 Mode) or 'analyst' (Pro Quantitative Mode)
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('investmentai_investor_mode') || 'simple';
  });

  useEffect(() => {
    localStorage.setItem('investmentai_investor_mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'simple' ? 'analyst' : 'simple'));
  };

  const isSimpleMode = mode === 'simple';

  return (
    <InvestorModeContext.Provider value={{ mode, setMode, toggleMode, isSimpleMode }}>
      {children}
    </InvestorModeContext.Provider>
  );
};

export const useInvestorMode = () => {
  const context = useContext(InvestorModeContext);
  if (!context) {
    return {
      mode: 'simple',
      setMode: () => {},
      toggleMode: () => {},
      isSimpleMode: true
    };
  }
  return context;
};
