/**
 * @file transaction.engine.js
 * Transactional Boundary Engine with Compensating Rollbacks for Phase 9.
 */

export class TransactionEngine {
  /**
   * Executes a multi-step workflow with automatic compensating rollbacks upon failure.
   * @param {Object} params
   * @param {string} params.name - Transaction name
   * @param {Array<{ step: string, execute: Function, rollback?: Function }>} params.steps
   * @returns {Promise<Object>} { success: boolean, results: Object, error?: string }
   */
  async executeTransaction({ name, steps = [] }) {
    const executedSteps = [];
    const results = {};

    for (let i = 0; i < steps.length; i++) {
      const stepDef = steps[i];
      try {
        const stepResult = await stepDef.execute(results);
        results[stepDef.step] = stepResult;
        executedSteps.push(stepDef);
      } catch (err) {
        // Rollback executed steps in reverse order
        const rollbackErrors = [];
        for (let j = executedSteps.length - 1; j >= 0; j--) {
          const toRollback = executedSteps[j];
          if (typeof toRollback.rollback === 'function') {
            try {
              await toRollback.rollback(results[toRollback.step]);
            } catch (rbErr) {
              rollbackErrors.push({ step: toRollback.step, error: rbErr.message });
            }
          }
        }

        return {
          success: false,
          failedStep: stepDef.step,
          error: err.message || String(err),
          rolledBack: true,
          rollbackErrors: rollbackErrors.length > 0 ? rollbackErrors : null
        };
      }
    }

    return {
      success: true,
      name,
      results
    };
  }
}

export const transactionEngine = new TransactionEngine();
