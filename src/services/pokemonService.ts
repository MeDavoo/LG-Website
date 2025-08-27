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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

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

// Upload image to Firebase Storage
export const uploadPokemonImage = async (file: File, pokemonName: string): Promise<string | null> => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `pokemon-images/${pokemonName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
    const imageRef = ref(storage, filename);
    
    // Upload the file
    const snapshot = await uploadBytes(imageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// Get the next available Pokedex number
export const getNextPokedexNumber = async (): Promise<number> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('pokedexNumber', 'desc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 1;
    }
    
    const highestPokemon = querySnapshot.docs[0].data();
    return highestPokemon.pokedexNumber + 1;
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

// Delete a Pokemon
export const deletePokemon = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error('Error deleting Pokemon:', error);
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






