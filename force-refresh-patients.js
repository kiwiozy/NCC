// Run this in the browser console to clear patient cache and force refresh
// This will make patients pick up the clinic colors from the database

async function clearPatientCache() {
  console.log('🗑️ Clearing patient list cache...');
  
  try {
    // Open IndexedDB
    const dbName = 'nexus_cache_v2';
    const request = indexedDB.open(dbName);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['patient_list'], 'readwrite');
      const store = transaction.objectStore('patient_list');
      
      // Clear all cached data
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = function() {
        console.log('✅ Patient cache cleared!');
        console.log('🔄 Please refresh the page to reload patients with clinic colors');
        alert('Cache cleared! Please refresh the page (F5 or Cmd+R)');
      };
      
      clearRequest.onerror = function() {
        console.error('❌ Failed to clear cache');
      };
    };
    
    request.onerror = function() {
      console.error('❌ Failed to open IndexedDB');
    };
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run it
clearPatientCache();
