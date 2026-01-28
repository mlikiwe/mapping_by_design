"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

const DB_NAME = 'RoundtripMappingDB';
const DB_VERSION = 1;
const STORE_NAME = 'mappingData';

/**
 * Helper untuk membuka IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Simpan data ke IndexedDB
 */
async function saveToIndexedDB<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key, value, timestamp: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Baca data dari IndexedDB
 */
async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Hapus data dari IndexedDB
 */
async function deleteFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch {
    // Ignore errors on delete
  }
}

/**
 * Hapus semua data dari IndexedDB
 */
async function clearAllFromIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch {
    // Ignore errors on clear
  }
}

/**
 * Custom hook untuk menyimpan state ke IndexedDB
 * Kapasitas jauh lebih besar dari localStorage (ratusan MB)
 */
export function useIndexedDB<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const pendingWrite = useRef<T | null>(null);

  // Load dari IndexedDB saat mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    loadFromIndexedDB<T>(key)
      .then((value) => {
        if (value !== null) {
          setStoredValue(value);
        }
        isInitialized.current = true;
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(`Error loading from IndexedDB key "${key}":`, error);
        isInitialized.current = true;
        setIsLoading(false);
      });
  }, [key]);

  // Setter function
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const newValue = value instanceof Function ? value(prev) : value;
      
      // Save to IndexedDB asynchronously
      if (isInitialized.current) {
        saveToIndexedDB(key, newValue).catch((error) => {
          console.error(`Error saving to IndexedDB key "${key}":`, error);
        });
      } else {
        pendingWrite.current = newValue;
      }
      
      return newValue;
    });
  }, [key]);

  // Clear function
  const clearValue = useCallback(() => {
    setStoredValue(initialValue);
    deleteFromIndexedDB(key).catch((error) => {
      console.error(`Error deleting from IndexedDB key "${key}":`, error);
    });
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue, isLoading];
}

/**
 * Key untuk IndexedDB storage
 */
export const STORAGE_KEYS = {
  MAPPING_RESULTS: 'roundtrip_mapping_results',
  MAPPING_STATS: 'roundtrip_mapping_stats',
  VIEW_STATE: 'roundtrip_view_state',
} as const;

/**
 * Clear all mapping data (untuk reset)
 */
export async function clearAllMappingData(): Promise<void> {
  await clearAllFromIndexedDB();
}
