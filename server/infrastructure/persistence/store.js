// server/infrastructure/persistence/store.js
// ESM — package.json has: "type": "module"

import {
    createStorageAdapter,
  } from '../storage.adapter.js';
  
  let persistentStore = null;
  
  export function getPersistentStore() {
    if (persistentStore) {
      return persistentStore;
    }
  
    persistentStore = createStorageAdapter();
  
    return persistentStore;
  }
  
  export function setPersistentStore(store) {
    if (!store) {
      throw new Error(
        'setPersistentStore requires a storage adapter'
      );
    }
  
    persistentStore = store;
  
    return persistentStore;
  }
  
  export async function initializePersistence() {
    const store = getPersistentStore();
  
    if (
      typeof store.connect === 'function'
    ) {
      await store.connect();
    }
  
    return store;
  }
  
  export async function closePersistence() {
    if (
      persistentStore &&
      typeof persistentStore.close === 'function'
    ) {
      await persistentStore.close();
    }
  
    persistentStore = null;
  }