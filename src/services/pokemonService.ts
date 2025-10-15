import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDoc,
  query, 
  orderBy, 
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';
import { getCachedPokemonData, getCachedRatingsData, updateLastModifiedTimestamp, clearCacheAfterChange } from './cacheService';

export interface Pokemon {
  id: string; // Firebase document ID
  pokedexNumber: number; // Dynamic position in Pokedex (grows as needed)
  name: string;
  artist: string;
  imageUrl: string;
  additionalImages?: string[]; // Array of up to 3 additional image URLs
  types: string[];
  unique?: string; // U0, U1, U2 for unique Pokemon
  evolutionStage?: number; // 0=base, 1=first evo, 2=second evo, 3=GMAX, 4=Legendary, 5=MEGA
  info?: string; // Optional info text for tooltip display
  favoriteCount?: number; // Total number of favorites for this Pokemon
  artworkDate?: Date; // Date when the artwork was created
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = 'pokemon';

// Upload image to Cloudinary
export const uploadPokemonImage = async (file: File, pokemonName: string): Promise<string | null> => {
  try {
    console.log('Uploading to Cloudinary...');
    
    // Create a unique filename with better formatting
    const timestamp = Date.now();
    const sanitizedName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const publicId = `${CLOUDINARY_CONFIG.DEFAULT_FOLDER}/${sanitizedName}-${timestamp}`;
    
    console.log('Uploading to Cloudinary with public_id:', publicId);
    
    // Create form data for Cloudinary upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append('public_id', publicId);
    formData.append('folder', CLOUDINARY_CONFIG.DEFAULT_FOLDER);
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Upload successful:', result);
    
    return result.secure_url;
  } catch (error) {
    console.error('Detailed upload error:', error);
    console.error('Error message:', (error as any)?.message);
    return null;
  }
};

// Get the next available Pokedex number (handles legendary placement)
export const getNextPokedexNumber = async (isLegendary: boolean = false): Promise<number> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('pokedexNumber'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 1;
    }
    
    // Get all existing Pokemon data
    const allPokemon = querySnapshot.docs.map(doc => ({
      pokedexNumber: doc.data().pokedexNumber,
      evolutionStage: doc.data().evolutionStage
    }));
    
    const existingNumbers = allPokemon.map(p => p.pokedexNumber);
    const regularPokemon = allPokemon.filter(p => p.evolutionStage !== 4);
    
    if (isLegendary) {
      // For legendaries, find the next available slot after all regular Pokemon
      const maxRegularNumber = regularPokemon.length > 0 
        ? Math.max(...regularPokemon.map(p => p.pokedexNumber))
        : 0;
      
      // Place legendary after all regular Pokemon
      for (let i = maxRegularNumber + 1; ; i++) {
        if (!existingNumbers.includes(i)) {
          return i;
        }
      }
    } else {
      // For regular Pokemon, ensure they are placed BEFORE any legendary Pokemon
      const legendaryPokemon = allPokemon.filter(p => p.evolutionStage === 4);
      
      if (legendaryPokemon.length === 0) {
        // No legendaries exist, find the first available slot
        const maxNumber = Math.max(...existingNumbers);
        for (let i = 1; i <= maxNumber + 1; i++) {
          if (!existingNumbers.includes(i)) {
            return i;
          }
        }
        return maxNumber + 1;
      } else {
        // Legendaries exist, find the first available slot BEFORE the first legendary
        const minLegendaryNumber = Math.min(...legendaryPokemon.map(p => p.pokedexNumber));
        
        // Look for gaps before legendaries
        for (let i = 1; i < minLegendaryNumber; i++) {
          if (!existingNumbers.includes(i)) {
            return i;
          }
        }
        
        // No gaps found before legendaries, we need to shift legendaries to make room
        // Return the position where the first legendary is, which will trigger a reorganization
        return minLegendaryNumber;
      }
    }
  } catch (error) {
    console.error('Error getting next Pokedex number:', error);
    return 1;
  }
};

// Reorganize all Pokemon to ensure legendaries are at the bottom
export const reorganizePokedex = async (): Promise<void> => {
  try {
    const allPokemon = await getAllPokemon();
    
    // Separate regular and legendary Pokemon
    const regularPokemon = allPokemon.filter(p => p.evolutionStage !== 4);
    const legendaryPokemon = allPokemon.filter(p => p.evolutionStage === 4);
    
    // Sort regular Pokemon by current pokedex number
    regularPokemon.sort((a, b) => (a.pokedexNumber || 0) - (b.pokedexNumber || 0));
    
    // Sort legendary Pokemon by current pokedex number
    legendaryPokemon.sort((a, b) => (a.pokedexNumber || 0) - (b.pokedexNumber || 0));
    
    // Batch update all Pokemon with new numbers
    const batch = [];
    
    // Assign numbers 1, 2, 3... to regular Pokemon
    for (let i = 0; i < regularPokemon.length; i++) {
      const pokemon = regularPokemon[i];
      const newNumber = i + 1;
      if (pokemon.pokedexNumber !== newNumber) {
        batch.push(updatePokemon(pokemon.id, { pokedexNumber: newNumber }));
      }
    }
    
    // Assign numbers after regular Pokemon to legendaries
    for (let i = 0; i < legendaryPokemon.length; i++) {
      const pokemon = legendaryPokemon[i];
      const newNumber = regularPokemon.length + i + 1;
      if (pokemon.pokedexNumber !== newNumber) {
        batch.push(updatePokemon(pokemon.id, { pokedexNumber: newNumber }));
      }
    }
    
    // Execute all updates
    await Promise.all(batch);
    console.log('Pokedex reorganized successfully');
  } catch (error) {
    console.error('Error reorganizing Pokedex:', error);
  }
};

// Get all Pokemon from Firebase
// Internal function to fetch Pokemon from Firebase (used by cache)
const fetchPokemonFromFirebase = async (): Promise<Pokemon[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('pokedexNumber'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        // Handle artworkDate safely - only convert if it exists and has toDate method, otherwise default to today
        artworkDate: (data.artworkDate && typeof data.artworkDate.toDate === 'function') 
          ? data.artworkDate.toDate() 
          : (data.createdAt && typeof data.createdAt.toDate === 'function') 
            ? data.createdAt.toDate() 
            : new Date(),
      } as Pokemon;
    });
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    return [];
  }
};

// Public function with caching
export const getAllPokemon = async (): Promise<Pokemon[]> => {
  return getCachedPokemonData(fetchPokemonFromFirebase);
};

// Add a new Pokemon
export const addPokemon = async (pokemon: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...pokemon,
      createdAt: now,
      updatedAt: now,
    });
    
    // Update last modified timestamp to invalidate cache
    await updateLastModifiedTimestamp('pokemon_last_modified');
    
    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding Pokemon:', error);
    return null;
  }
};

// Update a Pokemon
export const updatePokemon = async (id: string, updates: Partial<Pokemon>): Promise<boolean> => {
  try {
    const pokemonRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(pokemonRef, {
      ...updates,
      updatedAt: new Date(),
    });
    
    // Update last modified timestamp to invalidate cache
    await updateLastModifiedTimestamp('pokemon_last_modified');
    
    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();
    
    return true;
  } catch (error) {
    console.error('Error updating Pokemon:', error);
    return false;
  }
};

// Delete image from Cloudinary
export const deletePokemonImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract public_id from Cloudinary URL
    // Cloudinary URLs format: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/filename.ext
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('.')[0]; // Remove extension
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${filename}`;
    
    console.log('Attempting to delete Cloudinary image with public_id:', publicId);
    
    // Note: Deleting from Cloudinary requires admin API key, which shouldn't be exposed in frontend
    // For now, we'll just log the deletion attempt
    // In a production app, you'd want to handle deletion through your backend
    console.log('Image deletion would be handled by backend in production');
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

// Delete a Pokemon document only
export const deletePokemon = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    // Update last modified timestamp to invalidate cache
    await updateLastModifiedTimestamp('pokemon_last_modified');
    
    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();
    
    return true;
  } catch (error) {
    console.error('Error deleting Pokemon:', error);
    return false;
  }
};

// Delete a Pokemon and its image
export const deletePokemonWithImage = async (id: string, imageUrl: string): Promise<boolean> => {
  try {
    // Delete the image from storage first
    if (imageUrl) {
      await deletePokemonImage(imageUrl);
    }
    
    // Then delete the Pokemon document
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    // Update last modified timestamp to invalidate cache
    await updateLastModifiedTimestamp('pokemon_last_modified');
    
    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();
    
    return true;
  } catch (error) {
    console.error('Error deleting Pokemon with image:', error);
    return false;
  }
};

// Get Pokemon by artist
export const getPokemonByArtist = async (artist: string): Promise<Pokemon[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('artist', '==', artist),
      orderBy('pokedexNumber')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Pokemon[];
  } catch (error) {
    console.error('Error fetching Pokemon by artist:', error);
    return [];
  }
};

// Get Pokemon by type
export const getPokemonByType = async (type: string): Promise<Pokemon[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('types', 'array-contains', type),
      orderBy('pokedexNumber')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Pokemon[];
  } catch (error) {
    console.error('Error fetching Pokemon by type:', error);
    return [];
  }
};

// Get unique Pokemon only
export const getUniquePokemon = async (): Promise<Pokemon[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('unique', '!=', null),
      orderBy('unique'),
      orderBy('pokedexNumber')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Pokemon[];
  } catch (error) {
    console.error('Error fetching unique Pokemon:', error);
    return [];
  }
};

// Rating System Interfaces and Functions
export interface PokemonRating {
  pokemonId: string;
  ratings: { [deviceId: string]: number }; // Device ID -> Rating (1-10)
  averageRating: number;
  totalVotes: number;
  totalPoints: number; // New: Total points based on rating system
  lastUpdated: any; // Firebase Timestamp or Date
}

const RATINGS_COLLECTION = 'pokemon_ratings';

// Convert star rating to points using a progressive system (supports half-stars)
export const starsToPoints = (stars: number): number => {
  const pointMap: { [key: number]: number } = {
    0.5: 5,
    1: 10,
    1.5: 12.5,
    2: 15,
    2.5: 18,
    3: 21,
    3.5: 24.5,
    4: 28,
    4.5: 32,
    5: 36,
    5.5: 40.5,
    6: 45,
    6.5: 50,
    7: 55,
    7.5: 60.5,
    8: 66,
    8.5: 72,
    9: 78,
    9.5: 84.5,
    10: 91
  };
  return pointMap[stars] || 0;
};

// Save or update a rating for a Pokemon
export const saveRating = async (pokemonId: string, deviceId: string, rating: number): Promise<boolean> => {
  try {
    // Get existing rating document for this Pokemon
    const ratingsQuery = query(collection(db, RATINGS_COLLECTION), where('pokemonId', '==', pokemonId));
    const ratingsSnapshot = await getDocs(ratingsQuery);
    
    if (ratingsSnapshot.empty) {
      // Create new rating document
      const newRatingData: Omit<PokemonRating, 'id'> = {
        pokemonId,
        ratings: { [deviceId]: rating },
        averageRating: rating,
        totalVotes: 1,
        totalPoints: starsToPoints(rating),
        lastUpdated: new Date()
      };
      
      await addDoc(collection(db, RATINGS_COLLECTION), newRatingData);
      
      // Update last modified timestamp to invalidate ratings cache
      await updateLastModifiedTimestamp('ratings_last_modified');
    } else {
      // Update existing rating document
      const ratingDoc = ratingsSnapshot.docs[0];
      const currentData = ratingDoc.data() as PokemonRating;
      const updatedRatings = { ...currentData.ratings, [deviceId]: rating };
      
      // Calculate new average and total points
      const totalRatings = Object.values(updatedRatings).reduce((sum, r) => sum + r, 0);
      const totalVotes = Object.keys(updatedRatings).length;
      const averageRating = totalVotes > 0 ? totalRatings / totalVotes : 0;
      const totalPoints = Object.values(updatedRatings).reduce((sum, r) => sum + starsToPoints(r), 0);
      
      await updateDoc(doc(db, RATINGS_COLLECTION, ratingDoc.id), {
        ratings: updatedRatings,
        averageRating,
        totalVotes,
        totalPoints,
        lastUpdated: new Date()
      });
    }
    
    // Update last modified timestamp to invalidate ratings cache
    await updateLastModifiedTimestamp('ratings_last_modified');
    
    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();
    
    return true;
  } catch (error) {
    console.error('Error saving rating:', error);
    return false;
  }
};

// Get all ratings
// Internal function to fetch ratings from Firebase (used by cache)
const fetchRatingsFromFirebase = async (): Promise<{ [pokemonId: string]: PokemonRating }> => {
  try {
    const ratingsSnapshot = await getDocs(collection(db, RATINGS_COLLECTION));
    const ratings: { [pokemonId: string]: PokemonRating } = {};
    
    ratingsSnapshot.docs.forEach(doc => {
      const data = doc.data() as any;
      ratings[data.pokemonId] = {
        ...data,
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()
      };
    });
    
    return ratings;
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return {};
  }
};

// Public function with caching
export const getAllRatings = async (): Promise<{ [pokemonId: string]: PokemonRating }> => {
  return getCachedRatingsData(fetchRatingsFromFirebase);
};

// Get ratings for a specific Pokemon
export const getPokemonRating = async (pokemonId: string): Promise<PokemonRating | null> => {
  try {
    const ratingsQuery = query(collection(db, RATINGS_COLLECTION), where('pokemonId', '==', pokemonId));
    const ratingsSnapshot = await getDocs(ratingsQuery);
    
    if (ratingsSnapshot.empty) {
      return null;
    }
    
    const data = ratingsSnapshot.docs[0].data() as any;
    return {
      ...data,
      lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()
    };
  } catch (error) {
    console.error('Error fetching Pokemon rating:', error);
    return null;
  }
};

// Get global rankings of all Pokemon based on average star rating (with total points as tiebreaker)
export const getGlobalRankings = async (): Promise<{ pokemonId: string; rank: number; totalPoints: number }[]> => {
  try {
    const ratings = await getAllRatings();
    const pokemonRatings = Object.values(ratings).map(rating => ({
      pokemonId: rating.pokemonId,
      averageRating: rating.averageRating || 0,
      totalPoints: rating.totalPoints || 0
    }));
    
    // Sort by average star rating first (highest first), then by total points as tiebreaker (highest first)
    pokemonRatings.sort((a, b) => {
      // Primary sort: Average rating (highest first)
      if (a.averageRating !== b.averageRating) {
        return b.averageRating - a.averageRating;
      }
      // Tiebreaker: Total points (highest first)
      return b.totalPoints - a.totalPoints;
    });
    
    // Assign ranks
    return pokemonRatings.map((pokemon, index) => ({
      pokemonId: pokemon.pokemonId,
      rank: index + 1,
      totalPoints: pokemon.totalPoints
    }));
  } catch (error) {
    console.error('Error getting global rankings:', error);
    return [];
  }
};

// Get artist-specific rankings (Pokemon ranked within each artist's collection)
export const getArtistRankings = async (artist: string): Promise<{ pokemonId: string; rank: number; totalPoints: number }[]> => {
  try {
    const allPokemon = await getAllPokemon();
    const artistPokemon = allPokemon.filter(p => p.artist === artist);
    const ratings = await getAllRatings();
    
    const artistPokemonWithRatings = artistPokemon.map(pokemon => ({
      pokemonId: pokemon.id,
      averageRating: ratings[pokemon.id]?.averageRating || 0,
      totalPoints: ratings[pokemon.id]?.totalPoints || 0
    }));
    
    // Sort by average rating (highest first), then by total points as tiebreaker
    artistPokemonWithRatings.sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }
      return b.totalPoints - a.totalPoints;
    });
    
    // Assign ranks
    return artistPokemonWithRatings.map((pokemon, index) => ({
      pokemonId: pokemon.pokemonId,
      rank: index + 1,
      totalPoints: pokemon.totalPoints
    }));
  } catch (error) {
    console.error('Error getting artist rankings:', error);
    return [];
  }
};

// Reset all Pokemon ratings - DANGEROUS: This deletes ALL rating data!
export const resetAllRatings = async (): Promise<boolean> => {
  try {
    console.log('🚨 RESETTING ALL POKEMON RATINGS...');
    
    // Get all rating documents
    const ratingsQuery = query(collection(db, RATINGS_COLLECTION));
    const ratingsSnapshot = await getDocs(ratingsQuery);
    
    if (ratingsSnapshot.empty) {
      console.log('✅ No ratings found to delete.');
      return true;
    }
    
    console.log(`📊 Found ${ratingsSnapshot.docs.length} rating documents to delete...`);
    
    // Delete all rating documents
    const deletePromises = ratingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('🎯 All Pokemon ratings have been reset to 0!');
    console.log('💡 All voting data has been cleared.');
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting ratings:', error);
    return false;
  }
};

// Favorites System Functions

// Save favorite to Firebase - SIMPLIFIED VERSION
export const saveFavorite = async (pokemonId: string, deviceId: string, isFavorite: boolean): Promise<boolean> => {
  try {
    const favoritesRef = collection(db, 'favorites');
    console.log(`🔄 ${isFavorite ? 'Adding' : 'Removing'} favorite for Pokemon: ${pokemonId}`);

    if (isFavorite) {
      // Add favorite - simple add document
      await addDoc(favoritesRef, {
        pokemonId,
        deviceId,
        isFavorite: true,
        createdAt: new Date()
      });
      console.log(`✅ Added favorite for Pokemon: ${pokemonId}`);
    } else {
      // Remove favorite - find and delete the document
      const q = query(favoritesRef, 
        where('pokemonId', '==', pokemonId), 
        where('deviceId', '==', deviceId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Delete all matching documents (should be only one, but just in case)
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`✅ Removed favorite for Pokemon: ${pokemonId} (deleted ${querySnapshot.docs.length} document(s))`);
      } else {
        console.log(`ℹ️  No favorite document found for Pokemon: ${pokemonId}`);
      }
    }

    // Update last modified timestamp to invalidate ratings cache (favorites affect display)
    await updateLastModifiedTimestamp('ratings_last_modified');

    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();

    return true;
  } catch (error) {
    console.error('❌ Error saving favorite:', error);
    return false;
  }
};

// Get all favorites from Firebase
export const getAllFavorites = async (): Promise<{[pokemonId: string]: number}> => {
  try {
    const favoritesRef = collection(db, 'favorites');
    // Since we now delete documents instead of setting isFavorite: false, 
    // we can just get all documents in the collection
    const querySnapshot = await getDocs(favoritesRef);
    
    const favoriteCounts: {[pokemonId: string]: number} = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const pokemonId = data.pokemonId;
      
      // Only count if the document exists and has a valid pokemonId
      if (pokemonId && data.isFavorite !== false) {
        favoriteCounts[pokemonId] = (favoriteCounts[pokemonId] || 0) + 1;
      }
    });
    
    console.log('✅ Loaded favorite counts:', favoriteCounts);
    return favoriteCounts;
  } catch (error) {
    console.error('❌ Error loading favorites:', error);
    return {};
  }
};

// Get user's favorites - SIMPLIFIED VERSION
export const getUserFavorites = async (deviceId: string): Promise<string[]> => {
  try {
    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(q);
    
    const userFavorites: string[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.pokemonId && data.isFavorite !== false) {
        userFavorites.push(data.pokemonId);
      }
    });
    
    console.log(`✅ Loaded ${userFavorites.length} user favorites:`, userFavorites);
    return userFavorites;
  } catch (error) {
    console.error('❌ Error loading user favorites:', error);
    return [];
  }
};

// Cleanup function to remove orphaned or duplicate favorite documents
export const cleanupFavoriteDocuments = async (): Promise<void> => {
  try {
    console.log('🧹 Starting aggressive favorites cleanup...');
    const favoritesRef = collection(db, 'favorites');
    const querySnapshot = await getDocs(favoritesRef);
    
    const documentsToDelete: string[] = [];
    const validDocuments = new Map<string, string>(); // combo -> docId
    
    console.log(`📊 Found ${querySnapshot.docs.length} total favorite documents`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const combo = `${data.pokemonId}_${data.deviceId}`;
      
      console.log(`🔍 Checking document ${doc.id}:`, {
        pokemonId: data.pokemonId,
        deviceId: data.deviceId,
        isFavorite: data.isFavorite,
        combo: combo
      });
      
      // Mark for deletion if:
      // 1. isFavorite is explicitly false
      // 2. Missing required fields (pokemonId or deviceId)
      // 3. Duplicate combination (keep the most recent one)
      if (
        data.isFavorite === false || 
        !data.pokemonId || 
        !data.deviceId
      ) {
        documentsToDelete.push(doc.id);
        console.log(`🗑️  Marking for deletion (invalid): ${doc.id} - ${combo}`);
      } else if (validDocuments.has(combo)) {
        // Duplicate found - delete this one and keep the first
        documentsToDelete.push(doc.id);
        console.log(`🗑️  Marking for deletion (duplicate): ${doc.id} - ${combo}`);
      } else {
        // This is a valid, unique document
        validDocuments.set(combo, doc.id);
        console.log(`✅ Keeping valid document: ${doc.id} - ${combo}`);
      }
    });
    
    // Delete marked documents in batches
    if (documentsToDelete.length > 0) {
      console.log(`🗑️  Deleting ${documentsToDelete.length} orphaned/duplicate documents...`);
      const deletePromises = documentsToDelete.map(docId => 
        deleteDoc(doc(favoritesRef, docId))
      );
      
      await Promise.all(deletePromises);
      console.log(`✅ Cleanup complete! Removed ${documentsToDelete.length} documents.`);
    } else {
      console.log('✅ No cleanup needed - all documents are valid!');
    }
    
    // Log final state
    const remainingDocs = await getDocs(favoritesRef);
    console.log(`📊 Final state: ${remainingDocs.docs.length} documents remaining`);
    remainingDocs.docs.forEach(doc => {
      const data = doc.data();
      console.log(`📋 Remaining: ${doc.id} - ${data.pokemonId}_${data.deviceId}`);
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

// EMERGENCY: Complete favorites reset - deletes ALL favorite documents
export const resetAllFavorites = async (): Promise<void> => {
  try {
    console.log('🚨 EMERGENCY: Starting complete favorites reset...');
    const favoritesRef = collection(db, 'favorites');
    const querySnapshot = await getDocs(favoritesRef);
    
    console.log(`📊 Found ${querySnapshot.docs.length} documents to delete`);
    
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    console.log(`✅ RESET COMPLETE! Deleted ${querySnapshot.docs.length} documents.`);
    
    // Clear localStorage as well
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('pokemon_favorites') || key.includes('all_pokemon_favorites')) {
        localStorage.removeItem(key);
        console.log(`🗑️  Cleared localStorage: ${key}`);
      }
    });
    
    console.log('🎯 Complete favorites reset finished. Please refresh the page.');
  } catch (error) {
    console.error('❌ Error during complete reset:', error);
  }
};

// Force delete a specific favorite document - for debugging
export const forceDeleteFavorite = async (pokemonId: string, deviceId: string): Promise<boolean> => {
  try {
    const favoritesRef = collection(db, 'favorites');
    const favoriteDocId = `${pokemonId}_${deviceId}`;
    const favoriteDocRef = doc(favoritesRef, favoriteDocId);
    
    console.log(`🔥 FORCE DELETING: ${favoriteDocId}`);
    
    // Try multiple deletion methods
    await deleteDoc(favoriteDocRef);
    console.log(`🗑️  First deletion attempt completed`);
    
    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const docSnap = await getDoc(favoriteDocRef);
      if (docSnap.exists()) {
        console.log(`⚠️  Document still exists, trying setDoc with deletion flag...`);
        // Try setting a deletion flag first
        await setDoc(favoriteDocRef, {
          pokemonId,
          deviceId,
          isFavorite: false,
          deleted: true,
          deletedAt: new Date()
        });
        
        // Then delete again
        await new Promise(resolve => setTimeout(resolve, 200));
        await deleteDoc(favoriteDocRef);
        console.log(`🔥 Second deletion attempt completed`);
      } else {
        console.log(`✅ Document successfully deleted: ${favoriteDocId}`);
        return true;
      }
    } catch (error) {
      console.log(`✅ Document confirmed deleted (error as expected): ${favoriteDocId}`);
      return true;
    }
    
    // Final verification
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const finalSnap = await getDoc(favoriteDocRef);
      if (!finalSnap.exists()) {
        console.log(`🎯 FINAL VERIFICATION: Document ${favoriteDocId} is deleted`);
        return true;
      } else {
        console.error(`🚨 CRITICAL: Document ${favoriteDocId} STILL EXISTS after force deletion!`);
        return false;
      }
    } catch (error) {
      console.log(`✅ FINAL VERIFICATION: Document confirmed deleted (error as expected): ${favoriteDocId}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error force deleting favorite:`, error);
    return false;
  }
};

// Delete all ratings for a specific device ID
export const deleteAllUserRatings = async (deviceId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Deleting all ratings for device: ${deviceId}`);
    
    // Get all rating documents
    const ratingsSnapshot = await getDocs(collection(db, RATINGS_COLLECTION));
    const updatePromises: Promise<void>[] = [];
    
    ratingsSnapshot.docs.forEach(doc => {
      const data = doc.data() as PokemonRating;
      if (data.ratings && data.ratings[deviceId]) {
        // Remove this device's rating from the ratings object
        const updatedRatings = { ...data.ratings };
        delete updatedRatings[deviceId];
        
        // Recalculate average, total votes, and total points
        const ratingsArray = Object.values(updatedRatings);
        const totalVotes = ratingsArray.length;
        const averageRating = totalVotes > 0 ? ratingsArray.reduce((sum, r) => sum + r, 0) / totalVotes : 0;
        const totalPoints = ratingsArray.reduce((sum, r) => sum + starsToPoints(r), 0);
        
        if (totalVotes === 0) {
          // If no ratings left, delete the entire document
          updatePromises.push(deleteDoc(doc.ref));
        } else {
          // Update the document with new calculations
          updatePromises.push(updateDoc(doc.ref, {
            ratings: updatedRatings,
            averageRating,
            totalVotes,
            totalPoints,
            lastUpdated: new Date()
          }));
        }
      }
    });
    
    await Promise.all(updatePromises);
    
    // Update last modified timestamp to invalidate cache
    await updateLastModifiedTimestamp('ratings_last_modified');
    
    // Clear cache immediately for instant UI updates
    clearCacheAfterChange();
    
    console.log(`✅ Deleted all ratings for device: ${deviceId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting ratings for device ${deviceId}:`, error);
    return false;
  }
};

// Delete all favorites for a specific device ID
export const deleteAllUserFavorites = async (deviceId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Deleting all favorites for device: ${deviceId}`);
    
    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${querySnapshot.docs.length} favorite(s) for device: ${deviceId}`);
    } else {
      console.log(`ℹ️ No favorites found for device: ${deviceId}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error deleting favorites for device ${deviceId}:`, error);
    return false;
  }
};

// Delete all user data (ratings and favorites) for a specific device ID
export const deleteAllUserData = async (deviceId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Starting complete data deletion for device: ${deviceId}`);
    
    // Delete ratings first
    const ratingsDeleted = await deleteAllUserRatings(deviceId);
    
    // Delete favorites
    const favoritesDeleted = await deleteAllUserFavorites(deviceId);
    
    if (ratingsDeleted && favoritesDeleted) {
      console.log(`✅ Successfully deleted all data for device: ${deviceId}`);
      return true;
    } else {
      console.log(`⚠️ Partial deletion completed for device: ${deviceId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting all user data for device ${deviceId}:`, error);
    return false;
  }
};

// SAFE CLEANUP FUNCTION - Analyze devices with very few votes
export const analyzeLowVoteDevices = async (maxVotes: number = 2): Promise<{
  devices: Array<{
    deviceId: string;
    totalVotes: number;
    pokemonVoted: Array<{ pokemonId: string; rating: number }>;
  }>;
  totalDevicesToCleanup: number;
  totalVotesToDelete: number;
}> => {
  try {
    console.log(`🔍 Analyzing devices with ${maxVotes} or fewer total votes...`);
    
    // Get all rating documents
    const ratingsSnapshot = await getDocs(collection(db, RATINGS_COLLECTION));
    
    // Track vote count per device across all Pokemon
    const deviceVoteCounts: { [deviceId: string]: Array<{ pokemonId: string; rating: number }> } = {};
    
    ratingsSnapshot.docs.forEach(doc => {
      const data = doc.data() as PokemonRating;
      const pokemonId = data.pokemonId;
      
      if (data.ratings) {
        Object.entries(data.ratings).forEach(([deviceId, rating]) => {
          if (typeof rating === 'number' && deviceId !== 'averageRating' && deviceId !== 'totalVotes' && deviceId !== 'totalPoints') {
            if (!deviceVoteCounts[deviceId]) {
              deviceVoteCounts[deviceId] = [];
            }
            deviceVoteCounts[deviceId].push({ pokemonId, rating });
          }
        });
      }
    });
    
    // Find devices with very few votes
    const lowVoteDevices = Object.entries(deviceVoteCounts)
      .filter(([_, votes]) => votes.length <= maxVotes)
      .map(([deviceId, votes]) => ({
        deviceId,
        totalVotes: votes.length,
        pokemonVoted: votes
      }))
      .sort((a, b) => a.totalVotes - b.totalVotes);
    
    const totalVotesToDelete = lowVoteDevices.reduce((sum, device) => sum + device.totalVotes, 0);
    
    console.log(`📊 Analysis Results:`);
    console.log(`- Found ${lowVoteDevices.length} devices with ${maxVotes} or fewer votes`);
    console.log(`- Total votes to be deleted: ${totalVotesToDelete}`);
    console.log(`- Devices breakdown:`, lowVoteDevices);
    
    return {
      devices: lowVoteDevices,
      totalDevicesToCleanup: lowVoteDevices.length,
      totalVotesToDelete
    };
  } catch (error) {
    console.error('❌ Error analyzing low vote devices:', error);
    throw error;
  }
};

// SAFE CLEANUP FUNCTION - Delete devices with very few votes (WITH CONFIRMATION)
export const cleanupLowVoteDevices = async (maxVotes: number = 2, confirmationText: string): Promise<{
  success: boolean;
  devicesDeleted: number;
  votesDeleted: number;
  errors: string[];
}> => {
  // SAFETY CHECK - Require exact confirmation text
  if (confirmationText !== `DELETE_DEVICES_WITH_${maxVotes}_OR_FEWER_VOTES`) {
    throw new Error(`❌ Safety check failed. Required confirmation text: DELETE_DEVICES_WITH_${maxVotes}_OR_FEWER_VOTES`);
  }
  
  try {
    console.log(`🚨 STARTING CLEANUP OF DEVICES WITH ${maxVotes} OR FEWER VOTES`);
    
    // First, analyze what we're about to delete
    const analysis = await analyzeLowVoteDevices(maxVotes);
    
    if (analysis.totalDevicesToCleanup === 0) {
      console.log('✅ No devices found with qualifying vote counts. Nothing to clean up.');
      return {
        success: true,
        devicesDeleted: 0,
        votesDeleted: 0,
        errors: []
      };
    }
    
    console.log(`⚠️ ABOUT TO DELETE ${analysis.totalDevicesToCleanup} devices with ${analysis.totalVotesToDelete} total votes`);
    
    const errors: string[] = [];
    let devicesDeleted = 0;
    let votesDeleted = 0;
    
    // Delete each device's data
    for (const device of analysis.devices) {
      try {
        console.log(`🗑️ Deleting device ${device.deviceId} (${device.totalVotes} votes)`);
        
        const success = await deleteAllUserData(device.deviceId);
        if (success) {
          devicesDeleted++;
          votesDeleted += device.totalVotes;
          console.log(`✅ Deleted device ${device.deviceId}`);
        } else {
          errors.push(`Failed to delete device ${device.deviceId}`);
        }
      } catch (error) {
        const errorMsg = `Error deleting device ${device.deviceId}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`🏁 CLEANUP COMPLETE:`);
    console.log(`- Devices deleted: ${devicesDeleted}/${analysis.totalDevicesToCleanup}`);
    console.log(`- Votes deleted: ${votesDeleted}`);
    console.log(`- Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      devicesDeleted,
      votesDeleted,
      errors
    };
  } catch (error) {
    console.error('❌ Critical error during cleanup:', error);
    throw error;
  }
};

// Stats and Abilities Functions
export const updatePokemonStats = async (pokemonId: string, stats: any, ability: any): Promise<boolean> => {
  try {
    console.log(`📊 Updating stats for Pokemon ${pokemonId}...`);
    
    const pokemonRef = doc(db, COLLECTION_NAME, pokemonId);
    
    const updates = {
      stats: {
        hp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        spAttack: stats.spAttack,
        spDefense: stats.spDefense,
        speed: stats.speed,
        total: stats.total
      },
      ability: {
        id: ability.id,
        name: ability.name,
        description: ability.description
      },
      updatedAt: new Date()
    };
    
    await updateDoc(pokemonRef, updates);
    
    console.log('✅ Pokemon stats updated successfully');
    
    // Clear cache after modification
    await clearCacheAfterChange();
    
    return true;
  } catch (error) {
    console.error('❌ Error updating Pokemon stats:', error);
    return false;
  }
};

export const getPokemonStats = async (pokemonId: string): Promise<{stats?: any, ability?: any} | null> => {
  try {
    console.log(`📊 Loading stats for Pokemon ${pokemonId}...`);
    
    const pokemonRef = doc(db, COLLECTION_NAME, pokemonId);
    const pokemonDoc = await getDoc(pokemonRef);
    
    if (!pokemonDoc.exists()) {
      console.log('❌ Pokemon not found');
      return null;
    }
    
    const data = pokemonDoc.data();
    return {
      stats: data.stats || null,
      ability: data.ability || null
    };
  } catch (error) {
    console.error('❌ Error loading Pokemon stats:', error);
    return null;
  }
};


