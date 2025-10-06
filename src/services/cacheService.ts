import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Pokemon, PokemonRating } from './pokemonService';

// Cache keys
const CACHE_KEYS = {
  POKEMON_DATA: 'lgdex_pokemon_data',
  POKEMON_TIMESTAMP: 'lgdex_pokemon_timestamp',
  RATINGS_DATA: 'lgdex_ratings_data', 
  RATINGS_TIMESTAMP: 'lgdex_ratings_timestamp',
  LAST_CHECK: 'lgdex_last_check'
};

// Firestore metadata collection
const METADATA_COLLECTION = 'metadata';
const POKEMON_META_DOC = 'pokemon_last_modified';
const RATINGS_META_DOC = 'ratings_last_modified';

// Cache duration fallback (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check for changes every 30 seconds

interface CacheData<T> {
  data: T;
  timestamp: number;
}

// Get data from localStorage cache
function getFromCache<T>(key: string): CacheData<T> | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  return null;
}

// Save data to localStorage cache
function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

// Get last modified timestamp from Firebase
async function getLastModifiedTimestamp(docId: string): Promise<number> {
  try {
    const docRef = doc(db, METADATA_COLLECTION, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.lastModified?.toDate?.()?.getTime() || 0;
    }
  } catch (error) {
    console.error(`Error getting last modified timestamp for ${docId}:`, error);
  }
  return 0;
}

// Update last modified timestamp in Firebase
export async function updateLastModifiedTimestamp(docId: string): Promise<void> {
  try {
    const docRef = doc(db, METADATA_COLLECTION, docId);
    await setDoc(docRef, {
      lastModified: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error(`Error updating last modified timestamp for ${docId}:`, error);
  }
}

// Check if we need to refresh data based on server changes
async function needsRefresh(cacheKey: string, metaDocId: string): Promise<boolean> {
  const cached = getFromCache(cacheKey);
  
  // No cache exists, need to fetch
  if (!cached) {
    return true;
  }
  
  // Check if cache is too old (fallback safety)
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    console.log(`Cache expired for ${cacheKey}, forcing refresh`);
    return true;
  }
  
  // Check if we've checked recently to avoid too many metadata reads
  const lastCheck = localStorage.getItem(CACHE_KEYS.LAST_CHECK);
  const lastCheckTime = lastCheck ? parseInt(lastCheck) : 0;
  
  if (now - lastCheckTime < CHECK_INTERVAL) {
    // We checked recently, assume no changes
    return false;
  }
  
  try {
    // Check server timestamp
    const serverTimestamp = await getLastModifiedTimestamp(metaDocId);
    localStorage.setItem(CACHE_KEYS.LAST_CHECK, now.toString());
    
    // Compare with cached timestamp
    const needsUpdate = serverTimestamp > cached.timestamp;
    
    if (needsUpdate) {
      console.log(`Server data newer than cache for ${cacheKey}, refreshing`);
    } else {
      console.log(`Cache is up to date for ${cacheKey}`);
    }
    
    return needsUpdate;
  } catch (error) {
    console.error('Error checking server timestamp:', error);
    // On error, check cache age as fallback
    return now - cached.timestamp > CACHE_DURATION;
  }
}

// Cached Pokemon data functions
export async function getCachedPokemonData(
  fetchFunction: () => Promise<Pokemon[]>
): Promise<Pokemon[]> {
  const shouldRefresh = await needsRefresh(CACHE_KEYS.POKEMON_DATA, POKEMON_META_DOC);
  
  if (!shouldRefresh) {
    const cached = getFromCache<Pokemon[]>(CACHE_KEYS.POKEMON_DATA);
    if (cached) {
      console.log('Using cached Pokemon data');
      return cached.data;
    }
  }
  
  console.log('Fetching fresh Pokemon data from Firebase');
  const freshData = await fetchFunction();
  saveToCache(CACHE_KEYS.POKEMON_DATA, freshData);
  return freshData;
}

// Cached ratings data functions
export async function getCachedRatingsData(
  fetchFunction: () => Promise<{ [pokemonId: string]: PokemonRating }>
): Promise<{ [pokemonId: string]: PokemonRating }> {
  const shouldRefresh = await needsRefresh(CACHE_KEYS.RATINGS_DATA, RATINGS_META_DOC);
  
  if (!shouldRefresh) {
    const cached = getFromCache<{ [pokemonId: string]: PokemonRating }>(CACHE_KEYS.RATINGS_DATA);
    if (cached) {
      console.log('Using cached ratings data');
      return cached.data;
    }
  }
  
  console.log('Fetching fresh ratings data from Firebase');
  const freshData = await fetchFunction();
  saveToCache(CACHE_KEYS.RATINGS_DATA, freshData);
  return freshData;
}

// Clear all cache
export function clearAllCache(): void {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('All cache cleared');
}

// Clear only ratings cache to fix rating staleness
export function clearRatingsCache(): void {
  localStorage.removeItem(CACHE_KEYS.RATINGS_DATA);
  localStorage.removeItem(CACHE_KEYS.LAST_CHECK);
  console.log('Ratings cache cleared');
}

// Clear only Pokemon cache to fix Pokemon data staleness
export function clearPokemonCache(): void {
  localStorage.removeItem(CACHE_KEYS.POKEMON_DATA);
  localStorage.removeItem(CACHE_KEYS.LAST_CHECK);
  console.log('Pokemon cache cleared');
}

// Clear cache immediately after data changes for instant UI updates
export function clearCacheAfterChange(): void {
  localStorage.removeItem(CACHE_KEYS.POKEMON_DATA);
  localStorage.removeItem(CACHE_KEYS.RATINGS_DATA);
  localStorage.removeItem(CACHE_KEYS.LAST_CHECK);
  console.log('Cache cleared after data change - next load will be fresh');
}

// Get cache stats for debugging
export function getCacheStats() {
  return {
    pokemonCached: !!getFromCache(CACHE_KEYS.POKEMON_DATA),
    ratingsCached: !!getFromCache(CACHE_KEYS.RATINGS_DATA),
    lastCheck: localStorage.getItem(CACHE_KEYS.LAST_CHECK),
    cacheSize: Object.values(CACHE_KEYS).reduce((size, key) => {
      const item = localStorage.getItem(key);
      return size + (item ? item.length : 0);
    }, 0)
  };
}