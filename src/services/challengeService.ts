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

export interface ChallengeArt {
  id: string; // Firebase document ID
  name: string;
  creator?: string; // Optional for body-completion
  imageUrl: string;
  types: string[];
  challenge: string; // Challenge type ID (alt-evo, fusions, etc.)
  createdAt: Date;
  updatedAt: Date;
  
  // Challenge-specific fields
  // For fusions
  pokemon1Name?: string;
  pokemon1ImageUrl?: string;
  pokemon2Name?: string;
  pokemon2ImageUrl?: string;
  
  // For trainers
  trainerType?: 'trainer' | 'gym-leader';
  
  // For themes
  pokemonName?: string;
  themeName?: string;
}

const COLLECTION_NAME = 'challenge_art';

// Upload image to Cloudinary
export const uploadChallengeImage = async (file: File, artName: string): Promise<string | null> => {
  try {
    console.log('Uploading challenge art to Cloudinary...');
    
    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedName = artName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const publicId = `challenges/${sanitizedName}-${timestamp}`;
    
    console.log('Uploading to Cloudinary with public_id:', publicId);
    
    // Create form data for Cloudinary upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append('public_id', publicId);
    formData.append('folder', 'challenges');
    
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

// Get all challenge art from Firebase
export const getAllChallengeArt = async (): Promise<ChallengeArt[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ChallengeArt[];
  } catch (error) {
    console.error('Error fetching challenge art:', error);
    return [];
  }
};

// Add new challenge art
export const addChallengeArt = async (art: Omit<ChallengeArt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...art,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding challenge art:', error);
    return null;
  }
};

// Update challenge art
export const updateChallengeArt = async (id: string, updates: Partial<ChallengeArt>): Promise<boolean> => {
  try {
    const artRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(artRef, {
      ...updates,
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error updating challenge art:', error);
    return false;
  }
};

// Delete challenge art
export const deleteChallengeArt = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error('Error deleting challenge art:', error);
    return false;
  }
};

// Delete challenge art with image cleanup
export const deleteChallengeArtWithImage = async (id: string, imageUrl: string): Promise<boolean> => {
  try {
    // Note: Cloudinary image deletion requires API key and secret which should be server-side
    // For now, we'll delete from Firebase and log the image that should be cleaned up
    if (imageUrl) {
      const urlParts = imageUrl.split('/');
      const fileWithExtension = urlParts[urlParts.length - 1];
      const publicId = fileWithExtension.split('.')[0];
      const fullPublicId = `challenges/${publicId}`;
      
      console.log('Challenge art image should be cleaned up from Cloudinary:', fullPublicId);
      console.log('Full image URL:', imageUrl);
    }
    
    // Delete from Firebase
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error('Error deleting challenge art with image:', error);
    return false;
  }
};

// Get challenge art by challenge type
export const getChallengeArtByType = async (challengeType: string): Promise<ChallengeArt[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('challenge', '==', challengeType),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ChallengeArt[];
  } catch (error) {
    console.error('Error fetching challenge art by type:', error);
    return [];
  }
};

// Get challenge art by creator
export const getChallengeArtByCreator = async (creator: string): Promise<ChallengeArt[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('creator', '==', creator),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ChallengeArt[];
  } catch (error) {
    console.error('Error fetching challenge art by creator:', error);
    return [];
  }
};
