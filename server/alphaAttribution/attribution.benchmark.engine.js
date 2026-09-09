export class BenchmarkBrinsonEngine {
  /**
   * Perform Brinson-Fachler or Brinson-Hood-Beebower attribution across sectors/groups.
   * sectors: [ { sectorId, portfolioWeight, benchmarkWeight, portfolioReturn, benchmarkReturn } ]
   */
  calculateBrinsonAttribution({
    sectors = [],
    methodology = 'BRINSON_FACHLER' // 'BRINSON_FACHLER' or 'BRINSON_HOOD_BEEBOWER'
  }) {
    if (!Array.isArray(sectors) || sectors.length === 0) {
      return {
        portfolioReturn: 0.0,
        benchmarkReturn: 0.0,
        activeReturn: 0.0,
        allocationEffect: 0.0,
        selectionEffect: 0.0,
        interactionEffect: 0.0,
        reconciled: true,
        sectors: []
      };
    }

    let portfolioTotalReturn = 0;
    let benchmarkTotalReturn = 0;

    for (const s of sectors) {
      portfolioTotalReturn += (s.portfolioWeight || 0) * (s.portfolioReturn || 0);
      benchmarkTotalReturn += (s.benchmarkWeight || 0) * (s.benchmarkReturn || 0);
    }

    portfolioTotalReturn = parseFloat(portfolioTotalReturn.toFixed(6));
    benchmarkTotalReturn = parseFloat(benchmarkTotalReturn.toFixed(6));
    const activeReturn = parseFloat((portfolioTotalReturn - benchmarkTotalReturn).toFixed(6));

    let totalAllocation = 0;
    let totalSelection = 0;
    let totalInteraction = 0;

    const sectorAttributions = sectors.map(s => {
      const wp = s.portfolioWeight || 0;
      const wb = s.benchmarkWeight || 0;
      const rp = s.portfolioReturn || 0;
      const rb = s.benchmarkReturn || 0;

      let alloc = 0;
      if (methodology === 'BRINSON_FACHLER') {
        // (wp - wb) * (rb - R_benchmark)
        alloc = (wp - wb) * (rb - benchmarkTotalReturn);
      } else {
        // (wp - wb) * rb
        alloc = (wp - wb) * rb;
      }

      // Selection: wb * (rp - rb)
      const select = wb * (rp - rb);

      // Interaction: (wp - wb) * (rp - rb)
      const interact = (wp - wb) * (rp - rb);

      totalAllocation += alloc;
      totalSelection += select;
      totalInteraction += interact;

      return {
        sectorId: s.sectorId,
        portfolioWeight: wp,
        benchmarkWeight: wb,
        portfolioReturn: rp,
        benchmarkReturn: rb,
        allocationEffect: parseFloat(alloc.toFixed(6)),
        selectionEffect: parseFloat(select.toFixed(6)),
        interactionEffect: parseFloat(interact.toFixed(6)),
        totalEffect: parseFloat((alloc + select + interact).toFixed(6))
      };
    });

    totalAllocation = parseFloat(totalAllocation.toFixed(6));
    totalSelection = parseFloat(totalSelection.toFixed(6));
    totalInteraction = parseFloat(totalInteraction.toFixed(6));

    const totalCalculated = parseFloat((totalAllocation + totalSelection + totalInteraction).toFixed(6));
    const reconciled = Math.abs(activeReturn - totalCalculated) < 1e-5;

    return {
      methodology,
      portfolioReturn: portfolioTotalReturn,
      benchmarkReturn: benchmarkTotalReturn,
      activeReturn,
      allocationEffect: totalAllocation,
      selectionEffect: totalSelection,
      interactionEffect: totalInteraction,
      totalCalculated,
      reconciled,
      sectors: sectorAttributions
    };
  }
}

export const defaultBenchmarkEngine = new BenchmarkBrinsonEngine();
