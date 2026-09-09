// server/infrastructure/persistence/assert-authoritative.js
// ESM

const SYNTHETIC_KEYS = new Set([
    'mock',
    'mocked',
    'demo',
    'sample',
    'synthetic',
    'fixture',
    'placeholder',
    'fake',
    'defaultValue',
    'fallback',
  ]);
  
  const FINANCIAL_KEYS = new Set([
    'marketValue',
    'costBasis',
    'unrealizedPnL',
    'realizedPnL',
    'return',
    'returnPct',
    'twr',
    'mwr',
    'volatility',
    'sharpeRatio',
    'trackingError',
    'var95',
    'var99',
    'es95',
    'es99',
    'expectedReturn',
    'benchmarkReturn',
    'activeReturn',
    'drawdown',
    'hhi',
    'effectivePositions',
  ]);
  
  export function assertAuthoritativeFinancialData(
    value,
    path = 'data'
  ) {
    walk(value, path);
    return true;
  }
  
  function walk(value, path) {
    if (
      value === null ||
      value === undefined
    ) {
      return;
    }
  
    if (
      typeof value === 'number' &&
      !Number.isFinite(value)
    ) {
      throw new Error(
        `Non-finite numeric value at ${path}`
      );
    }
  
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(
          item,
          `${path}[${index}]`
        );
      });
  
      return;
    }
  
    if (
      typeof value !== 'object'
    ) {
      return;
    }
  
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey =
        String(key).toLowerCase();
  
      if (
        SYNTHETIC_KEYS.has(key) ||
        [...SYNTHETIC_KEYS].some(
          (token) =>
            normalizedKey.includes(
              token.toLowerCase()
            )
        )
      ) {
        throw new Error(
          `Synthetic/default data detected at ${path}.${key}`
        );
      }
  
      if (
        FINANCIAL_KEYS.has(key) &&
        child !== null &&
        child !== undefined
      ) {
        if (
          typeof child !== 'number' ||
          !Number.isFinite(child)
        ) {
          throw new Error(
            `Financial field ${path}.${key} must contain an authoritative finite number`
          );
        }
      }
  
      walk(
        child,
        `${path}.${key}`
      );
    }
  }