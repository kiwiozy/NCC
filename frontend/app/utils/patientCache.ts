/**
 * Patient Cache Utility
 * 
 * Provides localStorage-based caching for patient data with:
 * - Automatic cache invalidation (configurable TTL)
 * - Version tracking for cache busting
 * - Compression via JSON stringification
 * - Size management
 */

const CACHE_KEY = 'nexus_patients_cache';
const CACHE_VERSION = '1.0'; // Increment to invalidate all caches
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL

interface CacheEntry {
  version: string;
  timestamp: number;
  data: any[];
  filters: {
    archived: boolean;
    search?: string;
  };
}

export class PatientCache {
  /**
   * Check if cache exists and is valid
   */
  static isValid(filters: { archived: boolean; search?: string }): boolean {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        console.log('💾 No cache found');
        return false;
      }

      const entry: CacheEntry = JSON.parse(cached);
      
      console.log('💾 Cache found:', {
        version: entry.version,
        age: Math.round((Date.now() - entry.timestamp) / 1000) + 's',
        filters: entry.filters,
        requestedFilters: filters,
      });
      
      // Check version
      if (entry.version !== CACHE_VERSION) {
        console.log('🗑️ Cache version mismatch, invalidating...');
        this.clear();
        return false;
      }

      // Check TTL
      const age = Date.now() - entry.timestamp;
      if (age > CACHE_TTL_MS) {
        console.log(`⏰ Cache expired (age: ${Math.round(age / 1000)}s), invalidating...`);
        this.clear();
        return false;
      }

      // Check if filters match
      if (entry.filters.archived !== filters.archived) {
        console.log('🔍 Filter mismatch (archived)', entry.filters.archived, '!==', filters.archived);
        return false;
      }

      if (entry.filters.search !== filters.search) {
        console.log('🔍 Filter mismatch (search)', JSON.stringify(entry.filters.search), '!==', JSON.stringify(filters.search));
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Cache validation error:', error);
      this.clear();
      return false;
    }
  }

  /**
   * Get cached data if valid
   */
  static get(filters: { archived: boolean; search?: string }): any[] | null {
    if (!this.isValid(filters)) return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);
      const age = Math.round((Date.now() - entry.timestamp) / 1000);
      console.log(`💾 Cache hit! Loaded ${entry.data.length} patients from cache (age: ${age}s)`);
      
      return entry.data;
    } catch (error) {
      console.error('❌ Cache read error:', error);
      this.clear();
      return null;
    }
  }

  /**
   * Set cache data
   */
  static set(data: any[], filters: { archived: boolean; search?: string }): boolean {
    try {
      const entry: CacheEntry = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        data,
        filters,
      };

      const serialized = JSON.stringify(entry);
      
      // Check size (localStorage has ~5-10MB limit)
      const sizeKB = Math.round(serialized.length / 1024);
      if (sizeKB > 5000) {
        console.warn(`⚠️ Cache size too large (${sizeKB}KB), skipping cache...`);
        return false;
      }

      localStorage.setItem(CACHE_KEY, serialized);
      console.log(`✅ Cached ${data.length} patients (${sizeKB}KB)`);
      return true;
    } catch (error) {
      console.error('❌ Cache write error:', error);
      // QuotaExceededError - storage full
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, clearing cache...');
        this.clear();
      }
      return false;
    }
  }

  /**
   * Clear cache
   */
  static clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  /**
   * Get cache info for debugging
   */
  static getInfo(): { exists: boolean; age?: number; size?: number; count?: number } {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return { exists: false };

      const entry: CacheEntry = JSON.parse(cached);
      const age = Math.round((Date.now() - entry.timestamp) / 1000);
      const size = Math.round(cached.length / 1024);

      return {
        exists: true,
        age,
        size,
        count: entry.data.length,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Trigger background refresh (non-blocking)
   * Returns a promise that resolves when refresh completes
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
        const response = await fetch(nextUrl);
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
      this.set(allPatients, filters);
      
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

