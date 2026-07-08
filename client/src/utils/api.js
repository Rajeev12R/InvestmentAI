import axios from 'axios';

export const analyzeCompany = async (companyName) => {
  try {
    const response = await axios.post('/api/analyze', { companyName });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    const message = error.response?.data?.message || error.message || 'Failed to analyze company';
    throw new Error(message);
  }
};
