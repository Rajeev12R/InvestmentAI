import { getCompanyNews } from '../tools/news.tool.js';

export async function getIpoIntelligenceController(req, res) {
  try {
    const { companyName, ticker } = req.body || {};
    const query = [companyName, ticker, 'IPO'].filter(Boolean).join(' ');

    if (!companyName && !ticker) {
      return res.status(400).json({ success: false, message: 'Company name or IPO ticker is required.' });
    }

    const articles = await getCompanyNews(query);
    return res.json({
      success: true,
      data: {
        query,
        provider: 'GNews',
        retrievedAt: new Date().toISOString(),
        articles
      }
    });
  } catch (error) {
    console.error('IPO Intelligence Controller Error:', error.message);
    return res.status(502).json({ success: false, message: 'External IPO intelligence is unavailable.', error: error.message });
  }
}