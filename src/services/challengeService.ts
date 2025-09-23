import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  query, 
  orderBy, 
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

export interface ChallengeArt {
  id: string; // Firebase document ID
  name: string;
  creator?: string; // Optional for body-completion challenges
  imageUrl: string;
  additionalImages?: string[]; // Array of up to 3 additional image URLs
  types: string[];
  challenge: string; // Challenge type ID (alt-evo, fusions, etc.)
  createdAt: Date;
  updatedAt: Date;
  // Fusion-specific fields
  pokemon1Name?: string;
  pokemon1ImageUrl?: string;
  pokemon2Name?: string;
  pokemon2ImageUrl?: string;
  // Trainer-specific fields
  trainerType?: 'trainer' | 'gym-leader';
  // Theme-specific fields
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

// Upload Pokemon image for fusion challenges
export const uploadPokemonImage = async (file: File, artName: string, pokemonNumber: number): Promise<string | null> => {
  try {
    console.log('Uploading Pokemon image to Cloudinary...');
    
    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedName = artName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const publicId = `challenges/pokemon/${sanitizedName}-pokemon${pokemonNumber}-${timestamp}`;
    
    console.log('Uploading to Cloudinary with public_id:', publicId);
    
    // Create form data for Cloudinary upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append('public_id', publicId);
    formData.append('folder', 'challenges/pokemon');
    
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
    console.log('Pokemon image upload successful:', result);
    
    return result.secure_url;
  } catch (error) {
    console.error('Detailed Pokemon image upload error:', error);
    console.error('Error message:', (error as any)?.message);
    return null;
  }
};

// Upload additional images for challenge art
export const uploadAdditionalChallengeImages = async (files: File[], artName: string): Promise<string[]> => {
  try {
    console.log('Uploading additional challenge images to Cloudinary...');
    
    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now();
      const sanitizedName = artName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const publicId = `challenges/additional/${sanitizedName}-additional-${index + 1}-${timestamp}`;
      
      // Create form data for Cloudinary upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
      formData.append('public_id', publicId);
      formData.append('folder', 'challenges/additional');
      
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
      return result.secure_url;
    });
    
    const uploadedUrls = await Promise.all(uploadPromises);
    console.log('Additional images upload successful:', uploadedUrls);
    
    return uploadedUrls.filter(url => url !== null); // Filter out any null results
  } catch (error) {
    console.error('Detailed additional images upload error:', error);
    return [];
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
    
    // Handle the case where additionalImages is an empty array - remove the field entirely
    const updateData: any = { ...updates, updatedAt: new Date() };
    
    if (updates.additionalImages !== undefined && updates.additionalImages.length === 0) {
      // Remove the field entirely when empty
      updateData.additionalImages = deleteField();
    }
    
    await updateDoc(artRef, updateData);
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
