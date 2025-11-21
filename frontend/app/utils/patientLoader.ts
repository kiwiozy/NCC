/**
 * Patient Loader - Simple & Bulletproof Caching System
 * 
 * Architecture:
 * - Cache: Lightweight patient list ONLY (for left sidebar) - ~280KB, loads in <10ms
 * - No cache: Full patient details - Always fetched fresh from database when clicked
 * 
 * Benefits:
 * - Initial load: <10ms from cache
 * - Patient data: Always fresh (no stale data issues)
 * - Simple: One cache to manage
 * - FAST: No complex cache logic, no overhead
 */

import { PatientListCache, PatientListItem } from './patientListCache';

export interface LoadOptions {
  archived: boolean;
  search?: string;
}

export interface LoadResult {
  listItems: PatientListItem[];
  fromCache: boolean;
  loadTime: number;
}

/**
 * Extract lightweight list item from full patient data
 */
function extractListItem(patient: any): PatientListItem {
  return {
    id: patient.id,
    title: patient.title || '',
    first_name: patient.first_name || '',
    last_name: patient.last_name || '',
    clinic: patient.clinic?.name || '',
    clinic_color: patient.clinic?.color || undefined,
    funding_source: patient.funding_source || '',
    dob: patient.dob,
    age: patient.age || 0,
    health_number: patient.health_number || '',
    mrn: patient.mrn || '',
    archived: patient.archived || false,
  };
}

/**
 * Load patient list (LEFT SIDEBAR)
 * Returns lightweight list items cached for fast display
 */
export async function loadPatientList(options: LoadOptions): Promise<LoadResult> {
  const startTime = Date.now();
  
  // Try cache first
  const listCache = await PatientListCache.get(options);
  
  if (listCache) {
    console.log(`💾 List Cache HIT! Loaded ${listCache.length} patients (${Date.now() - startTime}ms)`);
    return {
      listItems: listCache,
      fromCache: true,
      loadTime: Date.now() - startTime,
    };
  }
  
  // Cache miss - load from API
  console.log('💾 List Cache MISS - loading from API...');
  
  const params = new URLSearchParams();
  if (options.search) {
    params.append('search', options.search);
  }
  params.append('archived', String(options.archived));
  
  // Fetch ALL patients by paginating
  let allPatients: any[] = [];
  let nextUrl: string | null = `https://localhost:8000/api/patients/?${params.toString()}`;
  let pageCount = 0;
  
  while (nextUrl) {
    const response = await fetch(nextUrl, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error(`Failed to load patients: ${response.status}`);
    }
    
    const data = await response.json();
    allPatients = allPatients.concat(data.results || []);
    nextUrl = data.next;
    pageCount++;
    
    // Progress logging every 5 pages
    if (pageCount % 5 === 0) {
      console.log(`   Loaded ${allPatients.length} patients (page ${pageCount})...`);
    }
  }
  
  console.log(`✅ Loaded ${allPatients.length} total patients in ${pageCount} pages`);
  
  // Extract lightweight list items
  const listItems = allPatients.map(extractListItem);
  
  // Cache the list
  await PatientListCache.set(listItems, options);
  console.log(`✅ Cached ${listItems.length} patients to List Cache (~${Math.round(JSON.stringify(listItems).length / 1024)}KB)`);
  
  return {
    listItems,
    fromCache: false,
    loadTime: Date.now() - startTime,
  };
}

/**
 * Load full patient details (NO CACHE - always fresh from database)
 * Loads on-demand when a patient is clicked
 */
export async function loadPatientDetail(patientId: string): Promise<any> {
  const startTime = Date.now();
  
  console.log(`📥 Loading patient ${patientId} from database...`);
  
  const response = await fetch(`https://localhost:8000/api/patients/${patientId}/`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load patient ${patientId}: ${response.status}`);
  }
  
  const patient = await response.json();
  console.log(`✅ Loaded patient ${patientId} from database (${Date.now() - startTime}ms)`);
  
  return patient;
}

/**
 * Update patient list item after edit (smart cache update)
 */
export async function updatePatientListItem(
  patientId: string,
  updates: Partial<PatientListItem>,
  options: { archived: boolean }
): Promise<boolean> {
  return await PatientListCache.updatePatient(patientId, updates, options.archived);
}

/**
 * Clear list cache (use sparingly!)
 */
export async function clearListCache(): Promise<void> {
  await PatientListCache.clear();
  console.log('🗑️ List cache cleared');
}
