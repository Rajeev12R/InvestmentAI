// server/infrastructure/persistence/index.js
// ESM

export {
    getPersistentStore,
    setPersistentStore,
    initializePersistence,
    closePersistence,
  } from './store.js';
  
  export {
    assertAuthoritativeFinancialData,
  } from './assert-authoritative.js';