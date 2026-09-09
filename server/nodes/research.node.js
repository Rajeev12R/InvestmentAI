import { executeResearch } from '../research/research.engine.js';

export async function researchNode(state) {
  console.log('Running Research Intelligence Node');
  const truthPackage = state.truthPackage;

  if (!truthPackage || !truthPackage.integrity || !truthPackage.integrity.valid) {
    return {
      research: null
    };
  }

  try {
    const research = await executeResearch({
      truthPackage,
      researchQuestion: 'Synthesize institutional investment thesis and factor breakdown.',
      questionType: 'INVESTMENT_THESIS',
      investorProfile: state.investorProfile || 'BALANCED_VALUE'
    });

    return {
      research
    };
  } catch (error) {
    console.error('Research Node Error:', error.message);
    return {
      research: null
    };
  }
}
