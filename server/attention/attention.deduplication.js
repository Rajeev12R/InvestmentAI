/**
 * @file attention.deduplication.js
 * Deduplication and clustering engine for Phase 7 Attention Intelligence.
 * Merges overlapping change signals for the same ticker & transition into a primary AttentionItem
 * with linked secondary impacts, preventing notification floods while retaining full provenance.
 */

/**
 * Generates a deterministic clustering key for an attention candidate.
 * @param {Object} item
 * @returns {string}
 */
export function getClusterKey(item) {
  const ticker = (item.ticker || 'GLOBAL').toUpperCase();
  const transition = item.snapshotId || item.packageHash || 'CURRENT';
  const eventId = item.eventIds && item.eventIds.length > 0 ? item.eventIds[0] : 'GENERAL';
  return `${ticker}:${transition}:${eventId}`;
}

/**
 * Deduplicates and clusters an array of raw attention items.
 * @param {Array<Object>} items
 * @returns {Array<Object>} Ranked, deduplicated attention items
 */
export function deduplicateAttentionItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const clusters = new Map();

  for (const item of items) {
    const key = getClusterKey(item);
    if (!clusters.has(key)) {
      clusters.set(key, {
        primary: { ...item },
        secondarySignals: []
      });
    } else {
      const cluster = clusters.get(key);
      const existing = cluster.primary;

      // Determine if current item has higher score or priority to become primary
      const currentScore = item.score?.totalScore ?? item.totalScore ?? 0;
      const existingScore = existing.score?.totalScore ?? existing.totalScore ?? 0;

      if (currentScore > existingScore) {
        // Demote existing to secondary and promote current
        cluster.secondarySignals.push({
          category: existing.category,
          title: existing.title,
          summary: existing.summary,
          changeIds: existing.changeIds || [],
          evidenceIds: existing.evidenceIds || []
        });
        cluster.primary = { ...item };
      } else {
        // Add current as secondary signal
        cluster.secondarySignals.push({
          category: item.category,
          title: item.title,
          summary: item.summary,
          changeIds: item.changeIds || [],
          evidenceIds: item.evidenceIds || []
        });
      }

      // Merge identifiers and evidence into primary
      cluster.primary.changeIds = Array.from(new Set([...(cluster.primary.changeIds || []), ...(item.changeIds || [])]));
      cluster.primary.eventIds = Array.from(new Set([...(cluster.primary.eventIds || []), ...(item.eventIds || [])]));
      cluster.primary.alertIds = Array.from(new Set([...(cluster.primary.alertIds || []), ...(item.alertIds || [])]));
      cluster.primary.evidenceIds = Array.from(new Set([...(cluster.primary.evidenceIds || []), ...(item.evidenceIds || [])]));
      cluster.primary.investigationQuestions = Array.from(new Set([
        ...(cluster.primary.investigationQuestions || []),
        ...(item.investigationQuestions || [])
      ]));
    }
  }

  // Assemble unified primary items with their attached secondary signals
  const result = [];
  for (const cluster of clusters.values()) {
    const finalItem = {
      ...cluster.primary,
      secondarySignals: cluster.secondarySignals
    };
    result.push(finalItem);
  }

  // Deterministically sort by score descending, then by ticker ascending
  result.sort((a, b) => {
    const scoreA = a.score?.totalScore ?? a.totalScore ?? 0;
    const scoreB = b.score?.totalScore ?? b.totalScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return String(a.ticker).localeCompare(String(b.ticker));
  });

  return result;
}
