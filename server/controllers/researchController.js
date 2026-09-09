import { analyzeCompany } from '../graph/investmentGraph.js';
import { executeResearch } from '../research/research.engine.js';

/**
 * Executes research on a company by running the deterministic pipeline and passing the sealed Truth Package to the research engine.
 */
export async function researchQuestionController(req, res) {
  try {
    const { ticker, companyName, researchQuestion, questionType, investorProfile } = req.body;
    const targetTicker = (ticker || companyName || '').trim();

    if (!targetTicker) {
      return res.status(400).json({ success: false, error: 'Ticker or companyName is required' });
    }

    // Run deterministic pipeline to obtain sealed truthPackage
    const analysisState = await analyzeCompany(targetTicker, investorProfile);
    const truthPackage = analysisState?.truthPackage;

    if (!truthPackage || !truthPackage.integrity || !truthPackage.integrity.valid) {
      return res.status(422).json({
        success: false,
        error: 'Failed to generate a valid sealed Investment Truth Package for this ticker'
      });
    }

    const researchResult = await executeResearch({
      truthPackage,
      researchQuestion: researchQuestion || 'Synthesize institutional investment thesis and valuation breakdown.',
      questionType: questionType || 'INVESTMENT_THESIS',
      investorProfile: investorProfile || 'BALANCED_VALUE'
    });

    return res.json({
      success: true,
      data: researchResult
    });
  } catch (error) {
    console.error('Research Question Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal research execution error'
    });
  }
}

export async function researchReportController(req, res) {
  try {
    const targetTicker = (req.params.ticker || req.body?.ticker || req.body?.companyName || '').trim();

    if (!targetTicker) {
      return res.status(400).json({ success: false, error: 'Ticker is required' });
    }

    const investorProfile = req.body?.investorProfile || 'BALANCED_VALUE';
    const analysisState = await analyzeCompany(targetTicker, investorProfile);
    const truthPackage = analysisState?.truthPackage;

    if (!truthPackage) {
      return res.status(422).json({ success: false, error: 'Truth Package unavailable' });
    }

    const report = await executeResearch({
      truthPackage,
      researchQuestion: `Generate a full institutional equity research report for ${targetTicker}.`,
      questionType: 'FULL_RESEARCH_REPORT',
      investorProfile
    });

    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Research Report Controller Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
