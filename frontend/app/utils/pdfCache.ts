/**
 * PDF Cache Utility using IndexedDB
 * 
 * Caches PDF documents locally to avoid CORS issues and improve performance.
 * Automatically cleans up old entries based on age and storage limits.
 */

const DB_NAME = 'walkeasy-pdf-cache';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_STORAGE_MB = 100; // 100MB max cache size
const CLEANUP_THRESHOLD_MB = 80; // Start cleanup when cache exceeds 80MB

interface CachedPDF {
  documentId: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  cachedAt: number;
  size: number;
}

class PDFCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'documentId' });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get cached PDF by document ID
   */
  async get(documentId: string): Promise<Blob | null> {
    await this.init();

    if (!this.db) {
      console.error('IndexedDB not initialized');
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(documentId);

      request.onsuccess = () => {
        const cached = request.result as CachedPDF | undefined;
        
        if (!cached) {
          resolve(null);
          return;
        }

        // Check if cache is expired
        const age = Date.now() - cached.cachedAt;
        if (age > MAX_AGE_MS) {
          // Cache expired, delete it
          this.delete(documentId);
          resolve(null);
          return;
        }

        resolve(cached.blob);
      };

      request.onerror = () => {
        console.error('Error reading from cache:', request.error);
        resolve(null); // Return null on error, don't reject
      };
    });
  }

  /**
   * Cache a PDF blob
   */
  async set(documentId: string, blob: Blob, mimeType: string, fileName: string): Promise<void> {
    await this.init();

    if (!this.db) {
      console.error('IndexedDB not initialized');
      return;
    }

    // Check cache size before adding
    await this.cleanupIfNeeded(blob.size);

    const cached: CachedPDF = {
      documentId,
      blob,
      mimeType,
      fileName,
      cachedAt: Date.now(),
      size: blob.size,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cached);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error caching PDF:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a cached PDF
   */
  async delete(documentId: string): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(documentId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error deleting from cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get total cache size in bytes
   */
  private async getCacheSize(): Promise<number> {
    await this.init();

    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedPDF[];
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        resolve(totalSize);
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  }

  /**
   * Clean up old or excess cache entries
   */
  private async cleanupIfNeeded(newItemSize: number): Promise<void> {
    await this.init();

    if (!this.db) return;

    const currentSize = await this.getCacheSize();
    const newSize = currentSize + newItemSize;
    const newSizeMB = newSize / (1024 * 1024);

    // If adding this item would exceed threshold, clean up
    if (newSizeMB > CLEANUP_THRESHOLD_MB) {
      await this.cleanup();
    }
  }

  /**
   * Clean up cache: remove expired entries and oldest entries if still over limit
   */
  async cleanup(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('cachedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedPDF[];
        const now = Date.now();
        
        // Separate expired and valid items
        const expired: CachedPDF[] = [];
        const valid: CachedPDF[] = [];
        
        items.forEach(item => {
          const age = now - item.cachedAt;
          if (age > MAX_AGE_MS) {
            expired.push(item);
          } else {
            valid.push(item);
          }
        });

        // Delete expired items
        expired.forEach(item => {
          store.delete(item.documentId);
        });

        // Calculate current size
        let currentSize = valid.reduce((sum, item) => sum + item.size, 0);
        const maxSizeBytes = MAX_STORAGE_MB * 1024 * 1024;

        // If still over limit, delete oldest entries
        if (currentSize > maxSizeBytes) {
          // Sort by cachedAt (oldest first)
          valid.sort((a, b) => a.cachedAt - b.cachedAt);
          
          for (const item of valid) {
            if (currentSize <= maxSizeBytes) break;
            store.delete(item.documentId);
            currentSize -= item.size;
          }
        }

        resolve();
      };

      request.onerror = () => {
        resolve(); // Don't reject on cleanup errors
      };
    });
  }

  /**
   * Clear all cached PDFs
   */
  async clear(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; sizeMB: number }> {
    await this.init();

    if (!this.db) return { count: 0, sizeMB: 0 };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedPDF[];
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        resolve({
          count: items.length,
          sizeMB: totalSize / (1024 * 1024),
        });
      };

      request.onerror = () => {
        resolve({ count: 0, sizeMB: 0 });
      };
    });
  }
}

// Export singleton instance
export const pdfCache = new PDFCache();

// Auto-cleanup on page load (runs in background)
if (typeof window !== 'undefined') {
  pdfCache.cleanup().catch(err => {
    console.warn('Background cache cleanup failed:', err);
  });
}

