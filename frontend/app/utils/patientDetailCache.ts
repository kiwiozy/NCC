/**
 * Patient Detail Cache (Tier 2) - Full patient data caching on-demand
 * 
 * Purpose: Cache complete patient details when viewed (right sidebar)
 * Benefits:
 * - Fast detail loading (10ms vs 200ms API call)
 * - Reduced API calls
 * - LRU eviction keeps memory usage low
 * 
 * Strategy:
 * - Cache only when patient is viewed
 * - Keep last 50 viewed patients
 * - Shorter TTL (5 minutes) for fresher data
 */

const DB_NAME = 'nexus_cache';
const DB_VERSION = 1;
const STORE_NAME = 'patient_details';
const CACHE_VERSION = '1.0';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_PATIENTS = 50; // LRU limit

interface CacheEntry {
  patientId: string;
  version: string;
  timestamp: number;
  accessedAt: number; // For LRU eviction
  data: any; // Full patient object
}

export class PatientDetailCache {
  private static db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  private static async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Detail Cache: IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'patientId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('accessedAt', 'accessedAt', { unique: false });
          console.log('✅ Detail Cache: IndexedDB object store created');
        }
      };
    });
  }

  /**
   * Get cached patient detail if valid
   */
  static async get(patientId: string): Promise<any | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(patientId);

      return new Promise((resolve) => {
        request.onerror = () => {
          console.log('💾 Detail Cache: Miss (error reading)');
          resolve(null);
        };

        request.onsuccess = () => {
          const entry: CacheEntry | undefined = request.result;
          
          if (!entry) {
            console.log('💾 Detail Cache: Miss (not found)');
            resolve(null);
            return;
          }

          // Check version
          if (entry.version !== CACHE_VERSION) {
            console.log('🗑️ Detail Cache: Version mismatch');
            this.delete(patientId);
            resolve(null);
            return;
          }

          // Check TTL
          const age = Date.now() - entry.timestamp;
          if (age > CACHE_TTL_MS) {
            const ageSec = Math.round(age / 1000);
            console.log(`⏰ Detail Cache: Expired (age: ${ageSec}s)`);
            this.delete(patientId);
            resolve(null);
            return;
          }

          // Update access time for LRU
          entry.accessedAt = Date.now();
          store.put(entry);

          const ageSec = Math.round(age / 1000);
          const sizeKB = Math.round(JSON.stringify(entry.data).length / 1024);
          console.log(`💾 Detail Cache HIT! Patient ${patientId} (${sizeKB}KB, age: ${ageSec}s)`);
          resolve(entry.data);
        };
      });
    } catch (error) {
      console.error('❌ Detail Cache: Read error:', error);
      return null;
    }
  }

  /**
   * Set cache data for a patient
   */
  static async set(patientId: string, data: any): Promise<boolean> {
    try {
      const db = await this.initDB();
      
      // Check cache size and evict if needed
      await this.evictIfNeeded();
      
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const entry: CacheEntry = {
        patientId,
        version: CACHE_VERSION,
        timestamp: Date.now(),
        accessedAt: Date.now(),
        data,
      };

      const request = store.put(entry);

      return new Promise((resolve) => {
        request.onerror = () => {
          console.error('❌ Detail Cache: Write error:', request.error);
          resolve(false);
        };

        request.onsuccess = () => {
          const sizeKB = Math.round(JSON.stringify(data).length / 1024);
          console.log(`✅ Detail Cache: Cached patient ${patientId} (~${sizeKB}KB)`);
          resolve(true);
        };
      });
    } catch (error) {
      console.error('❌ Detail Cache: Write error:', error);
      return false;
    }
  }

  /**
   * Update a single patient in the detail cache
   */
  static async updatePatient(
    patientId: string,
    updates: Partial<any>
  ): Promise<boolean> {
    const cached = await this.get(patientId);
    
    if (!cached) {
      console.log('⚠️ Detail Cache: Patient not cached:', patientId);
      return false;
    }
    
    // Merge updates
    const updated = { ...cached, ...updates };
    
    // Save back
    const success = await this.set(patientId, updated);
    
    if (success) {
      console.log(`✅ Detail Cache: Updated patient ${patientId}:`, {
        updated: Object.keys(updates),
      });
    }
    
    return success;
  }

  /**
   * Delete a patient from cache
   */
  static async delete(patientId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(patientId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          console.log(`🗑️ Detail Cache: Deleted patient ${patientId}`);
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Detail Cache: Failed to delete');
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Detail Cache: Delete error:', error);
    }
  }

  /**
   * Clear all cached patients
   */
  static async clear(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          console.log('🗑️ Detail Cache: Cleared all patients');
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Detail Cache: Failed to clear');
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Detail Cache: Clear error:', error);
    }
  }

  /**
   * Evict oldest entries if cache exceeds limit (LRU)
   */
  private static async evictIfNeeded(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('accessedAt');
      const countRequest = store.count();

      return new Promise((resolve) => {
        countRequest.onsuccess = () => {
          const count = countRequest.result;
          
          if (count < MAX_CACHED_PATIENTS) {
            resolve();
            return;
          }

          // Get all entries sorted by access time (oldest first)
          const getAllRequest = index.getAll();
          
          getAllRequest.onsuccess = () => {
            const entries: CacheEntry[] = getAllRequest.result;
            
            // Sort by accessedAt (oldest first)
            entries.sort((a, b) => a.accessedAt - b.accessedAt);
            
            // Delete oldest entries to get back under limit
            const toDelete = count - MAX_CACHED_PATIENTS + 1;
            
            console.log(`🗑️ Detail Cache: Evicting ${toDelete} oldest entries (LRU)`);
            
            for (let i = 0; i < toDelete; i++) {
              store.delete(entries[i].patientId);
            }
            
            resolve();
          };
          
          getAllRequest.onerror = () => {
            resolve(); // Don't block on eviction errors
          };
        };
        
        countRequest.onerror = () => {
          resolve(); // Don't block on eviction errors
        };
      });
    } catch (error) {
      console.error('❌ Detail Cache: Eviction error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{ count: number; sizeMB: number }> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entries: CacheEntry[] = request.result;
          const totalSize = entries.reduce((sum, entry) => {
            return sum + JSON.stringify(entry.data).length;
          }, 0);
          
          resolve({
            count: entries.length,
            sizeMB: totalSize / (1024 * 1024),
          });
        };

        request.onerror = () => {
          resolve({ count: 0, sizeMB: 0 });
        };
      });
    } catch (error) {
      console.error('❌ Detail Cache: Stats error:', error);
      return { count: 0, sizeMB: 0 };
    }
  }
}

