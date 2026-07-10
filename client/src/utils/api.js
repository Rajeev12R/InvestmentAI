import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const analyzeCompany = async (companyName) => {
  try {
    const response = await api.post('/api/analyze', { companyName });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    const message = error.response?.data?.message || error.message || 'Failed to analyze company';
    throw new Error(message);
  }
};
