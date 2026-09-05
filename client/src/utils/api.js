import axios from 'axios';

const getApiBaseUrl = () => {
  // If running locally in the browser on localhost
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3000';
    }
  }
  // When deployed (e.g. on Vercel), use Vercel env var or default to deployed Render backend
  return import.meta.env.VITE_API_URL || 'https://investmentai-kfg5.onrender.com';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000, // 2 minutes for deep AI financial pipeline analysis
  headers: {
    'Content-Type': 'application/json'
  }
});

export const analyzeCompany = async (companyName) => {
  try {
    const response = await api.post('/api/analyze', { companyName });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Analysis pipeline timed out. Please retry in a few moments.');
    }
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to analyze company';
    throw new Error(message);
  }
};

export const compareCompanies = async (tickers) => {
  try {
    const response = await api.post('/api/compare', { tickers });
    return response.data;
  } catch (error) {
    console.error('Compare API Error:', error);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Comparison timed out. Please try again.');
    }
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to compare companies';
    throw new Error(message);
  }
};


