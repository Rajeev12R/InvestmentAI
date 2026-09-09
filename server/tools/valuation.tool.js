/**
 * Deterministic Institutional Valuation Engine Entrypoint
 * Bridges LangGraph nodes with the dedicated modular valuation architecture.
 */

import { executeValuationPipeline } from "../valuation/valuation.engine.js";
export { calculateWACC, calculateFCFFDCF, generateSensitivityGrid } from "../valuation/dcf.engine.js";
export { calculateRelativeValuation } from "../valuation/multiples.engine.js";
export { solveReverseDCF } from "../valuation/reverseDcf.engine.js";
export { calculateScenarioValuation } from "../valuation/scenario.engine.js";
export { executeValuationPipeline } from "../valuation/valuation.engine.js";

/**
 * Executes the complete institutional deterministic valuation pipeline.
 */
export function calculateValuation(state) {
    return executeValuationPipeline(state);
}
