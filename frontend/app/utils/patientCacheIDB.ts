/**
 * Patient Cache Utility (IndexedDB Version)
 * 
 * Uses IndexedDB for larger storage capacity (250MB+ vs localStorage's 5-10MB)
 * Perfect for caching large datasets like patient records
 */

const DB_NAME = 'nexus_cache';
const DB_VERSION = 1;
const STORE_NAME = 'patients';
const CACHE_KEY = 'patient_data';
const CACHE_VERSION = '1.0';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  version: string;
  timestamp: number;
  data: any[];
  filters: {
    archived: boolean;
    search?: string;
  };
}

export class PatientCacheIDB {
  private static db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  private static async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          console.log('✅ IndexedDB object store created');
        }
      };
    });
  }

  /**
   * Check if cache exists and is valid
   */
  static async isValid(filters: { archived: boolean; search?: string }): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(CACHE_KEY);
      
      return new Promise((resolve) => {
        request.onerror = () => {
          console.log('💾 No cache found (error reading)');
          resolve(false);
        };

        request.onsuccess = () => {
          const entry: CacheEntry | undefined = request.result;
          
          if (!entry) {
            console.log('💾 No cache found');
            resolve(false);
            return;
          }

          console.log('💾 Cache found:', {
            version: entry.version,
            age: Math.round((Date.now() - entry.timestamp) / 1000) + 's',
            count: entry.data?.length || 0,
            filters: entry.filters,
            requestedFilters: filters,
          });

          // Check version
          if (entry.version !== CACHE_VERSION) {
            console.log('🗑️ Cache version mismatch, invalidating...');
            this.clear();
            resolve(false);
            return;
          }

          // Check TTL
          const age = Date.now() - entry.timestamp;
          if (age > CACHE_TTL_MS) {
            console.log(`⏰ Cache expired (age: ${Math.round(age / 1000)}s), invalidating...`);
            this.clear();
            resolve(false);
            return;
          }

          // Check if filters match
          if (entry.filters.archived !== filters.archived) {
            console.log('🔍 Filter mismatch (archived)', entry.filters.archived, '!==', filters.archived);
            resolve(false);
            return;
          }

          if (entry.filters.search !== filters.search) {
            console.log('🔍 Filter mismatch (search)', JSON.stringify(entry.filters.search), '!==', JSON.stringify(filters.search));
            resolve(false);
            return;
          }

          resolve(true);
        };
      });
    } catch (error) {
      console.error('❌ Cache validation error:', error);
      return false;
    }
  }

  /**
   * Get cached data if valid
   */
  static async get(filters: { archived: boolean; search?: string }): Promise<any[] | null> {
    const valid = await this.isValid(filters);
    if (!valid) return null;

    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);

      return new Promise((resolve) => {
        request.onerror = () => {
          console.error('❌ Cache read error');
          resolve(null);
        };

        request.onsuccess = () => {
          const entry: CacheEntry | undefined = request.result;
          if (!entry) {
            resolve(null);
            return;
          }

          const age = Math.round((Date.now() - entry.timestamp) / 1000);
          console.log(`💾 Cache hit! Loaded ${entry.data.length} patients from IndexedDB (age: ${age}s)`);
          resolve(entry.data);
        };
      });
    } catch (error) {
      console.error('❌ Cache read error:', error);
      return null;
    }
  }

  /**
   * Set cache data
   */
  static async set(data: any[], filters: { archived: boolean; search?: string }): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const entry: CacheEntry = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        data,
        filters,
      };

      const request = store.put(entry, CACHE_KEY);

      return new Promise((resolve) => {
        request.onerror = () => {
          console.error('❌ IndexedDB write error:', request.error);
          resolve(false);
        };

        request.onsuccess = () => {
          const sizeEstimate = JSON.stringify(data).length / 1024;
          console.log(`✅ Cached ${data.length} patients to IndexedDB (~${Math.round(sizeEstimate)}KB)`);
          resolve(true);
        };
      });
    } catch (error) {
      console.error('❌ Cache write error:', error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  static async clear(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(CACHE_KEY);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          console.log('🗑️ IndexedDB cache cleared');
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Failed to clear cache');
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  /**
   * Trigger background refresh (non-blocking)
   */
  static async backgroundRefresh(
    filters: { archived: boolean; search?: string },
    onUpdate?: (data: any[]) => void
  ): Promise<void> {
    console.log('🔄 Starting background cache refresh...');
    
    try {
      const params = new URLSearchParams();
      params.append('archived', String(filters.archived));
      if (filters.search) {
        params.append('search', filters.search);
      }

      let allPatients: any[] = [];
      let nextUrl: string | null = `https://localhost:8000/api/patients/?${params.toString()}`;
      
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const patients = data.results || data;
          allPatients = allPatients.concat(patients);
          nextUrl = data.next;
        } else {
          break;
        }
      }
      
      // Update cache
      await this.set(allPatients, filters);
      
      // Notify caller
      if (onUpdate) {
        onUpdate(allPatients);
      }
      
      console.log(`✅ Background refresh complete: ${allPatients.length} patients`);
    } catch (error) {
      console.error('❌ Background refresh failed:', error);
    }
  }
}

