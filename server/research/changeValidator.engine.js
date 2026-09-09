/**
 * Validates AI Change Interpretation claims against sealed Change Intelligence Package.
 */
export function validateChangeClaims({
  claims = [],
  changePackage
}) {
  if (!changePackage) {
    return {
      isValid: false,
      validClaims: [],
      rejectedClaims: claims.map(c => ({ ...c, verificationStatus: 'REJECTED', reason: 'Missing change package' }))
    };
  }

  const validChanges = new Map();
  [...(changePackage.rawChanges || []), ...(changePackage.materialChanges || [])].forEach(c => {
    validChanges.set(c.changeId, c);
    validChanges.set(c.field, c);
  });

  const validClaims = [];
  const rejectedClaims = [];

  for (const item of claims) {
    const claimText = item.claim || item.text || (typeof item === 'string' ? item : '');
    const changeId = item.changeId;

    let matched = null;
    if (changeId) {
      if (validChanges.has(changeId)) {
        matched = validChanges.get(changeId);
      }
    } else {
      // Search by explicit change name
      for (const [, chg] of validChanges.entries()) {
        if (chg.name && claimText.toLowerCase().includes(chg.name.toLowerCase())) {
          matched = chg;
          break;
        }
      }
    }

    if (matched) {
      validClaims.push({
        claim: claimText,
        changeId: matched.changeId,
        materiality: matched.materiality,
        direction: matched.direction,
        verificationStatus: 'GROUNDED',
        evidenceIds: matched.evidenceIds
      });
    } else {
      rejectedClaims.push({
        claim: claimText,
        changeId: changeId || 'UNKNOWN',
        verificationStatus: 'UNGROUNDED',
        reason: 'Claim did not match any verified deterministic change event in the sealed package.'
      });
    }
  }

  return {
    isValid: rejectedClaims.length === 0,
    validClaims,
    rejectedClaims
  };
}
