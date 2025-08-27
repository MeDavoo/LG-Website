import { useState, useEffect, useRef } from 'react';
import { getAllPokemon, Pokemon, deletePokemonWithImage, updatePokemon, addPokemon, uploadPokemonImage, getNextPokedexNumber } from '../services/pokemonService';
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
  evolutionStage?: number; // 0, 1, 2 for evolution stages
  firebaseId?: string; // Firebase document ID for updates
}

const Home = () => {
  // Pokemon data from Firebase
  const [_pokemonData, setPokemonData] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create 151 Pokemon slots (like a Pokedex) from Firebase data
  const [pokemonSlots, setPokemonSlots] = useState<PokemonSlot[]>([]);

  // Load Pokemon data from Firebase
  useEffect(() => {
    loadPokemonData();
  }, []);

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
    } catch (error) {
      console.error('Error loading Pokemon data:', error);
    } finally {
      setLoading(false);
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

      console.log(`Swapping Pokemon positions: ${sourcePosition} ↔ ${targetPosition}`);

      // Show smooth feedback
      setSwapFeedback(`#${sourcePosition} ↔ #${targetPosition}`);
      setShowSwapFeedback(true);

      // Update positions in Firebase for both Pokemon (if they exist)
      const updatePromises = [];

      if (draggedPokemon.firebaseId && draggedPokemon.hasArt) {
        updatePromises.push(
          updatePokemon(draggedPokemon.firebaseId, { pokedexNumber: targetPosition })
        );
      }

      if (targetPokemon.firebaseId && targetPokemon.hasArt) {
        updatePromises.push(
          updatePokemon(targetPokemon.firebaseId, { pokedexNumber: sourcePosition })
        );
      }

      await Promise.all(updatePromises);

      // Reload data to reflect changes
      await loadPokemonData();
      
      // Hide feedback after a moment
      setTimeout(() => {
        setShowSwapFeedback(false);
      }, 2000);
    } catch (error) {
      console.error('Error swapping Pokemon positions:', error);
      setSwapFeedback('❌ Swap failed');
      setShowSwapFeedback(true);
      setTimeout(() => {
        setShowSwapFeedback(false);
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
  const [swapFeedback, setSwapFeedback] = useState<string>('');
  const [showSwapFeedback, setShowSwapFeedback] = useState(false);
  
  // Notification system
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // 3D Image Animation state
  const [imageTransform, setImageTransform] = useState({ rotateX: 0, rotateY: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

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
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [evolutionFilter, setEvolutionFilter] = useState<'all' | 'stage0' | 'stage1' | 'stage2' | 'evolved'>('all'); // More granular evolution filtering

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
        return false; // Show only stage 1 (middle forms)
      }
      if (evolutionFilter === 'stage2' && pokemon.evolutionStage !== 2) {
        return false; // Show only stage 2 (final forms)
      }
      if (evolutionFilter === 'evolved' && pokemon.evolutionStage === 0) {
        return false; // Hide stage 0 when showing evolved forms (stage 1 & 2)
      }
    } else if (evolutionFilter !== 'all' && pokemon.evolutionStage === undefined) {
      return false; // Hide Pokemon without evolution stage data when filtering
    }
    
    return true;
  });

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
              
              {/* Artists */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.5s'}}>
                <h3 className="text-white font-semibold mb-1">Artists</h3>
                <div className="grid grid-cols-2 gap-1">
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
                      className={`px-2 py-2 rounded text-xs font-semibold transition-all ${
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
              
              {/* Special */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 animate-filter-item" style={{animationDelay: '0.6s'}}>
                <h3 className="text-white font-semibold mb-1">Uniques</h3>
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
                    className={`w-full px-2 py-1 rounded text-sm font-semibold transition-all ${
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
                    className={`w-full px-2 py-1 rounded text-sm font-semibold transition-all ${
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
                    className={`w-full px-2 py-1 rounded text-sm font-semibold transition-all ${
                      selectedTypes.includes('U2')
                        ? 'bg-gray-500 text-white'
                        : 'bg-white/20 text-white/80 hover:bg-white/30'
                    }`}
                  >
                    Evolves Twice
                  </button>
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
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all col-span-2 ${
                      evolutionFilter === 'stage2'
                        ? 'bg-red-500 text-white'
                        : 'bg-white/20 text-white/80 hover:bg-white/30'
                    }`}
                  >
                    Stage 2
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

              {/* Swap Feedback Notification */}
              {showSwapFeedback && (
                <div className="fixed top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
                  {swapFeedback}
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
                        animationDelay: `${index * 0.05}s`
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
                        {pokemon.unique && (
                          <span className="bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                            {pokemon.unique}
                          </span>
                        )}
                        {pokemon.evolutionStage !== undefined && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${
                            pokemon.evolutionStage === 0 ? 'bg-green-500' :
                            pokemon.evolutionStage === 1 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            Stage {pokemon.evolutionStage}
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
                    {/* Large Image with 3D Effect */}
                    <div className="w-4/5 aspect-square perspective-1000 flex items-center justify-center mx-auto">
                      <div 
                        ref={imageRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        className="relative w-full h-full group cursor-pointer"
                        style={{ 
                          perspective: '1000px',
                        }}
                      >
                        {/* Circular Shadow Layer */}
                        <div 
                          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 w-3/4 h-6 bg-black/40 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-all duration-300"
                        ></div>
                        
                        {/* Main Image */}
                        <div
                          className="relative w-full h-full rounded-lg overflow-hidden transform-gpu transition-transform duration-300 ease-out group-hover:scale-105"
                          style={{
                            transform: `rotateX(${imageTransform.rotateX}deg) rotateY(${imageTransform.rotateY}deg)`,
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          <img
                            src={selectedPokemon.imageUrl}
                            alt={selectedPokemon.name}
                            className="w-full h-full object-cover"
                          />
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
                    
                    {/* Special Status and Evolution Stage - Horizontal Layout */}
                    <div className="grid"></div>
                    
                    {/* Edit and Delete Pokemon Buttons - Only show for Pokemon with artwork */}
                    {selectedPokemon.firebaseId && (
                      <div className="pt-2 border-t border-white/20">
                        <div className="flex gap-1">
                          {/* Edit Button (80% width) */}
                          <button
                            onClick={handleEditPokemon}
                            className="flex-[4] px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                          >
                            ✏️ Edit Pokemon
                          </button>
                          
                          {/* Delete Button (20% width, emoji only) */}
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-center"
                            title="Delete Pokemon"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        {/* Delete Confirmation Dialog */}
                        {showDeleteConfirm && (
                          <div className="mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
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
              <div>
                <label className="block text-white font-semibold mb-2">Pokemon Image</label>
                
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
                    Max size: 5MB. Supported formats: JPG, PNG, GIF, WebP
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
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'Base Form (Stage 0)' },
                    { value: 1, label: 'First Evolution (Stage 1)' },
                    { value: 2, label: 'Second Evolution (Stage 2)' }
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
              <div>
                <label className="block text-white font-semibold mb-2">Pokemon Image *</label>
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
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'Base Form (Stage 0)' },
                    { value: 1, label: 'First Evolution (Stage 1)' },
                    { value: 2, label: 'Second Evolution (Stage 2)' }
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
