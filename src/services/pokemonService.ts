import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

export interface Pokemon {
  id: string; // Firebase document ID
  pokedexNumber: number; // 1-151 position in Pokedex
  name: string;
  artist: string;
  imageUrl: string;
  types: string[];
  unique?: string; // U0, U1, U2 for unique Pokemon
  evolutionStage?: number; // 0, 1, 2 for evolution stages (0=base, 1=middle, 2=final)
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

// Get the next available Pokedex number (fills gaps first, then continues sequentially)
export const getNextPokedexNumber = async (): Promise<number> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('pokedexNumber'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 1;
    }
    
    // Get all existing pokedex numbers
    const existingNumbers = querySnapshot.docs.map(doc => doc.data().pokedexNumber);
    
    // Find the first gap in the sequence (1-151)
    for (let i = 1; i <= 151; i++) {
      if (!existingNumbers.includes(i)) {
        return i;
      }
    }
    
    // If all slots 1-151 are filled, this shouldn't happen but return 152 as fallback
    return 152;
  } catch (error) {
    console.error('Error getting next Pokedex number:', error);
    return 1;
  }
};

// Get all Pokemon from Firebase
export const getAllPokemon = async (): Promise<Pokemon[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('pokedexNumber'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Pokemon[];
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    return [];
  }
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






