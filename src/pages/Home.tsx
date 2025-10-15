import { useState, useEffect, useRef } from 'react';
import { getAllPokemon, Pokemon, deletePokemonWithImage, updatePokemon, addPokemon, uploadPokemonImage, getNextPokedexNumber, saveRating, getAllRatings, getGlobalRankings, reorganizePokedex, saveFavorite, getAllFavorites, getUserFavorites, cleanupFavoriteDocuments, forceDeleteFavorite, resetAllFavorites, deleteAllUserData, analyzeLowVoteDevices, cleanupLowVoteDevices, updatePokemonStats, getPokemonStats } from '../services/pokemonService';
import { deleteField } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { clearAllCache, getCacheStats, clearRatingsCache } from '../services/cacheService';
import StatsEditor from '../components/StatsEditor';
import { PokemonStats, PokemonAbility } from '../types/pokemon';

interface PokemonSlot {
  id: number;
  name: string;
  artist?: string;
  imageUrl?: string;
  additionalImages?: string[]; // Array of up to 3 additional image URLs
  types?: string[];
  type2?: string;
  hasArt: boolean;
  unique?: string; // U0, U1, U2 for unique Pokemon (0=no evolve, 1=evolves once, 2=evolves twice)
  evolutionStage?: number; // 0=base, 1=first evo, 2=second evo, 3=GMAX, 4=Legendary, 5=MEGA
  firebaseId?: string; // Firebase document ID for updates
  info?: string; // Optional info text that appears in tooltip
  favoriteCount?: number; // Total number of favorites for this Pokemon
  artworkDate?: Date; // Date when the artwork was created
}

const Home = () => {
  // Admin authentication
  const { requireAdmin, isAdmin } = useAdminAuth();
  
  // Pokemon data from Firebase
  const [_pokemonData, setPokemonData] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Pokemon slots dynamically based on Firebase data
  const [pokemonSlots, setPokemonSlots] = useState<PokemonSlot[]>([]);

  // Animation timing system
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [animationSpeedMultiplier, setAnimationSpeedMultiplier] = useState(1);

  // Load Pokemon data from Firebase
  useEffect(() => {
    loadPokemonData();
  }, []);

  // Animation speed control system
  useEffect(() => {
    if (isInitialLoad) {
      // Start with slow animations for initial load
      const timer = setTimeout(() => {
        // After 3 seconds, dramatically speed up animations
        setAnimationSpeedMultiplier(0.01); // Make animations 100x faster
        
        // After another 2 seconds, mark initial load as complete
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 2000);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  const loadPokemonData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to load Pokemon data...');
      const firebasePokemon = await getAllPokemon();
      console.log('📦 Retrieved Pokemon from Firebase:', firebasePokemon.length, 'Pokemon');
      console.log('📋 First Pokemon:', firebasePokemon[0]);
      setPokemonData(firebasePokemon);
      
      // Create slots dynamically based on the highest pokedex number or Pokemon count
      const maxPokedexNumber = firebasePokemon.length > 0 
        ? Math.max(...firebasePokemon.map(p => p.pokedexNumber || 0))
        : 151; // Start with 151 as minimum for classic Pokedex feel
      
      console.log('📈 Max Pokedex Number:', maxPokedexNumber);
      
      const slots: PokemonSlot[] = [];
      for (let i = 1; i <= maxPokedexNumber; i++) {
        const pokemonFromFirebase = firebasePokemon.find(p => p.pokedexNumber === i);
        
        if (pokemonFromFirebase) {
          const favoriteCount = pokemonFavorites[pokemonFromFirebase.id] || 0;
          slots.push({
            id: i,
            name: pokemonFromFirebase.name,
            artist: pokemonFromFirebase.artist,
            imageUrl: pokemonFromFirebase.imageUrl,
            additionalImages: pokemonFromFirebase.additionalImages || [],
            types: pokemonFromFirebase.types,
            type2: pokemonFromFirebase.types?.[1],
            unique: pokemonFromFirebase.unique,
            evolutionStage: pokemonFromFirebase.evolutionStage,
            hasArt: true,
            firebaseId: pokemonFromFirebase.id,
            info: pokemonFromFirebase.info,
            favoriteCount: favoriteCount,
            artworkDate: pokemonFromFirebase.artworkDate || pokemonFromFirebase.createdAt || new Date()
          });
        } else {
          slots.push({
            id: i,
            name: `Pokemon #${i.toString().padStart(3, '0')}`,
            hasArt: false
          });
        }
      }
      
      console.log('🎰 Created slots:', slots.length, 'total slots');
      console.log('🎨 Pokemon with art:', slots.filter(s => s.hasArt).length);
      setPokemonSlots(slots);
      
      // Load user rating statistics AFTER setting slots
      await loadUserRatingStats(slots);
      
      // If this is not the initial load, set fast animations immediately
      if (!isInitialLoad) {
        setAnimationSpeedMultiplier(0.01);
      }
    } catch (error) {
      console.error('💥 Error loading Pokemon data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load and calculate user's rating statistics
  const loadUserRatingStats = async (slots?: PokemonSlot[]) => {
    try {
      const deviceId = getDeviceId();
      const allRatings = await getAllRatings();
      
      // Use provided slots or fallback to current pokemonSlots
      const currentSlots = slots || pokemonSlots;
      
      // Get current Pokemon IDs to filter out deleted Pokemon ratings
      const existingPokemonIds = new Set(currentSlots.filter(p => p.hasArt && p.firebaseId).map(p => p.firebaseId));
      
      // Find all ratings made by this device for existing Pokemon only
      const userRatings: number[] = [];
      const ratingDistribution: { [key: string]: number } = {};
      
      // Initialize all possible ratings from 0.5 to 10 (in 0.5 increments)
      for (let i = 0.5; i <= 10; i += 0.5) {
        ratingDistribution[i.toString()] = 0;
      }
      
      Object.entries(allRatings).forEach(([pokemonId, pokemonRating]) => {
        // Only count ratings for Pokemon that still exist
        if (existingPokemonIds.has(pokemonId)) {
          const userRating = pokemonRating.ratings[deviceId];
          if (userRating) {
            userRatings.push(userRating);
            if (userRating >= 0.5 && userRating <= 10) {
              const ratingKey = userRating.toString();
              if (ratingDistribution.hasOwnProperty(ratingKey)) {
                ratingDistribution[ratingKey]++;
              }
            }
          }
        }
      });
      
      // Calculate average
      const averageRating = userRatings.length > 0 
        ? userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length 
        : 0;
      
      // Calculate total unrated Pokemon (Pokemon with art that user hasn't rated)
      const totalPokemonWithArt = currentSlots.filter(p => p.hasArt && p.firebaseId).length;
      const totalUnrated = totalPokemonWithArt - userRatings.length;
      
      setUserRatingStats({
        averageRating,
        totalRatings: userRatings.length,
        totalUnrated,
        ratingDistribution
      });
    } catch (error) {
      console.error('Error loading user rating stats:', error);
    }
  };

  const handleDeletePokemon = async () => {
    if (!selectedPokemon || !selectedPokemon.firebaseId || !selectedPokemon.imageUrl) return;
    
    setDeletingPokemon(true);
    try {
      const success = await deletePokemonWithImage(selectedPokemon.firebaseId, selectedPokemon.imageUrl);
      if (success) {
        showNotification(`${selectedPokemon.name} has been deleted successfully!`, 'success');
        setSelectedPokemon(null);
        setShowDeleteConfirm(false);
        await reorganizePokedex(); // Renumber all Pokemon and remove empty slot
        await loadPokemonData(); // Refresh the data
      } else {
        showNotification('❌ Failed to delete Pokemon. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting Pokemon:', error);
      showNotification('❌ Error deleting Pokemon. Check console for details.', 'error');
    } finally {
      setDeletingPokemon(false);
    }
  };

  const handleEditPokemon = () => {
    if (!selectedPokemon) return;
    
    // Populate the form with current Pokemon data
    setEditFormData({
      name: selectedPokemon.name,
      artist: selectedPokemon.artist || '',
      types: selectedPokemon.types || [],
      unique: selectedPokemon.unique || '',
      evolutionStage: selectedPokemon.evolutionStage || 0,
      image: null, // Reset image field
      additionalImages: [], // Reset additional images field
      info: selectedPokemon.info || '',
      artworkDate: selectedPokemon.artworkDate instanceof Date ? selectedPokemon.artworkDate : new Date()
    });
    setShowEditForm(true);
  };

  const handleUpdatePokemon = async () => {
    if (!selectedPokemon || !selectedPokemon.firebaseId) return;
    
    if (!editFormData.name || !editFormData.artist || editFormData.types.length === 0) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      let imageUrl = selectedPokemon.imageUrl; // Keep existing image by default
      let additionalImages = selectedPokemon.additionalImages || []; // Keep existing additional images by default
      
      // If a new image was selected, upload it to Cloudinary
      if (editFormData.image) {
        const newImageUrl = await uploadPokemonImage(editFormData.image, editFormData.name);
        if (!newImageUrl) {
          showNotification('❌ Failed to upload new image. Please try again.', 'error');
          setIsUpdating(false);
          return;
        }
        imageUrl = newImageUrl;
      }

      // If additional images were selected, upload them to Cloudinary
      if (editFormData.additionalImages.length > 0) {
        const uploadPromises = editFormData.additionalImages.map((file, index) => 
          uploadPokemonImage(file, `${editFormData.name}_additional_${index + 1}`)
        );
        
        const uploadedUrls = await Promise.all(uploadPromises);
        const validUrls = uploadedUrls.filter(url => url !== null) as string[];
        
        if (validUrls.length !== editFormData.additionalImages.length) {
          showNotification('❌ Some additional images failed to upload. Please try again.', 'error');
          setIsUpdating(false);
          return;
        }
        
        additionalImages = validUrls;
      }

      // Handle final additional images - combine existing (after deletions) with new uploads
      let finalAdditionalImages = selectedPokemon.additionalImages || [];
      if (editFormData.additionalImages.length > 0) {
        finalAdditionalImages = [...finalAdditionalImages, ...additionalImages];
      }

      const updates: any = {
        name: editFormData.name,
        artist: editFormData.artist,
        types: editFormData.types,
        evolutionStage: editFormData.evolutionStage,
        unique: editFormData.unique, // Always include unique field, even if empty string
        ...(imageUrl !== selectedPokemon.imageUrl && { imageUrl }), // Only update if image changed
        additionalImages: finalAdditionalImages, // Always update to reflect any additions or deletions
        artworkDate: editFormData.artworkDate,
        updatedAt: new Date()
      };

      // Handle info field - add it if there's content, remove it if empty
      if (editFormData.info && editFormData.info.trim()) {
        updates.info = editFormData.info.trim();
      } else {
        // Use deleteField to remove the info field from Firestore if it exists
        updates.info = deleteField();
      }

      const success = await updatePokemon(selectedPokemon.firebaseId, updates);
      if (success) {
        showNotification(`${editFormData.name} has been updated successfully!`, 'success');
        setShowEditForm(false);
        
        // Update the selectedPokemon state with the new data
        setSelectedPokemon(prev => prev ? {
          ...prev,
          name: editFormData.name,
          artist: editFormData.artist,
          types: editFormData.types,
          evolutionStage: editFormData.evolutionStage,
          unique: editFormData.unique,
          imageUrl: imageUrl,
          additionalImages: finalAdditionalImages,
          info: editFormData.info && editFormData.info.trim() ? editFormData.info.trim() : undefined,
          artworkDate: editFormData.artworkDate
        } : null);
        
        await loadPokemonData(); // Refresh the data
        
        // Scroll to the updated Pokemon after a brief delay to ensure DOM is updated
        setTimeout(() => {
          scrollToPokemon(selectedPokemon.id);
        }, 100);
      } else {
        showNotification('❌ Failed to update Pokemon. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error updating Pokemon:', error);
      showNotification('❌ Error updating Pokemon. Check console for details.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPokemon = async () => {
    if (!addFormData.name || !addFormData.artist || addFormData.types.length === 0 || !addFormData.image) {
      showNotification('Please fill in all required fields and select an image', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // Upload image first
      const imageUrl = await uploadPokemonImage(addFormData.image, addFormData.name);
      if (!imageUrl) {
        showNotification('❌ Failed to upload image. Please try again.', 'error');
        return;
      }

      // Get next Pokedex number (pass true if this is a legendary)
      const isLegendary = addFormData.evolutionStage === 4;
      const pokedexNumber = await getNextPokedexNumber(isLegendary);

      // Add Pokemon to database
      const pokemonData = {
        pokedexNumber,
        name: addFormData.name,
        artist: addFormData.artist,
        types: addFormData.types,
        imageUrl,
        evolutionStage: addFormData.evolutionStage,
        artworkDate: addFormData.artworkDate,
        ...(addFormData.unique && { unique: addFormData.unique }),
        ...(addFormData.info && addFormData.info.trim() && { info: addFormData.info.trim() })
      };

      await addPokemon(pokemonData);
      
      showNotification(`✅ ${addFormData.name} has been added successfully!`, 'success');
      setShowAddForm(false);
      
      // Reset form
      setAddFormData({
        name: '',
        artist: '',
        types: [],
        unique: '',
        evolutionStage: 0,
        image: null,
        info: '',
        artworkDate: new Date()
      });
      
      // Reorganize Pokedex to ensure proper ordering (legendaries at bottom)
      await reorganizePokedex();
      
      await loadPokemonData(); // Refresh the data
      
      // Scroll to the newly added Pokemon after a brief delay to ensure DOM is updated
      setTimeout(() => {
        scrollToPokemon(pokedexNumber);
      }, 100);
    } catch (error) {
      console.error('Error adding Pokemon:', error);
      showNotification('❌ Error adding Pokemon. Check console for details.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTypeToggle = (type: string) => {
    setAddFormData(prev => {
      if (prev.types.includes(type)) {
        // Remove type
        return {
          ...prev,
          types: prev.types.filter(t => t !== type)
        };
      } else if (prev.types.length < 2) {
        // Add type (limit to 2)
        return {
          ...prev,
          types: [...prev.types, type]
        };
      } else {
        // Show notification when trying to add more than 2 types
        showNotification('Pokemon can only have up to 2 types', 'error');
        return prev;
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
      }
      
      setAddFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
      }
      
      setEditFormData(prev => ({ ...prev, image: file }));
    }
  };

  // Handle additional images change for Edit form
  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      showNotification('You can only upload up to 3 additional images', 'error');
      return;
    }
    
    // Validate each file
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Each image should be less than 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showNotification('Please select valid image files only', 'error');
        return;
      }
    }
    
    setEditFormData(prev => ({ ...prev, additionalImages: files }));
  };

  // Handle paste for Add form
  const handleAddImagePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          // Check file size (limit to 5MB)
          if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            return;
          }
          setAddFormData(prev => ({ ...prev, image: file }));
          showNotification('✅ Image pasted from clipboard!', 'success');
        }
      }
    }
  };

  // Handle paste for Edit form
  const handleEditImagePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          // Check file size (limit to 5MB)
          if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            return;
          }
          setEditFormData(prev => ({ ...prev, image: file }));
          showNotification('✅ Image pasted from clipboard!', 'success');
        }
      }
    }
  }; 

  // Position Editor Functions
  const handleDragStart = (pokemon: PokemonSlot) => {
    if (!isPositionEditorMode) return;
    setDraggedPokemon(pokemon);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetPokemon: PokemonSlot) => {
    if (!draggedPokemon || !isPositionEditorMode || draggedPokemon.id === targetPokemon.id) {
      setDraggedPokemon(null);
      setIsDragging(false);
      return;
    }

    try {
      // Get the source and target positions
      const sourcePosition = draggedPokemon.id;
      const targetPosition = targetPokemon.id;

      console.log(`Inserting Pokemon from position ${sourcePosition} to position ${targetPosition}`);

      // Show smooth feedback
      setPositionFeedback(`#${sourcePosition} → #${targetPosition}`);
      setShowPositionFeedback(true);

      // Get all Pokemon that need to be updated
      const pokemonToUpdate = pokemonSlots.filter(p => p.hasArt && p.firebaseId);
      const updatePromises = [];

      // Determine which Pokemon need to move
      if (sourcePosition < targetPosition) {
        // Moving down: shift Pokemon between source+1 and target up by 1
        for (const pokemon of pokemonToUpdate) {
          if (pokemon.id > sourcePosition && pokemon.id <= targetPosition) {
            updatePromises.push(
              updatePokemon(pokemon.firebaseId!, { pokedexNumber: pokemon.id - 1 })
            );
          }
        }
      } else {
        // Moving up: shift Pokemon between target and source-1 down by 1
        for (const pokemon of pokemonToUpdate) {
          if (pokemon.id >= targetPosition && pokemon.id < sourcePosition) {
            updatePromises.push(
              updatePokemon(pokemon.firebaseId!, { pokedexNumber: pokemon.id + 1 })
            );
          }
        }
      }

      // Move the dragged Pokemon to the target position
      if (draggedPokemon.firebaseId && draggedPokemon.hasArt) {
        updatePromises.push(
          updatePokemon(draggedPokemon.firebaseId, { pokedexNumber: targetPosition })
        );
      }

      await Promise.all(updatePromises);

      // Reload data to reflect changes
      await loadPokemonData();
      
      // Hide feedback after a moment
      setTimeout(() => {
        setShowPositionFeedback(false);
      }, 2000);
    } catch (error) {
      console.error('Error inserting Pokemon position:', error);
      setPositionFeedback('❌ Insert failed');
      setShowPositionFeedback(true);
      setTimeout(() => {
        setShowPositionFeedback(false);
      }, 3000);
    } finally {
      setDraggedPokemon(null);
      setIsDragging(false);
    }
  };

  const handleTypeToggle = (type: string) => {
    setEditFormData(prev => {
      if (prev.types.includes(type)) {
        // Remove type
        return {
          ...prev,
          types: prev.types.filter(t => t !== type)
        };
      } else if (prev.types.length < 2) {
        // Add type (limit to 2)
        return {
          ...prev,
          types: [...prev.types, type]
        };
      } else {
        // Show notification when trying to add more than 2 types
        showNotification('Pokemon can only have up to 2 types', 'error');
        return prev;
      }
    });
  };

  const [selectedPokemon, setSelectedPokemon] = useState<PokemonSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPokemon, setDeletingPokemon] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Stats Editor state
  const [isStatsEditorMode, setIsStatsEditorMode] = useState(false);
  const [pokemonStats, setPokemonStats] = useState<{stats?: PokemonStats, ability?: PokemonAbility} | null>(null);

  // Auto-select first Pokemon with artwork when data loads
  useEffect(() => {
    if (pokemonSlots.length > 0 && !selectedPokemon) {
      const firstPokemonWithArt = pokemonSlots.find(pokemon => pokemon.hasArt);
      if (firstPokemonWithArt) {
        setSelectedPokemon(firstPokemonWithArt);
      }
    }
  }, [pokemonSlots, selectedPokemon]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    artist: '',
    types: [] as string[],
    unique: '',
    evolutionStage: 0,
    image: null as File | null,
    additionalImages: [] as File[], // Up to 3 additional images
    info: '',
    artworkDate: new Date()
  });
  const [addFormData, setAddFormData] = useState({
    name: '',
    artist: '',
    types: [] as string[],
    unique: '',
    evolutionStage: 0,
    image: null as File | null,
    info: '',
    artworkDate: new Date()
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Position Editor state
  const [isPositionEditorMode, setIsPositionEditorMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPokemon, setDraggedPokemon] = useState<PokemonSlot | null>(null);
  const [positionFeedback, setPositionFeedback] = useState<string>('');
  const [showPositionFeedback, setShowPositionFeedback] = useState(false);
  
  // Cache Management modal state
  const [showCacheManagement, setShowCacheManagement] = useState(false);
  
  // Image switching state for additional images
  const [currentDisplayImage, setCurrentDisplayImage] = useState<string | null>(null);
  
  // Notification system
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // 3D Image Animation state
  const [imageTransform, setImageTransform] = useState({ rotateX: 0, rotateY: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Pokemon list scroll ref
  const pokemonListRef = useRef<HTMLDivElement>(null);

  // Rating System state
  const [hoveredStar, setHoveredStar] = useState(0);
  const [pokemonRatings, setPokemonRatings] = useState<{
    [pokemonId: string]: {
      averageRating: number;
      totalVotes: number;
      totalPoints: number;
      ratings: { [deviceId: string]: number };
    }
  }>({});
  const [globalRankings, setGlobalRankings] = useState<{ [pokemonId: string]: number }>({});

  // Generate a unique device ID for rating system
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('pokemon_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('pokemon_device_id', deviceId);
    }
    return deviceId;
  };

  // Get user's rating for a specific Pokemon
  const getUserRating = (pokemonId: string): number => {
    const deviceId = getDeviceId();
    return pokemonRatings[pokemonId]?.ratings[deviceId] || 0;
  };

  // Tier system functions
  const getTierFromRating = (averageRating: number): string => {
    if (averageRating >= 9.3) return 'SS';
    if (averageRating >= 8.0) return 'S';
    if (averageRating >= 7.0) return 'A';
    if (averageRating >= 6.0) return 'B';
    if (averageRating >= 5.0) return 'C';
    if (averageRating >= 4.0) return 'D';
    return 'F';
  };

  const getTierImagePath = (tier: string): string => {
    return `/tiers/${tier.toLowerCase()}.png`;
  };

  const getPokemonTier = (pokemonId: string): string => {
    const rating = pokemonRatings[pokemonId]?.averageRating || 0;
    return getTierFromRating(rating);
  };

  // Function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000); // Hide after 5 seconds (increased from 4)
  };

  // Stats Editor functions
  const toggleStatsEditor = async () => {
    if (!selectedPokemon?.firebaseId) return;
    
    if (!isStatsEditorMode) {
      // Entering stats editor mode - load current stats
      const currentStats = await getPokemonStats(selectedPokemon.firebaseId);
      setPokemonStats(currentStats);
    }
    
    setIsStatsEditorMode(!isStatsEditorMode);
  };

  const handleSaveStats = async (stats: PokemonStats, ability: PokemonAbility) => {
    if (!selectedPokemon?.firebaseId) return;
    
    const success = await updatePokemonStats(selectedPokemon.firebaseId, stats, ability);
    if (success) {
      showNotification('✅ Stats and ability saved successfully!', 'success');
      // Update local state
      setPokemonStats({ stats, ability });
    } else {
      showNotification('❌ Failed to save stats. Please try again.', 'error');
    }
  };

  // Load stats when selected Pokemon changes
  useEffect(() => {
    if (selectedPokemon?.firebaseId && isStatsEditorMode) {
      getPokemonStats(selectedPokemon.firebaseId).then(setPokemonStats);
    }
  }, [selectedPokemon?.firebaseId, isStatsEditorMode]);

  // 3D Image Animation functions
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    // Check if the mouse is over a button (exclude buttons from 3D effect)
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return; // Don't apply 3D effect when hovering over buttons
    }
    
    const rect = imageRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (mouseY / rect.height) * -30; // Max 30 degrees
    const rotateY = (mouseX / rect.width) * 30;   // Max 30 degrees
    
    setImageTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setImageTransform({ rotateX: 0, rotateY: 0 });
  };

  // Scroll to bottom function
  const scrollToBottom = (instant = false) => {
    if (pokemonListRef.current) {
      pokemonListRef.current.scrollTo({
        top: pokemonListRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  // Scroll to specific Pokemon in the list
  const scrollToPokemon = (pokemonId: number, instant = false) => {
    if (!pokemonListRef.current) return;
    
    // Find the Pokemon element by its data-pokemon-id attribute
    const pokemonElement = pokemonListRef.current.querySelector(`[data-pokemon-id="${pokemonId}"]`);
    if (pokemonElement) {
      pokemonElement.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
        block: 'center' // Center the Pokemon in the view
      });
    }
  };

  // Image switching functions for additional images
  const handleImageSwitch = (clickedImageUrl: string) => {
    if (!selectedPokemon) return;
    
    // Simple toggle logic: whatever is clicked becomes the main display
    if (clickedImageUrl === selectedPokemon.imageUrl) {
      // Clicking main image button - switch back to main
      setCurrentDisplayImage(null);
    } else {
      // Clicking additional image button - switch to that image
      setCurrentDisplayImage(clickedImageUrl);
    }
  };

  // Get the currently displayed image URL
  const getDisplayedImageUrl = (): string => {
    if (currentDisplayImage && selectedPokemon) {
      return currentDisplayImage;
    }
    return selectedPokemon?.imageUrl || '';
  };

  // Reset displayed image when Pokemon changes
  useEffect(() => {
    setCurrentDisplayImage(null);
  }, [selectedPokemon?.id]);

  // Handle deleting additional images
  const handleDeleteAdditionalImage = (imageUrl: string) => {
    if (!selectedPokemon) return;
    
    const updatedImages = selectedPokemon.additionalImages?.filter(url => url !== imageUrl) || [];
    
    // Update selected Pokemon state immediately
    setSelectedPokemon(prev => prev ? {
      ...prev,
      additionalImages: updatedImages
    } : null);
    
    // If the deleted image was currently displayed, reset to main image
    if (currentDisplayImage === imageUrl) {
      setCurrentDisplayImage(null);
    }
  };

  // Rating System Functions
  const handleStarRating = async (pokemonId: string, rating: number) => {
    const deviceId = getDeviceId();
    
    try {
      // Update local state immediately for better UX
      setPokemonRatings(prev => {
        const currentRatings = prev[pokemonId] || { averageRating: 0, totalVotes: 0, totalPoints: 0, ratings: {} };
        const newRatings = { ...currentRatings.ratings, [deviceId]: rating };
        
        // Calculate new average and total points using the points system
        const totalRatings = Object.values(newRatings).reduce((sum, r) => sum + r, 0);
        const totalVotes = Object.keys(newRatings).length;
        const averageRating = totalVotes > 0 ? totalRatings / totalVotes : 0;
        
        // Calculate total points using the starsToPoints function (supports half-stars)
        const starsToPoints = (stars: number): number => {
          const pointMap: { [key: number]: number } = {
            0.5: 5, 1: 10, 1.5: 12.5, 2: 15, 2.5: 18, 3: 21, 3.5: 24.5, 4: 28, 4.5: 32, 
            5: 36, 5.5: 40.5, 6: 45, 6.5: 50, 7: 55, 7.5: 60.5, 8: 66, 8.5: 72, 9: 78, 9.5: 84.5, 10: 91
          };
          return pointMap[stars] || 0;
        };
        const totalPoints = Object.values(newRatings).reduce((sum, r) => sum + starsToPoints(r), 0);
        
        return {
          ...prev,
          [pokemonId]: {
            averageRating,
            totalVotes,
            totalPoints,
            ratings: newRatings
          }
        };
      });

      // Save to Firebase
      await saveRatingToFirebase(pokemonId, deviceId, rating);
      
      showNotification(`✨ Rated ${rating}/10 stars!`, 'success');
    } catch (error) {
      console.error('Error saving rating:', error);
      showNotification('❌ Failed to save rating. Please try again.', 'error');
    }
  };

  const saveRatingToFirebase = async (pokemonId: string, deviceId: string, rating: number) => {
    try {
      const success = await saveRating(pokemonId, deviceId, rating);
      if (!success) {
        throw new Error('Failed to save rating to Firebase');
      }
      
      // Clear ratings cache immediately for instant UI updates
      clearRatingsCache();
      
      // Reload rankings after successful save
      await loadRatings();
      
      // Reload user rating statistics
      await loadUserRatingStats();
      
      // Also save to localStorage as backup
      const localRatings = JSON.parse(localStorage.getItem('pokemon_ratings') || '{}');
      if (!localRatings[pokemonId]) {
        localRatings[pokemonId] = { ratings: {}, averageRating: 0, totalVotes: 0 };
      }
      localRatings[pokemonId].ratings[deviceId] = rating;
      
      // Calculate average for local storage
      const ratings = Object.values(localRatings[pokemonId].ratings) as number[];
      localRatings[pokemonId].averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      localRatings[pokemonId].totalVotes = ratings.length;
      
      localStorage.setItem('pokemon_ratings', JSON.stringify(localRatings));
    } catch (error) {
      // Fallback to localStorage if Firebase fails
      const localRatings = JSON.parse(localStorage.getItem('pokemon_ratings') || '{}');
      if (!localRatings[pokemonId]) {
        localRatings[pokemonId] = { ratings: {}, averageRating: 0, totalVotes: 0 };
      }
      localRatings[pokemonId].ratings[deviceId] = rating;
      
      const ratings = Object.values(localRatings[pokemonId].ratings) as number[];
      localRatings[pokemonId].averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      localRatings[pokemonId].totalVotes = ratings.length;
      
      localStorage.setItem('pokemon_ratings', JSON.stringify(localRatings));
      throw error;
    }
  };

  const loadRatings = async () => {
    try {
      // Try to load from Firebase first
      const firebaseRatings = await getAllRatings();
      setPokemonRatings(firebaseRatings);
      
      // Load global rankings
      const rankings = await getGlobalRankings();
      console.log('Global rankings loaded:', rankings);
      const rankingMap: { [pokemonId: string]: number } = {};
      rankings.forEach(ranking => {
        rankingMap[ranking.pokemonId] = ranking.rank;
      });
      console.log('Ranking map:', rankingMap);
      setGlobalRankings(rankingMap);
      
      // Update localStorage with Firebase data
      localStorage.setItem('pokemon_ratings', JSON.stringify(firebaseRatings));
    } catch (error) {
      console.error('Error loading ratings from Firebase:', error);
      
      // Fallback to localStorage
      const savedRatings = localStorage.getItem('pokemon_ratings');
      if (savedRatings) {
        setPokemonRatings(JSON.parse(savedRatings));
      }
    }
  };

  // Load ratings when component mounts
  useEffect(() => {
    loadRatings();
    loadFavorites();
    
    // Make debug functions available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).cleanupFavorites = cleanupFavoriteDocuments;
      (window as any).forceDeleteFavorite = forceDeleteFavorite;
      (window as any).resetAllFavorites = resetAllFavorites;
      (window as any).analyzeLowVoteDevices = analyzeLowVoteDevices;
      (window as any).cleanupLowVoteDevices = cleanupLowVoteDevices;
      console.log('🔧 Debug functions available:');
      console.log('  - window.cleanupFavorites()');
      console.log('  - window.forceDeleteFavorite(pokemonId, deviceId)');
      console.log('  - window.resetAllFavorites()');
      console.log('  - window.analyzeLowVoteDevices(maxVotes) // Analyze devices with few votes');
      console.log('  - window.cleanupLowVoteDevices(maxVotes, confirmationText) // CAREFUL!');
    }
  }, []);

  // Favorites System Functions
  const loadFavorites = async () => {
    try {
      const deviceId = getDeviceId();
      
      // Load user's favorites from Firebase
      const userFavs = await getUserFavorites(deviceId);
      setUserFavorites(userFavs);
      console.log(`📱 Loaded ${userFavs.length} user favorites:`, userFavs);

      // Load all Pokemon favorite counts from Firebase
      const allFavorites = await getAllFavorites();
      setPokemonFavorites(allFavorites);
      console.log(`🌐 Loaded favorite counts for ${Object.keys(allFavorites).length} Pokemon:`, allFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleFavoriteToggle = async (pokemonId: string) => {
    if (!pokemonId) return;

    const deviceId = getDeviceId();
    const isCurrentlyFavorited = userFavorites.includes(pokemonId);

    console.log(`🔄 ${isCurrentlyFavorited ? 'Removing' : 'Adding'} favorite: ${pokemonId}`);

    if (isCurrentlyFavorited) {
      // Remove from favorites
      const success = await saveFavorite(pokemonId, deviceId, false);
      if (success) {
        showNotification('❤️ Removed from favorites', 'info');
        // Reload favorites to get fresh data
        loadFavorites();
      }
    } else {
      // Add to favorites
      if (userFavorites.length >= 3) {
        setShowFavoritePopup(true);
        setTimeout(() => setShowFavoritePopup(false), 3000);
        return;
      }

      const success = await saveFavorite(pokemonId, deviceId, true);
      if (success) {
        showNotification('❤️ Added to favorites!', 'success');
        // Reload favorites to get fresh data
        loadFavorites();
      }
    }
  };

  const isPokemonFavorited = (pokemonId: string): boolean => {
    return userFavorites.includes(pokemonId);
  };

  const getPokemonFavoriteCount = (pokemonId: string): number => {
    return pokemonFavorites[pokemonId] || 0;
  };

  // Delete all user data (favorites and ratings)
  const deleteUserData = async () => {
    try {
      const deviceId = getDeviceId();
      
      // Delete data from Firebase first
      const firebaseDeleted = await deleteAllUserData(deviceId);
      
      if (firebaseDeleted) {
        // Clear localStorage data only after successful Firebase deletion
        localStorage.removeItem('pokemon_device_id');
        localStorage.removeItem('pokemon_ratings');
        localStorage.removeItem('pokemon_filter_collapsed_sections');
        
        // Reset all state
        setUserFavorites([]);
        setPokemonFavorites({});
        setPokemonRatings({});
        setUserRatingStats({
          averageRating: 0,
          totalRatings: 0,
          totalUnrated: pokemonSlots.filter(p => p.hasArt && p.firebaseId).length,
          ratingDistribution: {}
        });
        
        // Reload data to reflect changes
        await loadRatings();
        await loadFavorites();
        await loadUserRatingStats();
        
        showNotification('✅ All your data has been permanently deleted from our servers', 'success');
      } else {
        showNotification('❌ Failed to delete some data. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
      showNotification('❌ Error deleting data. Please try again.', 'error');
    }
  };
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [evolutionFilter, setEvolutionFilter] = useState<'all' | 'stage0' | 'stage1' | 'stage2' | 'gmax' | 'legendary' | 'mega' | 'evolved'>('all'); // Evolution filtering including new types
  const [userRatingFilter, setUserRatingFilter] = useState<number | null>(null); // Filter by user's own ratings
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false); // Filter to show only favorites
  
  // Favorites System state
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [pokemonFavorites, setPokemonFavorites] = useState<{[pokemonId: string]: number}>({});
  const [showFavoritePopup, setShowFavoritePopup] = useState(false);
  
  // Rating sorting and tier display states
  const [ratingSortOrder, setRatingSortOrder] = useState<'none' | 'ascending' | 'descending'>('none'); // Sort by global ranking
  const [userRatingSortOrder, setUserRatingSortOrder] = useState<'none' | 'best' | 'worst'>('none'); // Sort by user's own ratings
  const [showTiers, setShowTiers] = useState(true); // Toggle tier letters display

  // View mode state for list layout
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    // Load saved view mode from localStorage, default to 'list'
    const saved = localStorage.getItem('pokemon_view_mode');
    return (saved === 'list' || saved === 'grid') ? saved : 'list';
  });

  // Mobile filter modal state
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Function to handle opening mobile filters with animation
  const openMobileFilters = () => {
    setShowMobileFilters(true);
    // Small delay to allow DOM to update, then start animation
    setTimeout(() => {
      setMobileFiltersOpen(true);
    }, 10);
  };

  // Function to handle closing mobile filters with animation
  const closeMobileFilters = () => {
    setMobileFiltersOpen(false);
    setTimeout(() => {
      setShowMobileFilters(false);
    }, 300); // Match the animation duration
  };

  // Collapsible filter sections state (with localStorage persistence)
  const [collapsedSections, setCollapsedSections] = useState<{
    types: boolean;
    artists: boolean;
    evolution: boolean;
    rating: boolean;
  }>(() => {
    // Load saved state from localStorage, default to closed for new users
    const saved = localStorage.getItem('pokemon_filter_collapsed_sections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved filter states:', error);
      }
    }
    // Default state for new users (all collapsed)
    return {
      types: true,
      artists: true,
      evolution: true,
      rating: true
    };
  });

  // Rating distribution dropdown state (closed by default)
  const [isRatingDistributionCollapsed, setIsRatingDistributionCollapsed] = useState(true);
  
  // Sort state for rating distribution (false = most to least, true = least to most)
  const [isRatingDistributionSortAscending, setIsRatingDistributionSortAscending] = useState(false);

  // Toggle collapse state for a section
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => {
      const newState = {
        ...prev,
        [section]: !prev[section]
      };
      // Save to localStorage
      localStorage.setItem('pokemon_filter_collapsed_sections', JSON.stringify(newState));
      return newState;
    });
  };

  // Toggle view mode and save to localStorage
  const toggleViewMode = () => {
    setViewMode(prev => {
      const newViewMode = prev === 'list' ? 'grid' : 'list';
      // Save to localStorage
      localStorage.setItem('pokemon_view_mode', newViewMode);
      return newViewMode;
    });
  };

  // User rating statistics
  const [userRatingStats, setUserRatingStats] = useState<{
    averageRating: number;
    totalRatings: number;
    totalUnrated: number;
    ratingDistribution: { [key: string]: number };
  }>({
    averageRating: 0,
    totalRatings: 0,
    totalUnrated: 0,
    ratingDistribution: {}
  });

  // Get unique artists from the data
  // const allArtists = Array.from(new Set(pokemonSlots.filter(p => p.hasArt && p.artist).map(p => p.artist!)));
  
  // Get all types from the data
  const allTypes = Array.from(new Set(pokemonSlots.filter(p => p.hasArt && p.types).flatMap(p => p.types!)));

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedTypes.length > 0 || selectedArtists.length > 0 || uniqueOnly || evolutionFilter !== 'all' || userRatingFilter !== null || ratingSortOrder !== 'none' || userRatingSortOrder !== 'none' || showFavoritesOnly;

  // Filter pokemon based on current filters
  const filteredPokemon = pokemonSlots.filter(pokemon => {
    // In position editor mode, show all Pokemon (no filtering)
    if (isPositionEditorMode) {
      return true;
    }
    
    // Hide empty slots when any filters are active (they don't have properties to filter by)
    if (hasActiveFilters && !pokemon.hasArt) {
      return false;
    }
    
    // Search filter
    if (searchTerm && !pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Type filter (excluding U0, U1, U2 which are handled separately)
    if (selectedTypes.length > 0 && pokemon.types) {
      const regularTypes = selectedTypes.filter(t => !['U0', 'U1', 'U2'].includes(t));
      if (regularTypes.length > 0) {
        const hasSelectedType = regularTypes.some(type => pokemon.types!.includes(type));
        if (!hasSelectedType) return false;
      }
    }
    
    // Special unique filters (U0, U1, U2)
    const uniqueFilters = selectedTypes.filter(t => ['U0', 'U1', 'U2'].includes(t));
    if (uniqueFilters.length > 0 && (!pokemon.unique || !uniqueFilters.includes(pokemon.unique))) {
      return false;
    }
    
    // Artist filter
    if (selectedArtists.length > 0 && pokemon.artist) {
      if (!selectedArtists.includes(pokemon.artist)) return false;
    }
    
    // Legacy unique only filter (specifically U0 - doesn't evolve)
    if (uniqueOnly && pokemon.unique !== 'U0') {
      return false;
    }
    
    // Evolution stage filter
    if (evolutionFilter !== 'all' && pokemon.evolutionStage !== undefined) {
      if (evolutionFilter === 'stage0' && pokemon.evolutionStage !== 0) {
        return false; // Show only stage 0 (base forms)
      }
      if (evolutionFilter === 'stage1' && pokemon.evolutionStage !== 1) {
        return false; // Show only stage 1 (first evolution)
      }
      if (evolutionFilter === 'stage2' && pokemon.evolutionStage !== 2) {
        return false; // Show only stage 2 (second evolution)
      }
      if (evolutionFilter === 'gmax' && pokemon.evolutionStage !== 3) {
        return false; // Show only GMAX forms
      }
      if (evolutionFilter === 'legendary' && pokemon.evolutionStage !== 4) {
        return false; // Show only Legendary forms
      }
      if (evolutionFilter === 'mega' && pokemon.evolutionStage !== 5) {
        return false; // Show only MEGA forms
      }
      if (evolutionFilter === 'evolved' && pokemon.evolutionStage === 0) {
        return false; // Hide stage 0 when showing evolved forms (stage 1, 2, GMAX, Legendary, MEGA)
      }
    } else if (evolutionFilter !== 'all' && pokemon.evolutionStage === undefined) {
      return false; // Hide Pokemon without evolution stage data when filtering
    }
    
    // User rating filter - show only Pokemon that the user voted with a specific star rating or unrated Pokemon
    if (userRatingFilter !== null && pokemon.firebaseId) {
      const deviceId = getDeviceId();
      const userRating = pokemonRatings[pokemon.firebaseId]?.ratings[deviceId];
      
      if (userRatingFilter === 0) {
        // Show only unrated Pokemon (no rating from this user)
        if (userRating) {
          return false;
        }
      } else {
        // Show only Pokemon rated with the specific star rating
        if (userRating !== userRatingFilter) {
          return false;
        }
      }
    }

    // Favorites filter - show only favorited Pokemon
    if (showFavoritesOnly && pokemon.firebaseId) {
      if (!isPokemonFavorited(pokemon.firebaseId)) {
        return false;
      }
    }
    
    return true;
  });

  // Sort filtered Pokemon by global ranking or user rating if sorting is enabled
  const sortedPokemon = (() => {
    // If user rating sort is active, prioritize it over global ranking sort
    if (userRatingSortOrder !== 'none') {
      const deviceId = getDeviceId();
      const pokemonWithUserRatings = filteredPokemon.map(pokemon => ({
        ...pokemon,
        userRating: pokemon.firebaseId ? (pokemonRatings[pokemon.firebaseId]?.ratings[deviceId] || 0) : 0
      }));

      if (userRatingSortOrder === 'best') {
        // Sort by highest user rating first (10, 9, 8... then unrated at bottom)
        return pokemonWithUserRatings.sort((a, b) => b.userRating - a.userRating);
      } else {
        // Sort by lowest user rating first (unrated first, then 0.5, 1, 2...)
        return pokemonWithUserRatings.sort((a, b) => a.userRating - b.userRating);
      }
    }

    // Global ranking sort (original logic)
    if (ratingSortOrder === 'none') {
      return filteredPokemon;
    }

    const pokemonWithRanks = filteredPokemon.map(pokemon => ({
      ...pokemon,
      globalRank: pokemon.firebaseId ? globalRankings[pokemon.firebaseId] || Infinity : Infinity
    }));

    if (ratingSortOrder === 'ascending') {
      // Lower rank numbers first (1, 2, 3...)
      return pokemonWithRanks.sort((a, b) => a.globalRank - b.globalRank);
    } else {
      // Higher rank numbers first (descending by rank)
      return pokemonWithRanks.sort((a, b) => b.globalRank - a.globalRank);
    }
  })();

  // Navigation functions
  const navigatePrevious = () => {
    if (!selectedPokemon) return;
    
    const currentIndex = sortedPokemon.findIndex(p => p.id === selectedPokemon.id);
    if (currentIndex > 0) {
      setSelectedPokemon(sortedPokemon[currentIndex - 1]);
    }
  };

  const navigateNext = () => {
    if (!selectedPokemon) return;
    
    const currentIndex = sortedPokemon.findIndex(p => p.id === selectedPokemon.id);
    if (currentIndex < sortedPokemon.length - 1) {
      setSelectedPokemon(sortedPokemon[currentIndex + 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === '1') {
        navigatePrevious();
      } else if (e.key === 'ArrowRight' || e.key === '2') {
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPokemon, sortedPokemon]);

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      Fire: 'type-fire',
      Water: 'type-water',
      Electric: 'type-electric',
      Grass: 'type-grass',
      Psychic: 'type-psychic',
      Dragon: 'type-dragon',
      Dark: 'type-dark',
      Ghost: 'type-ghost',
      Steel: 'type-steel',
      Normal: 'type-normal',
      Ice: 'type-ice',
      Fighting: 'type-fighting',
      Poison: 'type-poison',
      Ground: 'type-ground',
      Flying: 'type-flying',
      Bug: 'type-bug',
      Rock: 'type-rock',
      Fairy: 'type-fairy',
    };
    return colors[type] || 'type-normal';
  };

  // Helper function to format date for input fields
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    
    // If it's already a string in the correct format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Convert to Date object if it isn't already
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    
    return dateObj.toISOString().split('T')[0];
  };

  // Helper function to safely format date for display
  const formatDateForDisplay = (date: Date | string | null | undefined): string => {
    if (!date) return 'Unknown';
    
    try {
      // Convert to Date object if it isn't already
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown';
      }
      
      // Format as DD/MM/YYYY (international format) or use a clearer format
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return 'Unknown';
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto relative min-h-screen transform scale-90 origin-top mt-4">
        {/* Loading State */}
        {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-purple-500 hover:bg-purple-400 transition ease-in-out duration-150">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading Pokemon data from Firebase...
          </div>
        </div>
      )}
      
      {!loading && (
        <>
          {/* Mobile Filter Button - Only visible on mobile */}
          <div className="md:hidden mb-4 px-4">
            <button
              onClick={openMobileFilters}
              className="w-full bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 text-white font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters & Search
            </button>
          </div>

          {/* Main Layout: Filters | Pokemon List | Detail Panel */}
          <div className="grid grid-cols-12 gap-4" style={{height: 'calc(100vh - 80px)'}}>
            
            {/* Left Panel - Filters (HIDDEN ON MOBILE) */}
            <div className="hidden md:block md:col-span-2 space-y-2 h-full custom-scrollbar animate-slide-in-left">
              <div className="overflow-y-auto space-y-2" style={{maxHeight: 'calc(100vh - 80px)'}}>
              
              {/* Filters Title */}
              <div className="text-center mt-2 animate-filter-item" style={{animationDelay: '0.3s'}}>
                <h2 className="text-white font-bold text-base mb-2">FILTERS</h2>
              </div>
              
              {/* Types */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.4s'}}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">Types</h3>
                  <button
                    onClick={() => toggleSection('types')}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {collapsedSections.types ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.types && (
                  <div className="grid grid-cols-3 gap-1">
                    {allTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          if (selectedTypes.includes(type)) {
                            setSelectedTypes(selectedTypes.filter(t => t !== type));
                          } else {
                            setSelectedTypes([...selectedTypes, type]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                          selectedTypes.includes(type)
                            ? `${getTypeColor(type)} text-white scale-105`
                            : 'bg-white/20 text-white/80 hover:bg-white/30'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Artists & Uniques - Combined */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.5s'}}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">Artists & Uniques</h3>
                  <button
                    onClick={() => toggleSection('artists')}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {collapsedSections.artists ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.artists && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Artists Section */}
                    <div>
                      <h3 className="text-white font-semibold mb-1 text-sm">Artists</h3>
                      <div className="space-y-1">
                        {['DAVE', 'JOAO', 'GUTO'].map(artist => (
                          <button
                            key={artist}
                            onClick={() => {
                              if (selectedArtists.includes(artist)) {
                                setSelectedArtists(selectedArtists.filter(a => a !== artist));
                              } else {
                                setSelectedArtists([...selectedArtists, artist]);
                              }
                            }}
                            className={`w-full px-2 py-1 rounded text-xs font-semibold transition-all ${
                              selectedArtists.includes(artist)
                                ? 'bg-yellow-400 text-black'
                                : 'bg-white/20 text-white/80 hover:bg-white/30'
                            }`}
                          >
                            {artist}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Uniques Section */}
                    <div>
                      <h3 className="text-white font-semibold mb-1 text-sm">Uniques</h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setUniqueOnly(false);
                            if (selectedTypes.includes('U0')) {
                              setSelectedTypes(selectedTypes.filter(t => t !== 'U0'));
                            } else {
                              setSelectedTypes([...selectedTypes.filter(t => !['U0', 'U1', 'U2'].includes(t)), 'U0']);
                            }
                          }}
                          className={`w-full px-2 py-1 rounded text-xs font-semibold transition-all ${
                            selectedTypes.includes('U0')
                              ? 'bg-gray-500 text-white'
                              : 'bg-white/20 text-white/80 hover:bg-white/30'
                          }`}
                        >
                          Doesn't Evolve
                        </button>
                        <button
                          onClick={() => {
                            if (selectedTypes.includes('U1')) {
                              setSelectedTypes(selectedTypes.filter(t => t !== 'U1'));
                            } else {
                              setSelectedTypes([...selectedTypes.filter(t => !['U0', 'U1', 'U2'].includes(t)), 'U1']);
                            }
                          }}
                          className={`w-full px-2 py-1 rounded text-xs font-semibold transition-all ${
                            selectedTypes.includes('U1')
                              ? 'bg-gray-500 text-white'
                              : 'bg-white/20 text-white/80 hover:bg-white/30'
                          }`}
                        >
                          Evolves Once
                        </button>
                        <button
                          onClick={() => {
                            if (selectedTypes.includes('U2')) {
                              setSelectedTypes(selectedTypes.filter(t => t !== 'U2'));
                            } else {
                              setSelectedTypes([...selectedTypes.filter(t => !['U0', 'U1', 'U2'].includes(t)), 'U2']);
                            }
                          }}
                          className={`w-full px-2 py-1 rounded text-xs font-semibold transition-all ${
                            selectedTypes.includes('U2')
                              ? 'bg-gray-500 text-white'
                              : 'bg-white/20 text-white/80 hover:bg-white/30'
                          }`}
                        >
                          Evolves Twice
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Evolution Stages */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.7s'}}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">Evolution</h3>
                  <button
                    onClick={() => toggleSection('evolution')}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {collapsedSections.evolution ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.evolution && (
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setEvolutionFilter(evolutionFilter === 'stage0' ? 'all' : 'stage0')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        evolutionFilter === 'stage0'
                          ? 'bg-green-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      Stage 0
                    </button>
                    <button
                      onClick={() => setEvolutionFilter(evolutionFilter === 'stage1' ? 'all' : 'stage1')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        evolutionFilter === 'stage1'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      Stage 1
                    </button>
                    <button
                      onClick={() => setEvolutionFilter(evolutionFilter === 'stage2' ? 'all' : 'stage2')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        evolutionFilter === 'stage2'
                          ? 'bg-red-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      Stage 2
                    </button>
                    <button
                      onClick={() => setEvolutionFilter(evolutionFilter === 'gmax' ? 'all' : 'gmax')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        evolutionFilter === 'gmax'
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      GMAX
                    </button>
                    <button
                      onClick={() => setEvolutionFilter(evolutionFilter === 'legendary' ? 'all' : 'legendary')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        evolutionFilter === 'legendary'
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      Legendary
                    </button>
                    <button
                      onClick={() => setEvolutionFilter(evolutionFilter === 'mega' ? 'all' : 'mega')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        evolutionFilter === 'mega'
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      MEGA
                    </button>
                  </div>
                )}
              </div>
              
              {/* Rating Section */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.7s'}}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">Global Ranking</h3>
                  <button
                    onClick={() => toggleSection('rating')}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {collapsedSections.rating ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.rating && (
                  <>
                    {/* Sort by Global Ranking */}
                    <div className="mb-2">
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => setRatingSortOrder('none')}
                          className={`px-1 py-1 rounded text-xs font-semibold transition-all ${
                            ratingSortOrder === 'none'
                              ? 'bg-gray-500 text-white'
                              : 'bg-white/20 text-white/80 hover:bg-white/30'
                          }`}
                        >
                          None
                        </button>
                        <button
                          onClick={() => setRatingSortOrder('ascending')}
                          className={`px-1 py-1 rounded text-xs font-semibold transition-all ${
                            ratingSortOrder === 'ascending'
                              ? 'bg-green-500 text-white'
                              : 'bg-white/20 text-white/80 hover:bg-white/30'
                          }`}
                        >
                          ↑ Asc
                        </button>
                        <button
                          onClick={() => setRatingSortOrder('descending')}
                          className={`px-1 py-1 rounded text-xs font-semibold transition-all ${
                            ratingSortOrder === 'descending'
                              ? 'bg-red-500 text-white'
                              : 'bg-white/20 text-white/80 hover:bg-white/30'
                          }`}
                        >
                          ↓ Desc
                        </button>
                      </div>
                    </div>
                    
                    {/* Show Tiers Toggle */}
                    <div>
                      <button
                        onClick={() => setShowTiers(!showTiers)}
                        className={`w-full px-2 py-1 rounded text-xs font-semibold transition-all ${
                          showTiers
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/20 text-white/80 hover:bg-white/30'
                        }`}
                      >
                        {showTiers ? '★ Hide Tiers' : '★ Show Tiers'}
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {/* Favorites Filter */}
              <div className="bg-red-500/20 backdrop-blur-md rounded-xl border border-red-500/30 p-2 animate-filter-item" style={{animationDelay: '0.85s'}}>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                  showFavoritesOnly
                    ? 'bg-red-500 text-white'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  {showFavoritesOnly ? 'Hide Favorites' : 'Show Favorites'}
                </button>
                {showFavoritesOnly && (
                  <p className="text-red-300 text-xs mt-1 text-center">
                    Showing {userFavorites.length}/3 favorites
                  </p>
                )}
              </div>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.8s'}}>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedTypes([]);
                      setSelectedArtists([]);
                      setUniqueOnly(false);
                      setEvolutionFilter('all');
                      setUserRatingFilter(null);
                      setRatingSortOrder('none');
                      setUserRatingSortOrder('none');
                      setShowFavoritesOnly(false);
                    }}
                    className="w-full px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
              
              {/* User Rating Statistics */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 animate-filter-item mt-4" style={{animationDelay: '0.9s'}}>
                <h3 className="text-white font-semibold mb-2 text-sm text-center">Your Rating Stats</h3>
                
                {/* Average Rating */}
                <div className="mb-3 text-center">
                  <div className="text-yellow-300 font-bold text-lg">
                    {userRatingStats.averageRating > 0 ? userRatingStats.averageRating.toFixed(1) : '0.0'}
                  </div>
                  <div className="text-white/70 text-xs">Average Stars</div>
                  
                  {/* Vote Progress Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/50 text-xs">Votes</span>
                      <span className="text-white/70 text-xs font-semibold">
                        {userRatingStats.totalRatings}/{pokemonSlots.filter(p => p.hasArt).length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          userRatingStats.totalRatings >= pokemonSlots.filter(p => p.hasArt).length && pokemonSlots.filter(p => p.hasArt).length > 0
                            ? 'bg-gradient-to-r from-green-400 to-green-500' 
                            : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                        }`}
                        style={{
                          width: `${pokemonSlots.filter(p => p.hasArt).length > 0 ? Math.min(100, (userRatingStats.totalRatings / pokemonSlots.filter(p => p.hasArt).length) * 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Rating Distribution Header with Toggle */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold text-xs">Rating Distribution</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRatingDistributionSortAscending(!isRatingDistributionSortAscending)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        isRatingDistributionSortAscending 
                          ? 'bg-blue-500/70 hover:bg-blue-500/80 text-white' 
                          : 'bg-gray-600/50 hover:bg-gray-600/70 text-white/80'
                      }`}
                      title={`Currently: ${isRatingDistributionSortAscending ? 'Sorted by vote count (most voted first)' : 'Ordered by star rating (10★ to 0.5★)'}`}
                    >
                      Sort
                    </button>
                    <button
                      onClick={() => setIsRatingDistributionCollapsed(!isRatingDistributionCollapsed)}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {isRatingDistributionCollapsed ? '▼' : '▲'}
                    </button>
                  </div>
                </div>
                
                {/* Rating Distribution Content (Collapsible) - Compact List */}
                {!isRatingDistributionCollapsed && (
                  <div className="space-y-2">
                    {/* Compact Rating List - 2 columns to prevent scrolling */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {(() => {
                        // Get all ratings with their counts (including 0 counts)
                        const ratingsWithCounts = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5]
                          .map(star => ({
                            star,
                            count: userRatingStats.ratingDistribution[star.toString()] || 0
                          }));
                          // Removed the filter - now shows all ratings including 0 counts
                        
                        // Sort based on toggle state
                        const sortedRatings = ratingsWithCounts.sort((a, b) => {
                          if (isRatingDistributionSortAscending) {
                            // When sort is ON (blue): Sort by count (most votes first)
                            return b.count - a.count; // Most to least votes
                          } else {
                            // When sort is OFF (gray): Sort by star rating (highest stars first)
                            return b.star - a.star; // 10★ to 0.5★
                          }
                        });
                        
                        return sortedRatings.map(({ star, count }) => (
                          <button
                            key={star}
                            onClick={() => {
                              if (count === 0) return; // Don't allow clicking if no votes
                              if (userRatingFilter === star) {
                                setUserRatingFilter(null);
                              } else {
                                setUserRatingFilter(star);
                              }
                            }}
                            disabled={count === 0}
                            className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-all ${
                              userRatingFilter === star
                                ? 'bg-blue-500 text-white'
                                : count > 0
                                ? 'bg-white/10 hover:bg-white/20 text-white/90'
                                : 'bg-white/5 text-white/40 cursor-not-allowed'
                            }`}
                            title={count > 0 ? `Filter Pokemon you rated ${star} stars (${count} Pokemon)` : `No Pokemon rated ${star} stars`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-300 font-bold">{star}</span>
                              <svg className="w-2.5 h-2.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                            <span className="font-semibold">{count}</span>
                          </button>
                        ));
                      })()}
                    </div>
                    
                    {/* Unrated Pokemon Button */}
                    {userRatingStats.totalUnrated > 0 && (
                      <div className="pt-1 border-t border-white/10">
                        <button
                          onClick={() => {
                            if (userRatingFilter === 0) {
                              setUserRatingFilter(null);
                            } else {
                              setUserRatingFilter(0);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-all ${
                            userRatingFilter === 0
                              ? 'bg-orange-500 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-white/90'
                          }`}
                          title={`Show ${userRatingStats.totalUnrated} Pokemon you haven't rated yet`}
                        >
                          <div className="flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Unrated</span>
                          </div>
                          <span className="font-semibold">{userRatingStats.totalUnrated}</span>
                        </button>
                      </div>
                    )}
                    
                    {/* User Rating Sort Button */}
                    {userRatingStats.totalRatings > 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setUserRatingSortOrder(userRatingSortOrder === 'none' ? 'best' : userRatingSortOrder === 'best' ? 'worst' : 'none')}
                          className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                            userRatingSortOrder === 'none'
                              ? 'bg-white/10 hover:bg-white/20 text-white/70'
                              : userRatingSortOrder === 'best'
                              ? 'bg-green-500/60 text-white'
                              : 'bg-red-500/60 text-white'
                          }`}
                          title="Sort Pokemon by your personal ratings"
                        >
                          {userRatingSortOrder === 'none' ? 'Sort by My Ratings' : 
                           userRatingSortOrder === 'best' ? 'Best → Worst' : 
                           'Worst → Best'}
                        </button>
                      </div>
                    )}
                    
                    {/* Delete User Data Button */}
                    {(userRatingStats.totalRatings > 0 || userFavorites.length > 0) && (
                      <div className="pt-1 border-t border-white/10">
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure? This will permanently delete all your ratings and favorites. This action cannot be undone.')) {
                              deleteUserData();
                            }
                          }}
                          className="w-full px-2 py-1 bg-red-500/60 hover:bg-red-500/80 text-white/80 text-xs rounded transition-colors"
                          title="Permanently delete all your ratings and favorites"
                        >
                          🗑️ Delete My Data
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {userRatingStats.totalRatings === 0 && (
                  <div className="text-center text-white/50 text-xs mt-2">
                    No ratings yet. Start rating each Pokemon!
                  </div>
                )}
              </div>

              </div>
            </div>
            
            {/* Middle Panel - Search + Pokemon List (HIDDEN ON MOBILE) */}
            <div className="hidden md:flex md:col-span-6 h-full flex-col animate-slide-in-top">
              
              {/* Pokemon List Title */}
              <div className="text-center flex-shrink-0 mt-2">
                <div className="flex items-center justify-center gap-3">
                  <h2 className={`font-bold text-base mb-2 ${
                    isPositionEditorMode ? 'text-blue-300' : 'text-white'
                  }`}>
                    {isPositionEditorMode ? 'POSITION EDITOR MODE' : 'POKEMON LIST'}
                  </h2>
                  {!isPositionEditorMode && (
                    <div className="text-white/60 text-sm mb-2">
                      <span className="text-yellow-300 font-bold">{sortedPokemon.filter(p => p.hasArt).length}</span> / {pokemonSlots.length} Pokemon Found
                      {hasActiveFilters && (
                        <span className="ml-2 text-blue-300">
                          ({sortedPokemon.length} filtered)
                        </span>
                      )}
                      {userRatingFilter !== null && (
                        <span className="ml-2 text-purple-300 text-xs">
                          [You rated {userRatingFilter}★]
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {isPositionEditorMode && (
                  <p className="text-blue-200 text-xs mb-2">
                    Drag Pokemon with artwork to swap their Pokedex positions
                  </p>
                )}
              </div>
              
              {/* Search Bar */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 flex-shrink-0 mb-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={isPositionEditorMode ? "Position Editor Mode - Search disabled" : "Search Pokemon name..."}
                    value={isPositionEditorMode ? "" : searchTerm}
                    onChange={(e) => !isPositionEditorMode && setSearchTerm(e.target.value)}
                    disabled={isPositionEditorMode}
                    className={`flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm ${
                      isPositionEditorMode ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  
                  {/* View Toggle Button */}
                  <button
                    onClick={toggleViewMode}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all text-sm flex items-center gap-1 ${
                      viewMode === 'grid'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                    title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
                  >
                    {viewMode === 'list' ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Grid
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        List
                      </>
                    )}
                  </button>
                  
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsPositionEditorMode(!isPositionEditorMode)}
                        className={`px-2 py-1 rounded-lg font-semibold transition-all text-sm ${
                          isPositionEditorMode
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        title={isPositionEditorMode ? 'Exit Position Editor' : 'Edit Pokemon Positions'}
                      >
                        {isPositionEditorMode ? '✕' : '✏️'}
                      </button>
                      <button
                        onClick={() => setShowCacheManagement(true)}
                        className="px-2 py-1 rounded-lg font-semibold transition-all text-sm bg-purple-500 text-white hover:bg-purple-600"
                        title="Cache Management"
                      >
                        🗄️
                      </button>
                    </div>
                  )}
                </div>
                {isPositionEditorMode && (
                  <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                    <p className="text-blue-200 text-sm">
                      🎯 <strong>Position Editor Mode:</strong> Drag and drop Pokemon to swap their Pokedex positions.
                    </p>
                  </div>
                )}
              </div>

              {/* Position Insert Feedback Notification */}
              {showPositionFeedback && (
                <div className="fixed top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
                  {positionFeedback}
                </div>
              )}

              {/* Main Notification System */}
              {notification.show && (
                <div className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-2xl z-50 transform transition-all duration-500 ease-in-out animate-bounce ${
                  notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                  notification.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                } text-white border border-white/20 backdrop-blur-sm`}>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {notification.type === 'success' && <span className="text-2xl">✅</span>}
                      {notification.type === 'error' && <span className="text-2xl">❌</span>}
                      {notification.type === 'info' && <span className="text-2xl">ℹ️</span>}
                    </div>
                    <span className="font-medium">{notification.message}</span>
                  </div>
                </div>
              )}

              {/* Favorites Limit Popup */}
              {showFavoritePopup && (
                <div className="fixed top-4 right-4 px-6 py-4 rounded-lg shadow-2xl z-50 transform transition-all duration-500 ease-in-out animate-bounce bg-gradient-to-r from-red-500 to-red-600 text-white border border-white/20 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">✌️💔🥀</span>
                    </div>
                    <span className="font-medium">You've reached max 3 favorites!</span>
                  </div>
                </div>
              )}
              
              {/* Pokemon List */}
              <div ref={pokemonListRef} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-2 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(100vh - 170px)'}}>
                {viewMode === 'list' ? (
                  /* List View */
                  <div className="space-y-2">
                    {sortedPokemon.map((pokemon, index) => (
                      <div key={pokemon.id} className={`flex items-center transition-all duration-300 ease-in-out ${showTiers ? 'gap-2' : 'gap-0'}`}>
                        {/* Pokemon List Item - Shrinks to make room for tier images */}
                        <div
                          data-pokemon-id={pokemon.id}
                          draggable={isPositionEditorMode && pokemon.hasArt}
                          onDragStart={() => handleDragStart(pokemon)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(pokemon)}
                          onClick={() => {
                            if (!isPositionEditorMode) {
                              setSelectedPokemon(pokemon);
                              setShowDeleteConfirm(false);
                              setShowEditForm(false);
                              setShowActionsDropdown(false);
                            }
                          }}
                          className={`flex items-center p-2 m-1 rounded-lg border transition-all duration-300 ease-in-out animate-fade-in-up ${showTiers ? 'flex-1' : 'w-full'} ${
                            isPositionEditorMode 
                              ? pokemon.hasArt 
                                ? 'cursor-grab active:cursor-grabbing bg-blue-500/10 border-blue-400/50 hover:bg-blue-500/20 hover:border-blue-400' 
                                : 'cursor-not-allowed bg-gray-500/10 border-gray-400/20'
                              : `cursor-pointer ${
                                  selectedPokemon?.id === pokemon.id
                                  ? 'bg-yellow-400/20 border-yellow-400 scale-[1.02]'
                                  : pokemon.hasArt 
                                  ? pokemon.firebaseId && isPokemonFavorited(pokemon.firebaseId)
                                    ? 'bg-red-300/10 border-red-400/30 hover:bg-red-500/20 hover:border-red-400/50'
                                    : (pokemon.evolutionStage === 4 
                                      ? 'bg-orange-200/10 border-orange-300/20 hover:bg-orange-200/20 hover:border-orange-300/30' 
                                      : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40')
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`
                        } ${isDragging && draggedPokemon?.id === pokemon.id ? 'opacity-50 scale-95' : ''}`}
                        style={{
                          animationDelay: `${index * (0.03 * animationSpeedMultiplier)}s`
                        }}
                      >
                        {/* Pokemon Number */}
                        <div className="flex-shrink-0 w-10 text-center">
                          <span className="text-white/80 font-bold text-xs">
                            #{pokemon.id.toString().padStart(3, '0')}
                          </span>
                        </div>
                        
                        {/* Pokemon Image */}
                        <div className="flex-shrink-0 w-12 h-12 ml-2 relative">
                          {pokemon.hasArt ? (
                            <img
                              src={pokemon.imageUrl}
                              alt={pokemon.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center">
                              <span className="text-white/40 text-xl">?</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Pokemon Info */}
                        <div className="flex-1 ml-3">
                          <h3 className="text-white font-semibold text-base">
                            {pokemon.name}
                          </h3>
                          {pokemon.hasArt ? (
                            <div className="flex items-center space-x-3">
                              <p className="text-white/60 text-xs">
                                by {pokemon.artist}
                              </p>
                              {pokemon.types && (
                                <div className="flex gap-1">
                                  {pokemon.types.slice(0, 2).map((type) => (
                                    <span
                                      key={type}
                                      className={`px-1.5 py-0.5 rounded text-xs font-semibold text-white ${getTypeColor(type)}`}
                                    >
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-white/40 text-xs">No artwork yet</p>
                          )}
                        </div>
                        
                        {/* Favorite Heart Section - Moved to the left */}
                        {pokemon.firebaseId && getPokemonFavoriteCount(pokemon.firebaseId) > 0 && (
                          <div className="flex-shrink-0 flex flex-col items-center bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-1 mx-2">
                            <svg 
                              className={`w-6 h-6 ${
                                isPokemonFavorited(pokemon.firebaseId)
                                  ? 'text-red-400 fill-current'
                                  : 'text-white/60'
                              }`} 
                              fill={isPokemonFavorited(pokemon.firebaseId) ? 'currentColor' : 'none'} 
                              stroke="currentColor" 
                              strokeWidth={isPokemonFavorited(pokemon.firebaseId) ? 1 : 2}
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                              />
                            </svg>
                            <span className="text-white text-xs font-bold">
                              {getPokemonFavoriteCount(pokemon.firebaseId)}
                            </span>
                          </div>
                        )}

                        {/* Special Indicators */}
                        <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                          {/* Position Editor Drag Indicator */}
                          {isPositionEditorMode && pokemon.hasArt && (
                            <div className="flex items-center text-blue-300 text-xs">
                              <span className="mr-1">⋮⋮</span>
                              <span>Drag</span>
                            </div>
                          )}
                          {isPositionEditorMode && !pokemon.hasArt && (
                            <div className="flex items-center text-gray-500 text-xs">
                              <span className="mr-1">✕</span>
                              <span>Empty</span>
                            </div>
                          )}
                          {pokemon.firebaseId && (
                            <div className="flex items-center gap-1">
                              {/* Star Rating and Ranking */}
                              {globalRankings[pokemon.firebaseId] ? (
                                <>
                                  <span className="bg-yellow-200 text-xs font-bold px-1.5 py-0.5 rounded">
                                    {pokemonRatings[pokemon.firebaseId]?.averageRating 
                                      ? `${pokemonRatings[pokemon.firebaseId].averageRating.toFixed(1)}★` 
                                      : '0.0★'}
                                  </span>
                                  <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded text-xs font-bold min-w-[2.4rem] text-center">
                                    #{globalRankings[pokemon.firebaseId]}
                                  </span>
                                </>
                              ) : (
                                <span className="bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[2.5rem] text-center">
                                  Unranked
                                </span>
                              )}
                            </div>
                          )}
                          {pokemon.evolutionStage !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white min-w-[5rem] text-center ${
                              pokemon.evolutionStage === 0 ? 'bg-green-500' :
                              pokemon.evolutionStage === 1 ? 'bg-yellow-500' :
                              pokemon.evolutionStage === 2 ? 'bg-red-500' :
                              pokemon.evolutionStage === 3 ? 'bg-purple-500' :
                              pokemon.evolutionStage === 4 ? 'bg-orange-500' :
                              pokemon.evolutionStage === 5 ? 'bg-pink-500' : 'bg-gray-500'
                            }`}>
                              {pokemon.evolutionStage === 0 ? 'Stage 0' :
                               pokemon.evolutionStage === 1 ? 'Stage 1' :
                               pokemon.evolutionStage === 2 ? 'Stage 2' :
                               pokemon.evolutionStage === 3 ? 'GMAX' :
                               pokemon.evolutionStage === 4 ? 'Legendary' :
                               pokemon.evolutionStage === 5 ? 'MEGA' : `Stage ${pokemon.evolutionStage}`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Tier Image - Separate container that appears next to list item */}
                      <div className={`flex-shrink-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
                        showTiers ? 'w-14 h-14 opacity-100' : 'w-0 h-14 opacity-0 overflow-hidden'
                      }`}>
                        {showTiers && pokemon.firebaseId && pokemonRatings[pokemon.firebaseId]?.averageRating ? (
                          <img
                            src={getTierImagePath(getPokemonTier(pokemon.firebaseId))}
                            alt={`${getPokemonTier(pokemon.firebaseId)} Tier`}
                            className="w-12 h-12 object-contain transition-transform duration-300 ease-in-out"
                          />
                        ) : showTiers ? (
                          <div className="w-12 h-12"></div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  
                  {sortedPokemon.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-white/60">No Pokemon match your current filters</p>
                    </div>
                  )}
                </div>
                ) : (
                  /* Grid View */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {sortedPokemon.map((pokemon, index) => (
                      <div
                        key={pokemon.id}
                        data-pokemon-id={pokemon.id}
                        draggable={isPositionEditorMode && pokemon.hasArt}
                        onDragStart={() => handleDragStart(pokemon)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(pokemon)}
                        onClick={() => {
                          if (!isPositionEditorMode) {
                            setSelectedPokemon(pokemon);
                            setShowDeleteConfirm(false);
                            setShowEditForm(false);
                            setShowActionsDropdown(false);
                          }
                        }}
                        className={`relative bg-white/10 rounded-lg border transition-all duration-300 ease-in-out animate-fade-in-up overflow-hidden ${
                          isPositionEditorMode 
                            ? pokemon.hasArt 
                              ? 'cursor-grab active:cursor-grabbing bg-blue-500/10 border-blue-400/50 hover:bg-blue-500/20 hover:border-blue-400' 
                              : 'cursor-not-allowed bg-gray-500/10 border-gray-400/20'
                            : `cursor-pointer ${
                                selectedPokemon?.id === pokemon.id
                                  ? 'bg-yellow-500/20 border-yellow-400'
                                  : pokemon.hasArt
                                  ? pokemon.firebaseId && isPokemonFavorited(pokemon.firebaseId)
                                    ? 'bg-red-500/10 border-red-400/30 hover:bg-red-500/20 hover:border-red-400/50'
                                    : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40'
                                  : 'bg-gray-500/10 border-gray-400/20'
                              }`
                        } ${
                          isDragging && draggedPokemon?.id === pokemon.id ? 'dragging' : ''
                        }`}
                        style={{
                          animationDelay: isInitialLoad ? `${index * animationSpeedMultiplier * 50}ms` : '0ms'
                        }}
                      >
                        {/* Tier Badge - Top Right */}
                        {showTiers && pokemon.hasArt && pokemon.firebaseId && (
                          <div className="absolute top-1 right-1 z-10">
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center"
                              style={{
                                backgroundImage: `url(${getTierImagePath(getPokemonTier(pokemon.firebaseId))})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                              title={`Tier ${getPokemonTier(pokemon.firebaseId)} (${pokemonRatings[pokemon.firebaseId]?.averageRating?.toFixed(1) || 'N/A'}/10)`}
                            />
                          </div>
                        )}
                        
                        {/* Pokemon Image */}
                        <div className="aspect-square bg-white/5 relative">
                          {pokemon.hasArt && pokemon.imageUrl ? (
                            <img
                              src={pokemon.imageUrl}
                              alt={pokemon.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Favorite Heart - Top Left */}
                          {pokemon.hasArt && pokemon.firebaseId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFavoriteToggle(pokemon.firebaseId!);
                              }}
                              className={`absolute top-1 left-1 p-1 rounded-full transition-all duration-200 ${
                                isPokemonFavorited(pokemon.firebaseId)
                                  ? 'text-red-500 bg-white/90 hover:bg-white scale-110'
                                  : 'text-white/70 bg-black/50 hover:bg-black/70 hover:text-white'
                              }`}
                              title={isPokemonFavorited(pokemon.firebaseId) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Pokemon Info */}
                        <div className="p-2">
                          <div className="text-xs text-white/70 mb-1">#{pokemon.id.toString().padStart(3, '0')}</div>
                          <div className="text-sm font-semibold text-white truncate" title={pokemon.name}>
                            {pokemon.name}
                          </div>
                          {/* Types and Rating - Compact format */}
                          {pokemon.hasArt && (
                            <div className="space-y-1 mt-1">
                              {/* Artist and Favorite Counter */}
                              {pokemon.artist && (
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-white/60 truncate" title={`By ${pokemon.artist}`}>
                                    {pokemon.artist}
                                  </div>
                                  {pokemon.firebaseId && getPokemonFavoriteCount(pokemon.firebaseId) > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-red-300 bg-black/40 rounded-full px-2 py-1">
                                      <span>❤</span>
                                      <span className="text-white/70">
                                        {getPokemonFavoriteCount(pokemon.firebaseId)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Types and Rating */}
                              <div className="flex items-center justify-between">
                                {/* Types */}
                                <div className="flex gap-1">
                                  {pokemon.types?.map(type => (
                                    <span 
                                      key={type} 
                                      className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${getTypeColor(type)}`}
                                    >
                                      {type}
                                    </span>
                                  ))}
                                </div>
                                
                                {/* Rating */}
                                {pokemon.firebaseId && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-300 bg-black/40 rounded-full px-2 py-1">
                                    <span>★</span>
                                    <span className="text-white/70">
                                      {pokemonRatings[pokemon.firebaseId]?.averageRating?.toFixed(1) || 'N/A'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {sortedPokemon.length === 0 && (
                      <div className="col-span-full text-center py-8">
                        <p className="text-white/60">No Pokemon match your current filters</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Scroll to Bottom Button */}
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => scrollToBottom()}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/20 transition-all duration-300 hover:border-white/40 group"
                  title="Scroll to bottom"
                >
                  <svg 
                    className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-300" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Right Panel - Pokemon Detail (FULL WIDTH ON MOBILE) */}
            <div className="col-span-12 md:col-span-4 space-y-2 h-full custom-scrollbar animate-slide-in-right">
              <div className="overflow-y-auto" style={{maxHeight: 'calc(100vh - 80px)'}}>
              
              {/* Details Title */}
              <div className="text-center mt-2 animate-filter-item" style={{animationDelay: '0.4s'}}>
                <h2 className="text-white font-bold text-base mb-2">DETAILS</h2>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 animate-filter-item relative" style={{animationDelay: '0.5s'}}>
                {/* Tier Image - Top Right Corner of Details Section */}
                {showTiers && selectedPokemon && selectedPokemon.firebaseId && pokemonRatings[selectedPokemon.firebaseId]?.averageRating && (
                  <div className="absolute top-3 right-3 z-20 bg-white-800 backdrop-blur-sm rounded-lg p-2 border border-white/30 shadow-lg">
                    <img
                      src={getTierImagePath(getPokemonTier(selectedPokemon.firebaseId))}
                      alt={`${getPokemonTier(selectedPokemon.firebaseId)} Tier`}
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                )}
                
                {selectedPokemon && selectedPokemon.hasArt ? (
                  <div className="space-y-2">
                    {/* Favorite Button - Top Left Corner, positioned absolutely */}
                    {selectedPokemon.firebaseId && (
                      <div className="absolute top-3 left-3 z-20">
                        <button
                          onClick={() => handleFavoriteToggle(selectedPokemon.firebaseId!)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 backdrop-blur-sm border ${
                            isPokemonFavorited(selectedPokemon.firebaseId!)
                              ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                              : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                          }`}
                          title={isPokemonFavorited(selectedPokemon.firebaseId!) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg 
                            className={`w-7 h-7 transition-all duration-200 ${
                              isPokemonFavorited(selectedPokemon.firebaseId!)
                                ? 'text-red-400 fill-current'
                                : 'text-white/70'
                            }`} 
                            fill={isPokemonFavorited(selectedPokemon.firebaseId!) ? 'currentColor' : 'none'} 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                            />
                          </svg>
                          <span className="text-base font-medium">
                            {getPokemonFavoriteCount(selectedPokemon.firebaseId!)}
                          </span>
                        </button>
                      </div>
                    )}
                    
                    {/* Large Image with 3D Effect and Navigation */}
                    <div className="w-full mx-auto perspective-1000 relative">
                      {/* Previous Arrow - Fixed Position */}
                      <button
                        onClick={navigatePrevious}
                        disabled={!selectedPokemon || sortedPokemon.findIndex(p => p.id === selectedPokemon.id) === 0}
                        className="absolute left-0 top-[200px] z-10 bg-white/20 hover:bg-white/30 disabled:bg-gray-500/20 disabled:cursor-not-allowed backdrop-blur-md rounded-full p-3 transition-all duration-200 group"
                        title="Previous Pokemon (Left Arrow)"
                      >
                        <svg className="w-6 h-6 text-white group-disabled:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Next Arrow - Fixed Position */}
                      <button
                        onClick={navigateNext}
                        disabled={!selectedPokemon || sortedPokemon.findIndex(p => p.id === selectedPokemon.id) === sortedPokemon.length - 1}
                        className="absolute right-0 top-[200px] z-10 bg-white/20 hover:bg-white/30 disabled:bg-gray-500/20 disabled:cursor-not-allowed backdrop-blur-md rounded-full p-3 transition-all duration-200 group"
                        title="Next Pokemon (Right Arrow)"
                      >
                        <svg className="w-6 h-6 text-white group-disabled:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Main Image Container */}
                      <div className="flex items-center justify-center">
                        <div 
                          ref={imageRef}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          className="relative w-full max-w-xl group cursor-pointer mx-16"
                          style={{ 
                            perspective: '1000px',
                          }}
                        >
                          {/* Circular Shadow Layer */}
                          <div 
                            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 w-3/4 h-4 bg-black/40 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-all duration-300"
                          ></div>
                          
                          {/* Main Image */}
                          <div
                            className="relative w-full rounded-lg overflow-hidden transform-gpu transition-transform duration-300 ease-out group-hover:scale-105"
                            style={{
                              transform: `rotateX(${imageTransform.rotateX}deg) rotateY(${imageTransform.rotateY}deg)`,
                              transformStyle: 'preserve-3d',
                            }}
                          >
                            <img
                              src={getDisplayedImageUrl()}
                              alt={selectedPokemon.name}
                              className="w-full h-auto object-contain max-h-[32rem]"
                            />
                          </div>
                        
                          {/* Additional Image Buttons - Vertical layout, positioned absolutely far right */}
                          {selectedPokemon.additionalImages && selectedPokemon.additionalImages.length > 0 && (
                            <div className="absolute bottom-0 right-[-60px] flex flex-col gap-2 z-10">
                              {/* Show main image button only if we're NOT currently viewing the main image */}
                              {currentDisplayImage && (
                                <button
                                  onClick={() => handleImageSwitch(selectedPokemon.imageUrl!)}
                                  className="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-110 border-yellow-400/70 hover:border-yellow-300 shadow-md shadow-yellow-400/25"
                                  title="Main image"
                                >
                                  <img
                                    src={selectedPokemon.imageUrl}
                                    alt="Main"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              )}
                              
                              {/* Show additional image buttons only if they're NOT currently displayed */}
                              {selectedPokemon.additionalImages.map((imageUrl, index) => {
                                // Only show this button if this image is NOT currently displayed
                                if (currentDisplayImage === imageUrl) {
                                  return null;
                                }

                                return (
                                  <button
                                    key={index}
                                    onClick={() => handleImageSwitch(imageUrl)}
                                    className="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-110 border-white/40 hover:border-white/60"
                                    title={`Additional image ${index + 1}`}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`Additional ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Pokemon Number */}
                    <div className="text-center">
                      <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                        #{selectedPokemon.id.toString().padStart(3, '0')}
                      </span>
                    </div>
                    
                    {/* Name and Types */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h2 className="text-xl font-bold text-white">
                          {selectedPokemon.name}
                        </h2>
                        {/* Info Button - Only show if info text exists */}
                        {selectedPokemon.info && selectedPokemon.info.trim() && (
                          <div className="relative group">
                            <button className="text-white/60 hover:text-white transition-colors duration-200">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-8 py-4 bg-black/90 text-white text-sm rounded-lg border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 max-w-2xl min-w-80 whitespace-normal">
                              {selectedPokemon.info}
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/90"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Types next to name */}
                      {selectedPokemon.types && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {selectedPokemon.types.map((type) => (
                            <span
                              key={type}
                              className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getTypeColor(type)}`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Artist and Artwork Date */}
                    <div className="text-white/80 text-center text-sm space-y-1">
                      <p>
                        Created by <span className="text-yellow-300 font-semibold">{selectedPokemon.artist}</span>
                      </p>
                      {selectedPokemon.artworkDate && (
                        <p className="text-white/60 text-xs">
                          <span className="text-blue-300 font-medium">
                            {formatDateForDisplay(selectedPokemon.artworkDate)}
                          </span>
                        </p>
                      )}
                    </div>
                    
                    {/* Stats Editor Section (Admin Only) */}
                    {isAdmin && isStatsEditorMode && selectedPokemon?.firebaseId && (
                      <div className="mt-4 mb-4">
                        <StatsEditor
                          pokemonId={selectedPokemon.firebaseId}
                          initialStats={pokemonStats?.stats}
                          initialAbility={pokemonStats?.ability}
                          onSave={handleSaveStats}
                        />
                      </div>
                    )}
                    
                    {/* Star Rating System with Half-Stars */}
                    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-center items-center flex-wrap mb-2">
                        <div className="relative flex justify-center items-center">
                          <div className="flex justify-center items-center flex-wrap" style={{ gap: '4px' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                              const currentRating = getUserRating(selectedPokemon.firebaseId!);
                              const hoverRating = hoveredStar;
                              const displayRating = hoverRating || currentRating;
                              
                              return (
                                <div key={star} className="relative" style={{ margin: '-2px' }}>
                                  {/* Star background (gray) */}
                                  <svg
                                    className="w-8 h-8 text-gray-400 absolute"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  
                                  {/* Star fill (yellow) with better glow for half-stars */}
                                  <svg
                                    className="w-8 h-8 text-yellow-400 relative transition-opacity duration-75"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    style={{
                                      filter: displayRating >= star - 0.5 ? 'drop-shadow(0 0 6px rgba(255,255,0,0.7))' : 'none',
                                      clipPath: displayRating >= star ? 'none' : 
                                               displayRating >= star - 0.5 ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' : 
                                               'polygon(0 0, 0 0, 0 100%, 0 100%)'
                                    }}
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  
                                  {/* Extended button overlay for half-star (left half + overlap) */}
                                  <button
                                    className="absolute z-10 hover:bg-white/5 rounded-l transition-colors duration-75"
                                    style={{
                                      left: '-2px',
                                      top: '0',
                                      width: 'calc(50% + 2px)',
                                      height: '100%'
                                    }}
                                    onClick={() => handleStarRating(selectedPokemon.firebaseId!, star - 0.5)}
                                    onMouseEnter={() => setHoveredStar(star - 0.5)}
                                    onMouseLeave={() => setHoveredStar(0)}
                                    title={`Rate ${star - 0.5} stars`}
                                  />
                                  
                                  {/* Extended button overlay for full star (right half + overlap) */}
                                  <button
                                    className="absolute z-10 hover:bg-white/5 rounded-r transition-colors duration-75"
                                    style={{
                                      left: 'calc(50% - 2px)',
                                      top: '0',
                                      width: 'calc(50% + 2px)',
                                      height: '100%'
                                    }}
                                    onClick={() => handleStarRating(selectedPokemon.firebaseId!, star)}
                                    onMouseEnter={() => setHoveredStar(star)}
                                    onMouseLeave={() => setHoveredStar(0)}
                                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Current rating display positioned to the right of stars */}
                          {selectedPokemon.firebaseId && getUserRating(selectedPokemon.firebaseId!) > 0 && (
                            <span className="absolute left-full ml-3 text-yellow-300/85 text-sm font-semibold whitespace-nowrap">
                              {getUserRating(selectedPokemon.firebaseId!)}★
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        {selectedPokemon.firebaseId && (
                          globalRankings[selectedPokemon.firebaseId] ? (
                            <>
                              <p className="text-yellow-300 text-sm font-semibold mt-1">
                                Global Rank: #{globalRankings[selectedPokemon.firebaseId]}
                              </p>
                              {pokemonRatings[selectedPokemon.firebaseId]?.averageRating && (
                                <p className="text-yellow-200 text-xs font-medium">
                                  Average: {pokemonRatings[selectedPokemon.firebaseId].averageRating.toFixed(1)}★
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-400 text-sm font-semibold mt-1">
                              Unranked - No votes yet
                            </p>
                          )
                        )}
                      </div>
                    </div>
                    
                    {/* Evolution Navigation */}
                    {selectedPokemon && selectedPokemon.hasArt && selectedPokemon.evolutionStage !== undefined && selectedPokemon.evolutionStage !== 4 && (() => {
                      const currentId = selectedPokemon.id;
                      const currentStage = selectedPokemon.evolutionStage;
                      const evolutionButtons: PokemonSlot[] = [];
                      const addedIds = new Set<number>(); // Track added Pokemon IDs to prevent duplicates
                      
                      // Helper function to get Pokemon by ID
                      const getPokemonById = (id: number) => 
                        pokemonSlots.find(p => p.id === id && p.hasArt && p.evolutionStage !== undefined);
                      
                      // Helper function to safely add Pokemon (prevents duplicates)
                      const safeAddPokemon = (pokemon: PokemonSlot | undefined) => {
                        if (pokemon && !addedIds.has(pokemon.id)) {
                          evolutionButtons.push(pokemon);
                          addedIds.add(pokemon.id);
                        }
                      };
                      
                      // NEW APPROACH: Find the complete evolution line by traversing in both directions
                      // Rule: Stop when we encounter a Pokemon that goes back to Stage 0 AND doesn't evolve (different evolution line)
                      
                      // First, find the start of the evolution line (Stage 0)
                      let evolutionStart = currentId;
                      
                      // Search backwards to find Stage 0 or the start of this evolution line
                      for (let checkId = currentId - 1; checkId >= 1; checkId--) {
                        const pokemon = getPokemonById(checkId);
                        if (!pokemon) continue;
                        
                        // Skip legendaries - they are not part of evolution lines
                        if (pokemon.evolutionStage === 4) {
                          continue;
                        }
                        
                        // If we find Stage 0, check if it's part of the same evolution line
                        if (pokemon.evolutionStage === 0) {
                          // If this Stage 0 Pokemon doesn't evolve (U0), it's a different evolution line
                          if (pokemon.unique === 'U0') {
                            break; // Stop here, don't include this Stage 0
                          }
                          // Otherwise, this Stage 0 is part of our evolution line
                          evolutionStart = checkId;
                          break;
                        }
                        
                        // If we find a lower stage, continue searching backwards
                        if (pokemon.evolutionStage !== undefined && currentStage !== undefined && 
                            pokemon.evolutionStage < currentStage) {
                          continue;
                        }
                        
                        // If we find the same stage (branching evolution), continue searching
                        if (pokemon.evolutionStage === currentStage) {
                          continue;
                        }
                        
                        // If we find a higher stage or reach the limit, stop
                        break;
                      }
                      
                      // Now traverse forward from the evolution start to collect all Pokemon in this line
                      for (let checkId = evolutionStart; checkId <= pokemonSlots.length; checkId++) {
                        const pokemon = getPokemonById(checkId);
                        if (!pokemon) continue;
                        
                        // Skip legendaries - they are not part of evolution lines
                        if (pokemon.evolutionStage === 4) {
                          continue;
                        }
                        
                        // Special case: If this is a Stage 0 Pokemon that doesn't evolve (U0), 
                        // only include it if it's the current Pokemon or we're at the start
                        if (pokemon.evolutionStage === 0 && pokemon.unique === 'U0' && checkId !== currentId && checkId !== evolutionStart) {
                          // This is a different non-evolving Stage 0, skip it
                          break;
                        }
                        
                        // Add this Pokemon to the evolution line
                        safeAddPokemon(pokemon);
                        
                        // If this is a Stage 0 that doesn't evolve, and it's not the current Pokemon, stop here
                        if (pokemon.evolutionStage === 0 && pokemon.unique === 'U0' && checkId !== currentId) {
                          break;
                        }
                        
                        // Check what's next
                        const nextPokemon = getPokemonById(checkId + 1);
                        if (!nextPokemon) break;
                        
                        // STOPPING RULE: If next Pokemon is a legendary, we've reached the end of this evolution line
                        if (nextPokemon.evolutionStage === 4) {
                          break;
                        }
                        
                        // STOPPING RULE: If next Pokemon is Stage 0 and doesn't evolve, we've reached a new evolution line
                        if (nextPokemon.evolutionStage === 0 && nextPokemon.unique === 'U0') {
                          break;
                        }
                        
                        // STOPPING RULE: If next Pokemon is Stage 0 and we already have Stage 0 in our line, new evolution line
                        if (nextPokemon.evolutionStage === 0 && evolutionButtons.some(btn => btn.evolutionStage === 0)) {
                          break;
                        }
                        
                        // Continue if:
                        // 1. Next stage is higher (normal evolution: 0->1, 1->2)
                        // 2. Next stage is same (branching evolution: 1->1, 2->2)
                        // 3. Next stage is special (MEGA=5, GMAX=3)
                        if ((nextPokemon.evolutionStage !== undefined && pokemon.evolutionStage !== undefined) &&
                            (nextPokemon.evolutionStage > pokemon.evolutionStage || 
                             nextPokemon.evolutionStage === pokemon.evolutionStage ||
                             nextPokemon.evolutionStage === 5 || 
                             nextPokemon.evolutionStage === 3)) {
                          continue;
                        }
                        
                        // If none of the above, we've reached the end of this evolution line
                        break;
                      }
                      
                      // Sort buttons by evolution stage, then by ID for proper order
                      evolutionButtons.sort((a, b) => {
                        if (a.evolutionStage !== b.evolutionStage) {
                          return (a.evolutionStage || 0) - (b.evolutionStage || 0);
                        }
                        return a.id - b.id; // Same stage, sort by ID
                      });
                      
                      if (evolutionButtons.length > 1) { // Show if there are other Pokemon besides current
                        // Group Pokemon by evolution stage for branching layout
                        const stageGroups: { [stage: number]: PokemonSlot[] } = {};
                        evolutionButtons.forEach(pokemon => {
                          const stage = pokemon.evolutionStage || 0;
                          if (!stageGroups[stage]) {
                            stageGroups[stage] = [];
                          }
                          stageGroups[stage].push(pokemon);
                        });
                        
                        // Sort stages in order
                        const sortedStages = Object.keys(stageGroups).map(Number).sort((a, b) => a - b);
                        
                        // Determine if we need compact layout (more than 3 stages)
                        // Dynamic layout based on screen size and number of stages
                        const isCompactLayout = sortedStages.length >= 3; // More aggressive: start compacting at 3+ stages
                        const isMobileCompact = sortedStages.length >= 3; // More aggressive on mobile
                        const isUltraCompact = sortedStages.length >= 4; // Ultra compact for 4+ stages
                        
                        return (
                          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                            <h4 className="text-white/80 text-sm font-semibold mb-3 text-center">Evolution Line</h4>
                            <div className={`flex items-center justify-center ${
                              isUltraCompact 
                                ? 'gap-0.5 flex-wrap' // Ultra tight spacing and allow wrapping
                                : isCompactLayout 
                                  ? 'gap-1' 
                                  : 'gap-4'
                            } ${
                              isMobileCompact ? 'md:gap-4' : ''
                            }`}>
                              {sortedStages.map((stage, stageIndex) => (
                                <div key={stage} className="flex items-center">
                                  {/* Evolution Stage Column */}
                                  <div className="flex flex-col gap-1">
                                    {stageGroups[stage].map((evolution) => (
                                      <button
                                        key={evolution.id}
                                        onClick={() => setSelectedPokemon(evolution)}
                                        disabled={evolution.id === selectedPokemon.id}
                                        className={`flex items-center transition-all duration-200 min-w-0 ${
                                          // Ultra compact sizing for 4+ stages
                                          isUltraCompact
                                            ? 'gap-1 px-1 py-1 text-xs'
                                            : isMobileCompact 
                                              ? 'gap-1 px-1 py-1 md:gap-2 md:px-3 md:py-2' 
                                              : isCompactLayout 
                                                ? 'gap-1 px-2 py-1' 
                                                : 'gap-2 px-3 py-2'
                                        } rounded-lg ${
                                          evolution.id === selectedPokemon.id
                                            ? 'bg-yellow-400/30 border border-yellow-400 cursor-default'
                                            : 'bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-[1.02] cursor-pointer'
                                        }`}
                                        title={`${evolution.name} - ${
                                          evolution.evolutionStage === 0 ? 'Base Form' :
                                          evolution.evolutionStage === 1 ? 'First Evolution' :
                                          evolution.evolutionStage === 2 ? 'Second Evolution' :
                                          evolution.evolutionStage === 3 ? 'GMAX Form' :
                                          evolution.evolutionStage === 4 ? 'Legendary Form' :
                                          evolution.evolutionStage === 5 ? 'MEGA Form' : 'Unknown Form'
                                        } ${evolution.id === selectedPokemon.id ? '(Current)' : ''}`}
                                      >
                                        <div className={`rounded-lg overflow-hidden border border-white/20 flex-shrink-0 ${
                                          // Ultra compact image sizing
                                          isUltraCompact
                                            ? 'w-5 h-5'
                                            : isMobileCompact 
                                              ? 'w-6 h-6 md:w-10 md:h-10' 
                                              : isCompactLayout 
                                                ? 'w-8 h-8' 
                                                : 'w-10 h-10'
                                        }`}>
                                          <img
                                            src={evolution.imageUrl}
                                            alt={evolution.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="text-left min-w-0 flex-1">
                                          <div className={`font-semibold ${
                                            // Ultra compact text sizing
                                            isUltraCompact
                                              ? 'text-xs'
                                              : isMobileCompact 
                                                ? 'text-xs md:text-xs' 
                                                : 'text-xs'
                                          } ${
                                            evolution.id === selectedPokemon.id ? 'text-yellow-300' : 'text-white'
                                          }`}>
                                            #{evolution.id.toString().padStart(3, '0')}
                                          </div>
                                          <div className={`font-medium truncate ${
                                            // Ultra compact text and width sizing
                                            isUltraCompact
                                              ? 'text-xs max-w-6' // Very narrow for ultra compact
                                              : isMobileCompact 
                                                ? 'text-xs max-w-8 md:text-xs md:max-w-16' 
                                                : isCompactLayout 
                                                  ? 'text-xs max-w-12' 
                                                  : 'text-xs max-w-16'
                                          } ${
                                            evolution.id === selectedPokemon.id ? 'text-yellow-200' : 'text-white/90'
                                          }`}>
                                            {evolution.name}
                                          </div>
                                          <div className={`inline-block rounded font-bold text-white mt-0.5 ${
                                            // Ultra compact badge sizing
                                            isUltraCompact
                                              ? 'text-xs px-0.5 py-0.5'
                                              : isMobileCompact 
                                                ? 'text-xs px-1 py-0.5 md:text-xs md:px-1.5 md:py-0.5' 
                                                : isCompactLayout 
                                                  ? 'text-xs px-1 py-0.5' 
                                                  : 'text-xs px-1.5 py-0.5'
                                          } ${
                                            evolution.evolutionStage === 0 ? 'bg-green-500' :
                                            evolution.evolutionStage === 1 ? 'bg-yellow-500' :
                                            evolution.evolutionStage === 2 ? 'bg-red-500' :
                                            evolution.evolutionStage === 3 ? 'bg-purple-500' :
                                            evolution.evolutionStage === 4 ? 'bg-orange-500' :
                                            evolution.evolutionStage === 5 ? 'bg-pink-500' : 'bg-gray-500'
                                          }`}>
                                            {/* Responsive stage labels */}
                                            {(isMobileCompact || isCompactLayout) ? (
                                              evolution.evolutionStage === 0 ? 'S0' :
                                              evolution.evolutionStage === 1 ? 'S1' :
                                              evolution.evolutionStage === 2 ? 'S2' :
                                              evolution.evolutionStage === 3 ? 'GM' :
                                              evolution.evolutionStage === 4 ? 'LG' :
                                              evolution.evolutionStage === 5 ? 'MG' : `S${evolution.evolutionStage}`
                                            ) : (
                                              evolution.evolutionStage === 0 ? 'Stage 0' :
                                              evolution.evolutionStage === 1 ? 'Stage 1' :
                                              evolution.evolutionStage === 2 ? 'Stage 2' :
                                              evolution.evolutionStage === 3 ? 'GMAX' :
                                              evolution.evolutionStage === 4 ? 'Legendary' :
                                              evolution.evolutionStage === 5 ? 'MEGA' : `Stage ${evolution.evolutionStage}`
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {/* Arrow between stages - responsive sizing */}
                                  {stageIndex < sortedStages.length - 1 && (
                                    <div className={`text-white/40 ${
                                      isMobileCompact 
                                        ? 'mx-0.5 text-sm md:mx-2 md:text-xl' 
                                        : isCompactLayout 
                                          ? 'mx-1 text-sm' 
                                          : 'mx-2 text-xl'
                                    }`}>
                                      →
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Actions Dropdown - Only show for Pokemon with artwork */}
                    {selectedPokemon.firebaseId && (
                      <div className="pt-2 border-t border-white/20">
                        {/* Dropdown Toggle Button */}
                        <button
                          onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                          className="w-full px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center justify-center"
                          title="Toggle Actions"
                        >
                          <span className={`transform transition-transform duration-300 text-sm ${
                            showActionsDropdown ? 'rotate-180' : 'rotate-0'
                          }`}>
                            ⏷
                          </span>
                        </button>
                        
                        {/* Dropdown Content with Smooth Animation */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          showActionsDropdown ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}>
                          <div className="pt-3">
                            <div className="flex gap-1">
                              {/* Edit Button (60% width) */}
                              <button
                                onClick={() => requireAdmin(handleEditPokemon)}
                                className="flex-[3] px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold transform hover:scale-[1.02]"
                              >
                                ✏️ Edit Pokemon
                              </button>
                              
                              {/* Delete Button (20% width, emoji only) */}
                              <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-center transform hover:scale-[1.02]"
                                title="Delete Pokemon"
                              >
                                🗑️
                              </button>
                            </div>
                            
                            {/* Stats Editor Toggle Button (Admin Only) */}
                            {isAdmin && (
                              <div className="mt-2">
                                <button
                                  onClick={() => requireAdmin(toggleStatsEditor)}
                                  className={`w-full px-4 py-2 text-white rounded-lg transition-colors font-semibold transform hover:scale-[1.02] ${
                                    isStatsEditorMode 
                                      ? 'bg-orange-500 hover:bg-orange-600' 
                                      : 'bg-purple-500 hover:bg-purple-600'
                                  }`}
                                >
                                  {isStatsEditorMode ? '❌ Exit Stats Editor' : 'Edit Stats & Abilities'}
                                </button>
                              </div>
                            )}
                            
                            {/* Delete Confirmation Dialog */}
                            {showDeleteConfirm && (
                              <div className="mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg animate-fade-in-up">
                                <p className="text-white text-center text-sm mb-3">
                                  Are you sure you want to delete <strong>{selectedPokemon.name}</strong>?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-sm"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleDeletePokemon}
                                    disabled={deletingPokemon}
                                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm disabled:bg-red-400 disabled:cursor-not-allowed"
                                  >
                                    {deletingPokemon ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <span className="text-white/40 text-4xl">?</span>
                    </div>
                    <h3 className="text-white/60 text-lg font-semibold mb-2">No Pokemon Selected</h3>
                    <p className="text-white/40 text-sm">Click on a Pokemon from the list to view details</p>
                  </div>
                )}
              </div>
              
              {/* Mobile Pokemon List - appears between detail and add button */}
              <div className="md:hidden mt-4">
                {/* Mobile List Header */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    {sortedPokemon.length} Pokemon {hasActiveFilters ? '(Filtered)' : ''}
                  </h2>
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedTypes([]);
                        setSelectedArtists([]);
                        setUniqueOnly(false);
                        setEvolutionFilter('all');
                        setUserRatingFilter(null);
                        setRatingSortOrder('none');
                        setUserRatingSortOrder('none');
                        setShowFavoritesOnly(false);
                      }}
                      className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-200 text-xs font-medium transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Mobile Pokemon Grid */}
                <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
                  {sortedPokemon.map((pokemon) => (
                    <div key={pokemon.id} className={`flex items-center transition-all duration-300 ease-in-out ${showTiers ? 'gap-2' : 'gap-0'}`}>
                      {/* Pokemon List Item */}
                      <div
                        data-pokemon-id={pokemon.id}
                        onClick={() => {
                          setSelectedPokemon(pokemon);
                          setShowDeleteConfirm(false);
                          setShowEditForm(false);
                          setShowActionsDropdown(false);
                        }}
                        className={`flex items-center p-2 rounded-lg border transition-all duration-300 ease-in-out ${showTiers ? 'flex-1' : 'w-full'} ${
                          selectedPokemon?.id === pokemon.id
                            ? 'bg-yellow-400/20 border-yellow-400 scale-[1.02]'
                            : pokemon.hasArt 
                            ? (pokemon.evolutionStage === 4 
                              ? 'bg-orange-200/10 border-orange-300/20 hover:bg-orange-200/20 hover:border-orange-300/30' 
                              : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40')
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        } cursor-pointer`}
                      >
                        {/* Pokemon Number */}
                        <div className="flex-shrink-0 w-8 text-center">
                          <span className="text-white/80 font-bold text-xs">
                            #{pokemon.id.toString().padStart(3, '0')}
                          </span>
                        </div>
                        
                        {/* Pokemon Image */}
                        <div className="flex-shrink-0 w-10 h-10 ml-2 relative">
                          {pokemon.hasArt ? (
                            <img
                              src={pokemon.imageUrl}
                              alt={pokemon.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center">
                              <span className="text-white/40 text-lg">?</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Pokemon Info */}
                        <div className="flex-1 ml-3">
                          <h3 className="text-white font-semibold text-sm">
                            {pokemon.name}
                          </h3>
                          {pokemon.hasArt && (
                            <p className="text-white/60 text-xs">
                              by {pokemon.artist}
                            </p>
                          )}
                        </div>

                        {/* Favorites and Rating on Mobile */}
                        {pokemon.hasArt && pokemon.firebaseId && (
                          <div className="flex items-center gap-2 mr-2">
                            {/* Favorite Count */}
                            {getPokemonFavoriteCount(pokemon.firebaseId) > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-red-400 text-xs">❤</span>
                                <span className="text-white/60 text-xs">{getPokemonFavoriteCount(pokemon.firebaseId)}</span>
                              </div>
                            )}
                            
                            {/* Average Rating */}
                            {pokemonRatings[pokemon.firebaseId]?.averageRating > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-blue-400 text-xs">⭐</span>
                                <span className="text-white/60 text-xs">{pokemonRatings[pokemon.firebaseId].averageRating.toFixed(1)}</span>
                              </div>
                            )}
                            
                            {/* User Rating */}
                            {getUserRating(pokemon.firebaseId) > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-400 text-xs">★</span>
                                <span className="text-white/60 text-xs">{getUserRating(pokemon.firebaseId)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tier Image (Mobile) */}
                      {showTiers && pokemon.hasArt && pokemon.firebaseId && pokemonRatings[pokemon.firebaseId]?.averageRating && (
                        <div className="flex-shrink-0 w-8 h-8">
                          <img
                            src={getTierImagePath(getPokemonTier(pokemon.firebaseId))}
                            alt={`Tier ${getPokemonTier(pokemon.firebaseId)}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Pokemon Section */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 mt-2" style={{animationDelay: '0.6s'}}>
                <div className="flex flex-col space-y-3">
                  <div>
                    <h2 className="text-white font-bold text-lg">ADD NEW POKEMON</h2>
                    <p className="text-white/60 text-sm">Add a new Pokemon to your collection</p>
                  </div>
                  <button
                    onClick={() => requireAdmin(() => setShowAddForm(true))}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    <span className="text-xl">➕</span>
                    <span>Add Pokemon</span>
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
      
      {/* Mobile Filters Modal - Slide in from left */}
      {showMobileFilters && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-md z-50 md:hidden transition-opacity duration-300 ${
          mobileFiltersOpen ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className={`fixed left-0 top-0 h-full w-80 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-black/95 backdrop-blur-md border-r border-gray-300/20 overflow-y-auto transform transition-transform duration-300 ease-out ${
            mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-300/20">
              <h2 className="text-xl font-bold text-white">Filters & Search</h2>
              <button
                onClick={closeMobileFilters}
                className="text-white/60 hover:text-white text-2xl p-1 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Filter Content */}
            <div className="p-4 space-y-2">
              {/* Search Section */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl border border-gray-300/20 p-2">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-white text-sm font-medium">Search Pokemon</span>
                </div>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-gray-300/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm"
                />
              </div>

              {/* Quick Actions */}
              <div className="text-center">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedTypes([]);
                      setSelectedArtists([]);
                      setUniqueOnly(false);
                      setEvolutionFilter('all');
                      setUserRatingFilter(null);
                      setRatingSortOrder('none');
                      setUserRatingSortOrder('none');
                      setShowFavoritesOnly(false);
                    }}
                    className="px-3 py-1 bg-red-500/80 text-white rounded-lg hover:bg-red-600/80 transition-colors text-xs font-semibold"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={closeMobileFilters}
                    className="px-3 py-1 bg-green-500/80 text-white rounded-lg hover:bg-green-600/80 transition-colors text-xs font-semibold"
                  >
                    Apply & Close
                  </button>
                </div>
              </div>
              
              {/* Types Filter */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl border border-gray-300/20 p-2">
                <button
                  onClick={() => toggleSection('types')}
                  className="w-full flex items-center justify-between text-white text-sm font-medium mb-2 hover:text-white/80"
                >
                  <span>Filter by Types</span>
                  <span className="text-xs">{collapsedSections.types ? '+' : '−'}</span>
                </button>
                {!collapsedSections.types && (
                  <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                    {allTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedTypes(prev =>
                            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                          );
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          selectedTypes.includes(type)
                            ? `${getTypeColor(type)} text-white shadow-md`
                            : 'bg-black/30 text-white/70 hover:bg-black/50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                    {/* Unique filters */}
                    {['U0', 'U1', 'U2'].map((unique) => (
                      <button
                        key={unique}
                        onClick={() => {
                          setSelectedTypes(prev =>
                            prev.includes(unique) ? prev.filter(t => t !== unique) : [...prev, unique]
                          );
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          selectedTypes.includes(unique)
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-black/30 text-white/70 hover:bg-black/50'
                        }`}
                      >
                        {unique === 'U0' ? 'U0 (No Evo)' : unique === 'U1' ? 'U1 (1 Evo)' : 'U2 (2 Evos)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Artists Filter */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl border border-gray-300/20 p-2">
                <button
                  onClick={() => toggleSection('artists')}
                  className="w-full flex items-center justify-between text-white text-sm font-medium mb-2 hover:text-white/80"
                >
                  <span>Filter by Artists</span>
                  <span className="text-xs">{collapsedSections.artists ? '+' : '−'}</span>
                </button>
                {!collapsedSections.artists && (
                  <div className="space-y-1">
                    {['DAVE', 'JOAO', 'GUTO'].map((artist) => (
                      <button
                        key={artist}
                        onClick={() => {
                          setSelectedArtists(prev =>
                            prev.includes(artist) ? prev.filter(a => a !== artist) : [...prev, artist]
                          );
                        }}
                        className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
                          selectedArtists.includes(artist)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-black/30 text-white/70 hover:bg-black/50'
                        }`}
                      >
                        {artist}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Evolution Filter */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl border border-gray-300/20 p-2">
                <button
                  onClick={() => toggleSection('evolution')}
                  className="w-full flex items-center justify-between text-white text-sm font-medium mb-2 hover:text-white/80"
                >
                  <span>Evolution Stages</span>
                  <span className="text-xs">{collapsedSections.evolution ? '+' : '−'}</span>
                </button>
                {!collapsedSections.evolution && (
                  <div className="space-y-1">
                    {[
                      { value: 'all', label: 'All Pokemon' },
                      { value: 'stage0', label: 'Base Forms' },
                      { value: 'stage1', label: 'First Evolution' },
                      { value: 'stage2', label: 'Second Evolution' },
                      { value: 'gmax', label: 'GMAX' },
                      { value: 'mega', label: 'MEGA' },
                      { value: 'legendary', label: 'Legendary' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setEvolutionFilter(option.value as any)}
                        className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
                          evolutionFilter === option.value
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-black/30 text-white/70 hover:bg-black/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating & Sorting */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl border border-gray-300/20 p-2">
                <button
                  onClick={() => toggleSection('rating')}
                  className="w-full flex items-center justify-between text-white text-sm font-medium mb-2 hover:text-white/80"
                >
                  <span>Ratings & Sorting</span>
                  <span className="text-xs">{collapsedSections.rating ? '+' : '−'}</span>
                </button>
                {!collapsedSections.rating && (
                  <div className="space-y-2">
                    {/* Sorting Options */}
                    <div>
                      <p className="text-white/60 text-xs mb-1">Sort by Global Ranking:</p>
                      <div className="space-y-1">
                        {[
                          { value: 'none', label: 'No Sorting (Pokedex Order)' },
                          { value: 'ascending', label: 'Best to Worst (1st → Last)' },
                          { value: 'descending', label: 'Worst to Best (Last → 1st)' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setRatingSortOrder(option.value as any)}
                            className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                              ratingSortOrder === option.value
                                ? 'bg-yellow-600 text-white shadow-md'
                                : 'bg-black/30 text-white/70 hover:bg-black/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* User Rating Filter */}
                    <div>
                      <p className="text-white/60 text-xs mb-1">Show Only My {userRatingFilter || 'X'}/10 Ratings:</p>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setUserRatingFilter(userRatingFilter === rating ? null : rating)}
                            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                              userRatingFilter === rating
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'bg-black/30 text-white/70 hover:bg-black/50'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      {userRatingFilter && (
                        <button
                          onClick={() => setUserRatingFilter(null)}
                          className="w-full mt-1 px-2 py-1 bg-red-500/80 text-white rounded text-xs hover:bg-red-600/80"
                        >
                          Clear Rating Filter
                        </button>
                      )}
                    </div>

                    {/* Favorites Filter */}
                    <div>
                      <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
                          showFavoritesOnly
                            ? 'bg-pink-600 text-white shadow-md'
                            : 'bg-black/30 text-white/70 hover:bg-black/50'
                        }`}
                      >
                        {showFavoritesOnly ? 'Showing Only Favorites' : 'Show Favorites Only'}
                      </button>
                    </div>

                    {/* Tier Display Toggle */}
                    <div>
                      <button
                        onClick={() => setShowTiers(!showTiers)}
                        className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
                          showTiers
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white/20 text-white/70 hover:bg-white/30'
                        }`}
                      >
                        {showTiers ? 'Hide Tier Letters' : 'Show Tier Letters'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Stats (if available) */}
              {userRatingStats.totalRatings > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2">
                  <p className="text-white text-sm font-medium mb-2">Your Rating Stats</p>
                  <div className="text-xs text-white/70 space-y-1">
                    <p>Average Rating: <span className="text-white font-semibold">{userRatingStats.averageRating.toFixed(1)}/10</span></p>
                    <p>Total Ratings: <span className="text-white font-semibold">{userRatingStats.totalRatings}</span></p>
                  </div>
                  
                  {/* User Rating Sort Button for mobile */}
                  {userRatingStats.totalRatings > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setUserRatingSortOrder(userRatingSortOrder === 'none' ? 'best' : userRatingSortOrder === 'best' ? 'worst' : 'none')}
                        className={`w-full px-2 py-1 rounded text-xs transition-colors ${
                          userRatingSortOrder === 'none'
                            ? 'bg-white/10 hover:bg-white/20 text-white/70'
                            : userRatingSortOrder === 'best'
                            ? 'bg-green-500/60 text-white'
                            : 'bg-red-500/60 text-white'
                        }`}
                        title="Sort Pokemon by your personal ratings"
                      >
                        {userRatingSortOrder === 'none' ? 'Sort by My Ratings' : 
                         userRatingSortOrder === 'best' ? 'Best → Worst' : 
                         'Worst → Best'}
                      </button>
                    </div>
                  )}
                  
                  {/* Delete User Data Button for mobile */}
                  {(userRatingStats.totalRatings > 0 || userFavorites.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure? This will permanently delete all your ratings and favorites. This action cannot be undone.')) {
                            deleteUserData();
                            closeMobileFilters();
                          }
                        }}
                        className="w-full px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        title="Permanently delete all your ratings and favorites"
                      >
                        Delete My Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Click overlay to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={closeMobileFilters}
          />
        </div>
      )}
      
      {/* Footer */}
      <Footer />
      
      {/* Edit Pokemon Modal */}
      {showEditForm && selectedPokemon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Pokemon</h2>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Pokemon Name */}
              <div>
                <label className="block text-white font-semibold mb-2">Pokemon Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter Pokemon name"
                />
              </div>

              {/* Current Image Preview & New Image Upload */}
              <div onPaste={handleEditImagePaste} tabIndex={0} className="outline-none">
                <label className="block text-white font-semibold mb-2">
                  Pokemon Image <span className="text-xs text-white/60">(Upload or paste new image)</span>
                </label>
                
                {/* Current Image */}
                {selectedPokemon?.imageUrl && (
                  <div className="mb-3">
                    <p className="text-white/60 text-sm mb-2">Current Image:</p>
                    <div className="w-32 h-32 rounded-lg overflow-hidden border border-white/20">
                      <img
                        src={selectedPokemon.imageUrl}
                        alt={selectedPokemon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                {/* New Image Upload */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Upload New Image (optional):</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                  />
                  {editFormData.image && (
                    <p className="text-green-400 text-sm mt-2">
                      ✅ New image selected: {editFormData.image.name}
                    </p>
                  )}
                  <p className="text-white/40 text-xs mt-1">
                    You can paste an image here (Ctrl+V or Cmd+V) or click to browse files. Max size: 5MB.
                  </p>
                </div>
              </div>

              {/* Additional Images Upload (Edit Only) */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Additional Images <span className="text-xs text-white/60">(Up to 3 images)</span>
                </label>
                
                {/* Existing Additional Images */}
                {selectedPokemon.additionalImages && selectedPokemon.additionalImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-white/60 text-sm mb-2">Current Additional Images:</p>
                    <div className="flex gap-3 flex-wrap">
                      {selectedPokemon.additionalImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/20">
                            <img
                              src={imageUrl}
                              alt={`Additional ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteAdditionalImage(imageUrl)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                            title="Delete this image"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upload New Additional Images */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Add New Additional Images:</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAdditionalImagesChange}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                  />
                  {editFormData.additionalImages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-green-400 text-sm mb-2">
                        ✅ {editFormData.additionalImages.length} new image{editFormData.additionalImages.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {editFormData.additionalImages.map((file, index) => (
                          <div key={index} className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                            {file.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-white/40 text-xs mt-1">
                    Select up to 3 additional images. These will appear as clickable buttons in the detail view. Max size: 5MB each.
                  </p>
                </div>
              </div>

              {/* Artist Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">Artist *</label>
                <div className="flex gap-2">
                  {['DAVE', 'JOAO', 'GUTO'].map((artist) => (
                    <button
                      key={artist}
                      onClick={() => setEditFormData(prev => ({ ...prev, artist }))}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        editFormData.artist === artist
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              </div>

              {/* Types Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">Types * (Select 1-2)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {[
                    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
                    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
                    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
                  ].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleTypeToggle(type)}
                      disabled={!editFormData.types.includes(type) && editFormData.types.length >= 2}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        editFormData.types.includes(type)
                          ? 'bg-yellow-400 text-black'
                          : !editFormData.types.includes(type) && editFormData.types.length >= 2
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  Selected: {editFormData.types.join(', ') || 'None'}
                </p>
              </div>

              {/* Unique Evolution Status */}
              <div>
                <label className="block text-white font-semibold mb-2">Unique Evolution Status</label>
                <div className="flex gap-2">
                  {[
                    { value: '', label: 'Not Unique' },
                    { value: 'U0', label: 'No Evolution (U0)' },
                    { value: 'U1', label: 'One Evolution (U1)' },
                    { value: 'U2', label: 'Two Evolutions (U2)' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEditFormData(prev => ({ ...prev, unique: option.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        editFormData.unique === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evolution Stage */}
              <div>
                <label className="block text-white font-semibold mb-2">Evolution Stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 0, label: 'Base Form (Stage 0)' },
                    { value: 1, label: 'First Evolution (Stage 1)' },
                    { value: 2, label: 'Second Evolution (Stage 2)' },
                    { value: 3, label: 'GMAX' },
                    { value: 4, label: 'Legendary' },
                    { value: 5, label: 'MEGA' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEditFormData(prev => ({ ...prev, evolutionStage: option.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        editFormData.evolutionStage === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Text */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Info Text <span className="text-xs text-white/60">(Optional)</span>
                </label>
                <textarea
                  value={editFormData.info}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, info: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Enter optional info text..."
                  rows={3}
                />
              </div>

              {/* Artwork Date */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Artwork Date *
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formatDateForInput(editFormData.artworkDate)}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, artworkDate: new Date(e.target.value) }))}
                    className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setEditFormData(prev => ({ ...prev, artworkDate: new Date() }))}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    title="Set to today's date"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePokemon}
                  disabled={isUpdating || !editFormData.name || !editFormData.artist || editFormData.types.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Pokemon Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Pokemon</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Pokemon Name */}
              <div>
                <label className="block text-white font-semibold mb-2">Pokemon Name *</label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter Pokemon name"
                />
              </div>

              {/* Artist Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">Artist *</label>
                <div className="flex gap-2">
                  {['DAVE', 'JOAO', 'GUTO'].map((artist) => (
                    <button
                      key={artist}
                      onClick={() => setAddFormData(prev => ({ ...prev, artist }))}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        addFormData.artist === artist
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div onPaste={handleAddImagePaste} tabIndex={0} className="outline-none">
                <label className="block text-white font-semibold mb-2">
                  Pokemon Image * <span className="text-xs text-white/60">(Upload or paste)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
                {addFormData.image && (
                  <p className="text-green-400 text-sm mt-2">
                    ✅ {addFormData.image.name} selected
                  </p>
                )}
                <p className="text-white/40 text-xs mt-1">
                  You can paste an image here (Ctrl+V or Cmd+V) or click to browse files
                </p>
              </div>

              {/* Types Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">Types * (Select 1-2)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {[
                    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
                    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
                    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
                  ].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleAddTypeToggle(type)}
                      disabled={!addFormData.types.includes(type) && addFormData.types.length >= 2}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        addFormData.types.includes(type)
                          ? 'bg-yellow-400 text-black'
                          : !addFormData.types.includes(type) && addFormData.types.length >= 2
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  Selected: {addFormData.types.join(', ') || 'None'}
                </p>
              </div>

              {/* Unique Evolution Status */}
              <div>
                <label className="block text-white font-semibold mb-2">Unique Evolution Status</label>
                <div className="flex gap-2">
                  {[
                    { value: '', label: 'Not Unique' },
                    { value: 'U0', label: 'No Evolution (U0)' },
                    { value: 'U1', label: 'One Evolution (U1)' },
                    { value: 'U2', label: 'Two Evolutions (U2)' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAddFormData(prev => ({ ...prev, unique: option.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        addFormData.unique === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evolution Stage */}
              <div>
                <label className="block text-white font-semibold mb-2">Evolution Stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 0, label: 'Base Form (Stage 0)' },
                    { value: 1, label: 'First Evolution (Stage 1)' },
                    { value: 2, label: 'Second Evolution (Stage 2)' },
                    { value: 3, label: 'GMAX' },
                    { value: 4, label: 'Legendary' },
                    { value: 5, label: 'MEGA' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAddFormData(prev => ({ ...prev, evolutionStage: option.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        addFormData.evolutionStage === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Text */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Info Text <span className="text-xs text-white/60">(Optional)</span>
                </label>
                <textarea
                  value={addFormData.info}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, info: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Enter optional info text..."
                  rows={3}
                />
              </div>

              {/* Artwork Date */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Artwork Date *
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formatDateForInput(addFormData.artworkDate)}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, artworkDate: new Date(e.target.value) }))}
                    className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setAddFormData(prev => ({ ...prev, artworkDate: new Date() }))}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    title="Set to today's date"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPokemon}
                  disabled={isUploading || !addFormData.name || !addFormData.artist || addFormData.types.length === 0 || !addFormData.image}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Adding...' : 'Add Pokemon'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cache Management Modal */}
      {showCacheManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🗄️ Cache Management
              </h2>
              <button
                onClick={() => setShowCacheManagement(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-white/80 text-sm mb-4">
                Manage cached data to optimize performance and troubleshoot loading issues.
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    const stats = getCacheStats();
                    console.log('Cache Stats:', stats);
                    showNotification(`Cached: ${stats.pokemonCached ? '✅' : '❌'} Pokemon, ${stats.ratingsCached ? '✅' : '❌'} Ratings | Size: ${Math.round(stats.cacheSize/1024)}KB`, 'info');
                  }}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  title="Check cache status and size"
                >
                  View Cache Statistics
                </button>
                
                <button
                  onClick={() => {
                    clearAllCache();
                    showNotification('Cache cleared! Next load will fetch fresh data.', 'success');
                  }}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  title="Clear all cached data to force fresh fetch"
                >
                  Clear All Cache
                </button>
                
                <button
                  onClick={async () => {
                    setShowCacheManagement(false);
                    setLoading(true);
                    clearAllCache();
                    await loadPokemonData();
                    showNotification('Data refreshed from Firebase!', 'success');
                  }}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  title="Clear cache and refresh data immediately"
                >
                  Clear & Refresh Data
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/60 text-xs">
                  <strong>Tip:</strong> Use "Clear & Refresh" if you're experiencing loading issues or outdated data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
