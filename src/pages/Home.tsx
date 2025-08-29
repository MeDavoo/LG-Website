import { useState, useEffect, useRef } from 'react';
import { getAllPokemon, Pokemon, deletePokemonWithImage, updatePokemon, addPokemon, uploadPokemonImage, getNextPokedexNumber, saveRating, getAllRatings, getGlobalRankings } from '../services/pokemonService';
import Navbar from '../components/Navbar';

interface PokemonSlot {
  id: number;
  name: string;
  artist?: string;
  imageUrl?: string;
  types?: string[];
  type2?: string;
  hasArt: boolean;
  unique?: string; // U0, U1, U2 for unique Pokemon (0=no evolve, 1=evolves once, 2=evolves twice)
  evolutionStage?: number; // 0=base, 1=first evo, 2=second evo, 3=GMAX, 4=Legendary, 5=MEGA
  firebaseId?: string; // Firebase document ID for updates
}

const Home = () => {
  // Pokemon data from Firebase
  const [_pokemonData, setPokemonData] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create 151 Pokemon slots (like a Pokedex) from Firebase data
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
      const firebasePokemon = await getAllPokemon();
      setPokemonData(firebasePokemon);
      
      // Create 151 slots and populate with Firebase data
      const slots: PokemonSlot[] = [];
      for (let i = 1; i <= 151; i++) {
        const pokemonFromFirebase = firebasePokemon.find(p => p.pokedexNumber === i);
        
        if (pokemonFromFirebase) {
          slots.push({
            id: i,
            name: pokemonFromFirebase.name,
            artist: pokemonFromFirebase.artist,
            imageUrl: pokemonFromFirebase.imageUrl,
            types: pokemonFromFirebase.types,
            type2: pokemonFromFirebase.types?.[1],
            unique: pokemonFromFirebase.unique,
            evolutionStage: pokemonFromFirebase.evolutionStage,
            hasArt: true,
            firebaseId: pokemonFromFirebase.id
          });
        } else {
          slots.push({
            id: i,
            name: `Pokemon #${i.toString().padStart(3, '0')}`,
            hasArt: false
          });
        }
      }
      
      setPokemonSlots(slots);
      
      // Load user rating statistics
      await loadUserRatingStats();
      
      // If this is not the initial load, set fast animations immediately
      if (!isInitialLoad) {
        setAnimationSpeedMultiplier(0.01);
      }
    } catch (error) {
      console.error('Error loading Pokemon data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load and calculate user's rating statistics
  const loadUserRatingStats = async () => {
    try {
      const deviceId = getDeviceId();
      const allRatings = await getAllRatings();
      
      // Find all ratings made by this device
      const userRatings: number[] = [];
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
      
      Object.values(allRatings).forEach(pokemonRating => {
        const userRating = pokemonRating.ratings[deviceId];
        if (userRating) {
          userRatings.push(userRating);
          if (userRating >= 1 && userRating <= 10) {
            ratingDistribution[userRating as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10]++;
          }
        }
      });
      
      // Calculate average
      const averageRating = userRatings.length > 0 
        ? userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length 
        : 0;
      
      setUserRatingStats({
        averageRating,
        totalRatings: userRatings.length,
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

      const updates = {
        name: editFormData.name,
        artist: editFormData.artist,
        types: editFormData.types,
        evolutionStage: editFormData.evolutionStage,
        ...(editFormData.unique && { unique: editFormData.unique }),
        ...(imageUrl !== selectedPokemon.imageUrl && { imageUrl }), // Only update if image changed
        updatedAt: new Date()
      };

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
          imageUrl: imageUrl
        } : null);
        
        await loadPokemonData(); // Refresh the data
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

      // Get next Pokedex number
      const pokedexNumber = await getNextPokedexNumber();

      // Add Pokemon to database
      const pokemonData = {
        pokedexNumber,
        name: addFormData.name,
        artist: addFormData.artist,
        types: addFormData.types,
        imageUrl,
        evolutionStage: addFormData.evolutionStage,
        ...(addFormData.unique && { unique: addFormData.unique })
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
        image: null
      });
      
      await loadPokemonData(); // Refresh the data
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
  });
  const [addFormData, setAddFormData] = useState({
    name: '',
    artist: '',
    types: [] as string[],
    unique: '',
    evolutionStage: 0,
    image: null as File | null
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Position Editor state
  const [isPositionEditorMode, setIsPositionEditorMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPokemon, setDraggedPokemon] = useState<PokemonSlot | null>(null);
  const [positionFeedback, setPositionFeedback] = useState<string>('');
  const [showPositionFeedback, setShowPositionFeedback] = useState(false);
  
  // Notification system
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // 3D Image Animation state
  const [imageTransform, setImageTransform] = useState({ rotateX: 0, rotateY: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

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

  // Function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000); // Hide after 5 seconds (increased from 4)
  };

  // 3D Image Animation functions
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
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
        
        // Calculate total points using the starsToPoints function
        const starsToPoints = (stars: number): number => {
          const pointMap: { [key: number]: number } = {
            1: 10, 2: 15, 3: 21, 4: 28, 5: 36, 6: 45, 7: 55, 8: 66, 9: 78, 10: 91
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
  }, []);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [evolutionFilter, setEvolutionFilter] = useState<'all' | 'stage0' | 'stage1' | 'stage2' | 'gmax' | 'legendary' | 'mega' | 'evolved'>('all'); // Evolution filtering including new types

  // User rating statistics
  const [userRatingStats, setUserRatingStats] = useState<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { [star: number]: number };
  }>({
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
  });

  // Get unique artists from the data
  // const allArtists = Array.from(new Set(pokemonSlots.filter(p => p.hasArt && p.artist).map(p => p.artist!)));
  
  // Get all types from the data
  const allTypes = Array.from(new Set(pokemonSlots.filter(p => p.hasArt && p.types).flatMap(p => p.types!)));

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedTypes.length > 0 || selectedArtists.length > 0 || uniqueOnly || evolutionFilter !== 'all';

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
    
    return true;
  });

  // Navigation functions
  const navigatePrevious = () => {
    if (!selectedPokemon) return;
    
    const currentIndex = filteredPokemon.findIndex(p => p.id === selectedPokemon.id);
    if (currentIndex > 0) {
      setSelectedPokemon(filteredPokemon[currentIndex - 1]);
    }
  };

  const navigateNext = () => {
    if (!selectedPokemon) return;
    
    const currentIndex = filteredPokemon.findIndex(p => p.id === selectedPokemon.id);
    if (currentIndex < filteredPokemon.length - 1) {
      setSelectedPokemon(filteredPokemon[currentIndex + 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePrevious();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPokemon, filteredPokemon]);

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
          {/* Main Layout: Filters | Pokemon List | Detail Panel */}
          <div className="grid grid-cols-12 gap-4" style={{height: 'calc(100vh - 80px)'}}>
            
            {/* Left Panel - Filters */}
            <div className="col-span-2 space-y-2 h-full custom-scrollbar animate-slide-in-left">
              <div className="overflow-y-auto space-y-2" style={{maxHeight: 'calc(100vh - 80px)'}}>
              
              {/* Filters Title */}
              <div className="text-center mt-2 animate-filter-item" style={{animationDelay: '0.3s'}}>
                <h2 className="text-white font-bold text-base mb-2">FILTERS</h2>
              </div>
              
              {/* Types */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.4s'}}>
                <h3 className="text-white font-semibold mb-1 text-sm">Types</h3>
                <div className="grid grid-cols-2 gap-1">
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
              </div>
              
              {/* Artists & Uniques - Combined */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.5s'}}>
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
              </div>
              
              {/* Evolution Stages */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.7s'}}>
                <h3 className="text-white font-semibold mb-1">Evolution</h3>
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
                      setSelectedPokemon(null);
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
                  <div className="text-white/50 text-xs">
                    ({userRatingStats.totalRatings} {userRatingStats.totalRatings === 1 ? 'vote' : 'votes'})
                  </div>
                </div>
                
                {/* Rating Distribution */}
                <div className="space-y-1">
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(star => (
                    <div key={star} className="flex items-center justify-between text-xs">
                      <div className="flex items-center">
                        <span className="text-yellow-300 w-4 text-center font-bold">{star}</span>
                        <svg
                          className="w-3 h-3 text-yellow-300 ml-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <div className="text-white/70 font-semibold">
                        {userRatingStats.ratingDistribution[star as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10]}
                      </div>
                    </div>
                  ))}
                </div>
                
                {userRatingStats.totalRatings === 0 && (
                  <div className="text-center text-white/50 text-xs mt-2">
                    No ratings yet. Start rating each Pokemon!
                  </div>
                )}
              </div>
              </div>
            </div>
            
            {/* Middle Panel - Search + Pokemon List */}
            <div className="col-span-6 h-full flex flex-col animate-slide-in-top">
              
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
                      <span className="text-yellow-300 font-bold">{filteredPokemon.filter(p => p.hasArt).length}</span> / 151 Pokemon Found
                      {hasActiveFilters && (
                        <span className="ml-2 text-blue-300">
                          ({filteredPokemon.length} filtered)
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
              
              {/* Pokemon List */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-2 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(100vh - 170px)'}}>
                <div className="space-y-2">
                  {filteredPokemon.map((pokemon, index) => (
                    <div
                      key={pokemon.id}
                      draggable={isPositionEditorMode && pokemon.hasArt}
                      onDragStart={() => handleDragStart(pokemon)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(pokemon)}
                      onClick={() => {
                        if (!isPositionEditorMode) {
                          setSelectedPokemon(pokemon);
                          setShowDeleteConfirm(false); // Reset delete confirmation when selecting new Pokemon
                          setShowEditForm(false); // Reset edit form when selecting new Pokemon
                          setShowActionsDropdown(false); // Reset actions dropdown when selecting new Pokemon
                        }
                      }}
                      className={`flex items-center p-2 m-1 rounded-lg border transition-all duration-200 animate-fade-in-up ${
                        isPositionEditorMode 
                          ? pokemon.hasArt 
                            ? 'cursor-grab active:cursor-grabbing bg-blue-500/10 border-blue-400/50 hover:bg-blue-500/20 hover:border-blue-400' 
                            : 'cursor-not-allowed bg-gray-500/10 border-gray-400/20'
                          : `cursor-pointer ${
                              selectedPokemon?.id === pokemon.id
                                ? 'bg-yellow-400/20 border-yellow-400 scale-[1.02]'
                                : pokemon.hasArt 
                                ? 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40' 
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
                      <div className="flex-shrink-0 w-12 h-12 ml-2">
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
                          globalRankings[pokemon.firebaseId] ? (
                            <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded text-xs font-bold">
                              #{globalRankings[pokemon.firebaseId]}
                            </span>
                          ) : (
                            <span className="bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                              Unranked
                            </span>
                          )
                        )}
                        {pokemon.evolutionStage !== undefined && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${
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
                  ))}
                  
                  {filteredPokemon.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-white/60">No Pokemon match your current filters</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Panel - Pokemon Detail */}
            <div className="col-span-4 space-y-2 h-full custom-scrollbar animate-slide-in-right">
              <div className="overflow-y-auto" style={{maxHeight: 'calc(100vh - 80px)'}}>
              
              {/* Details Title */}
              <div className="text-center mt-2 animate-filter-item" style={{animationDelay: '0.4s'}}>
                <h2 className="text-white font-bold text-base mb-2">DETAILS</h2>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 animate-filter-item" style={{animationDelay: '0.5s'}}>
                {selectedPokemon && selectedPokemon.hasArt ? (
                  <div className="space-y-2">
                    {/* Large Image with 3D Effect and Navigation */}
                    <div className="w-full mx-auto perspective-1000 flex items-center justify-center relative">
                      {/* Previous Arrow */}
                      <button
                        onClick={navigatePrevious}
                        disabled={!selectedPokemon || filteredPokemon.findIndex(p => p.id === selectedPokemon.id) === 0}
                        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 disabled:bg-gray-500/20 disabled:cursor-not-allowed backdrop-blur-md rounded-full p-3 transition-all duration-200 group"
                        title="Previous Pokemon (Left Arrow)"
                      >
                        <svg className="w-6 h-6 text-white group-disabled:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Main Image Container */}
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
                            src={selectedPokemon.imageUrl}
                            alt={selectedPokemon.name}
                            className="w-full h-auto object-contain max-h-[32rem]"
                          />
                        </div>
                      </div>

                      {/* Next Arrow */}
                      <button
                        onClick={navigateNext}
                        disabled={!selectedPokemon || filteredPokemon.findIndex(p => p.id === selectedPokemon.id) === filteredPokemon.length - 1}
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 disabled:bg-gray-500/20 disabled:cursor-not-allowed backdrop-blur-md rounded-full p-3 transition-all duration-200 group"
                        title="Next Pokemon (Right Arrow)"
                      >
                        <svg className="w-6 h-6 text-white group-disabled:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Pokemon Number */}
                    <div className="text-center">
                      <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                        #{selectedPokemon.id.toString().padStart(3, '0')}
                      </span>
                    </div>
                    
                    {/* Name and Types */}
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white mb-2">
                        {selectedPokemon.name}
                      </h2>
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
                    
                    {/* Artist */}
                    <p className="text-white/80 text-center text-sm">
                      Created by <span className="text-yellow-300 font-semibold">{selectedPokemon.artist}</span>
                    </p>
                    
                    {/* Star Rating System */}
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-center items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleStarRating(selectedPokemon.firebaseId!, star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="p-1 transition-all duration-200 transform hover:scale-110"
                            title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <svg
                              className={`w-6 h-6 transition-all duration-200 ${
                                star <= (hoveredStar || getUserRating(selectedPokemon.firebaseId!))
                                  ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]'
                                  : 'text-gray-400'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                      <div className="text-center">
                        {selectedPokemon.firebaseId && (
                          globalRankings[selectedPokemon.firebaseId] ? (
                            <p className="text-yellow-300 text-sm font-semibold mt-1">
                              Global Rank: #{globalRankings[selectedPokemon.firebaseId]}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm font-semibold mt-1">
                              Unranked - No votes yet
                            </p>
                          )
                        )}
                      </div>
                    </div>
                    
                    {/* Special Status and Evolution Stage - Horizontal Layout */}
                    <div className="grid"></div>
                    
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
                              {/* Edit Button (80% width) */}
                              <button
                                onClick={handleEditPokemon}
                                className="flex-[4] px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold transform hover:scale-[1.02]"
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
              
              {/* Add New Pokemon Section */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 mt-2" style={{animationDelay: '0.6s'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg">ADD NEW POKEMON</h2>
                    <p className="text-white/60 text-sm">Add a new Pokemon to your collection</p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center space-x-2"
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
    </>
  );
};

export default Home;
