import { useState, useEffect } from 'react';
import { getAllChallengeArt, addChallengeArt, uploadChallengeImage, updateChallengeArt, deleteChallengeArtWithImage, ChallengeArt } from '../services/challengeService';

interface ChallengeTab {
  id: string;
  name: string;
  description: string;
}

const CHALLENGE_TABS: ChallengeTab[] = [
  { id: 'alt-evo', name: 'ALT EVO', description: 'Evolve NON evolving pokemons' },
  { id: 'fusions', name: 'FUSIONS', description: 'Pokemon fusions (fusions of existing pokemon)' },
  { id: 'body-completion', name: 'BODY COMPLETION', description: 'We all take turns drawing body parts for the same pokemons' },
  { id: 'trainers', name: 'TRAINERS', description: 'Trainers / gym leaders' },
  { id: 'themes', name: 'THEMES', description: 'Themed pokemon' },
  { id: 'fill-shadow', name: 'FILL THE SHADOW', description: 'Complete the shadow' }
];

const Challenges = () => {
  const [activeTab, setActiveTab] = useState<string>('alt-evo');
  const [challengeArt, setChallengeArt] = useState<ChallengeArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArt, setSelectedArt] = useState<ChallengeArt | null>(null);

  // Add Challenge Art Modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    creator: '',
    challenge: 'alt-evo',
    types: [] as string[],
    image: null as File | null,
    // Fusion specific fields
    pokemon1Name: '',
    pokemon1ImageUrl: '',
    pokemon2Name: '',
    pokemon2ImageUrl: '',
    // Trainer specific fields
    trainerType: 'trainer' as 'trainer' | 'gym-leader',
    // Theme specific fields
    themeName: ''
  });

  // Edit/Delete functionality state
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    creator: '',
    challenge: 'alt-evo',
    types: [] as string[],
    image: null as File | null,
    // Fusion specific fields
    pokemon1Name: '',
    pokemon1ImageUrl: '',
    pokemon2Name: '',
    pokemon2ImageUrl: '',
    // Trainer specific fields
    trainerType: 'trainer' as 'trainer' | 'gym-leader',
    // Theme specific fields
    themeName: ''
  });

  // Notification system
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // Load challenge art data
  useEffect(() => {
    loadChallengeData();
  }, []);

  const loadChallengeData = async () => {
    try {
      setLoading(true);
      const data = await getAllChallengeArt();
      setChallengeArt(data);
      
      // Auto-select first art with artwork when data loads
      if (data.length > 0 && !selectedArt) {
        setSelectedArt(data[0]);
      }
    } catch (error) {
      console.error('Error loading challenge data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Handle challenge type change
  const handleChallengeTypeChange = (challengeType: string) => {
    setAddFormData(prev => ({
      ...prev,
      challenge: challengeType,
      // Reset challenge-specific fields
      pokemon1Name: '',
      pokemon1ImageUrl: '',
      pokemon2Name: '',
      pokemon2ImageUrl: '',
      trainerType: 'trainer',
      themeName: '',
      // For body-completion, clear creator
      creator: challengeType === 'body-completion' ? '' : prev.creator,
      // Reset types for trainers (will be handled differently)
      types: challengeType === 'trainers' ? [] : prev.types
    }));
  };

  // Handle adding new challenge art
  const handleAddChallengeArt = async () => {
    // Validation based on challenge type
    if (!addFormData.name || !addFormData.image) {
      showNotification('Please fill in all required fields and select an image', 'error');
      return;
    }

    // Challenge-specific validation
    if (addFormData.challenge !== 'body-completion' && !addFormData.creator) {
      showNotification('Please select a creator', 'error');
      return;
    }

    if (addFormData.challenge === 'fusions') {
      if (!addFormData.pokemon1Name || !addFormData.pokemon2Name) {
        showNotification('Please provide names for both Pokemon in the fusion', 'error');
        return;
      }
    }

    if (addFormData.challenge === 'themes') {
      if (!addFormData.themeName) {
        showNotification('Please provide theme name', 'error');
        return;
      }
    }

    // Trainer type validation
    if (addFormData.challenge === 'trainers') {
      if (addFormData.trainerType === 'trainer' && addFormData.types.length > 0) {
        showNotification('Regular trainers should not have specific types', 'error');
        return;
      }
      if (addFormData.trainerType === 'gym-leader' && addFormData.types.length !== 1) {
        showNotification('Gym leaders must have exactly one type selected', 'error');
        return;
      }
    } else {
      // For non-trainer and non-fusion challenges, require at least one type
      if (addFormData.challenge !== 'fusions' && addFormData.types.length === 0) {
        showNotification('Please select at least one Pokemon type', 'error');
        return;
      }
    }

    setIsUploading(true);
    try {
      // Upload image first
      const imageUrl = await uploadChallengeImage(addFormData.image, addFormData.name);
      if (!imageUrl) {
        showNotification('❌ Error uploading image. Please try again.', 'error');
        return;
      }

      // Add challenge art to database
      const challengeArtData: any = {
        name: addFormData.name,
        challenge: addFormData.challenge,
        types: addFormData.types,
        imageUrl
      };

      // Add creator if not body-completion
      if (addFormData.challenge !== 'body-completion') {
        challengeArtData.creator = addFormData.creator;
      }

      // Add challenge-specific fields
      if (addFormData.challenge === 'fusions') {
        challengeArtData.pokemon1Name = addFormData.pokemon1Name;
        challengeArtData.pokemon1ImageUrl = addFormData.pokemon1ImageUrl;
        challengeArtData.pokemon2Name = addFormData.pokemon2Name;
        challengeArtData.pokemon2ImageUrl = addFormData.pokemon2ImageUrl;
      }

      if (addFormData.challenge === 'trainers') {
        challengeArtData.trainerType = addFormData.trainerType;
      }

      if (addFormData.challenge === 'themes') {
        challengeArtData.themeName = addFormData.themeName;
      }

      const success = await addChallengeArt(challengeArtData);
      if (success) {
        showNotification(`✅ ${addFormData.name} has been added successfully!`, 'success');
        setShowAddForm(false);
        
        // Reset form
        setAddFormData({
          name: '',
          creator: '',
          challenge: 'alt-evo',
          types: [],
          image: null,
          pokemon1Name: '',
          pokemon1ImageUrl: '',
          pokemon2Name: '',
          pokemon2ImageUrl: '',
          trainerType: 'trainer',
          themeName: ''
        });
        
        await loadChallengeData(); // Refresh the data
      } else {
        showNotification('❌ Error adding challenge art. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error adding challenge art:', error);
      showNotification('❌ Error adding challenge art. Check console for details.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle type toggle for form
  const handleAddTypeToggle = (type: string) => {
    setAddFormData(prev => {
      if (prev.types.includes(type)) {
        return { ...prev, types: prev.types.filter(t => t !== type) };
      } else {
        // For gym leaders, only allow 1 type
        if (prev.challenge === 'trainers' && prev.trainerType === 'gym-leader') {
          if (prev.types.length < 1) {
            return { ...prev, types: [type] };
          } else {
            return prev; // Maximum 1 type for gym leaders
          }
        } else {
          // For other challenges, allow up to 2 types
          if (prev.types.length < 2) {
            return { ...prev, types: [...prev.types, type] };
          } else {
            return prev; // Maximum 2 types
          }
        }
      }
    });
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('File size too large. Please select an image under 5MB.', 'error');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
      }
      
      setAddFormData(prev => ({ ...prev, image: file }));
    }
  };

  // Handle paste for image upload
  const handleAddImagePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          setAddFormData(prev => ({ ...prev, image: file }));
          showNotification('✅ Image pasted successfully!', 'success');
        }
        break;
      }
    }
  };

  // Handle editing challenge art
  const handleEditChallengeArt = () => {
    if (!selectedArt) return;
    
    setEditFormData({
      name: selectedArt.name,
      creator: selectedArt.creator || '',
      challenge: selectedArt.challenge,
      types: [...selectedArt.types],
      image: null,
      pokemon1Name: selectedArt.pokemon1Name || '',
      pokemon1ImageUrl: selectedArt.pokemon1ImageUrl || '',
      pokemon2Name: selectedArt.pokemon2Name || '',
      pokemon2ImageUrl: selectedArt.pokemon2ImageUrl || '',
      trainerType: selectedArt.trainerType || 'trainer',
      themeName: selectedArt.themeName || ''
    });
    setShowEditForm(true);
    setShowActionsDropdown(false);
  };

  // Handle updating challenge art
  const handleUpdateChallengeArt = async () => {
    // Validation based on challenge type
    if (!selectedArt || !editFormData.name) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Challenge-specific validation
    if (editFormData.challenge !== 'body-completion' && !editFormData.creator) {
      showNotification('Please select a creator', 'error');
      return;
    }

    if (editFormData.challenge === 'fusions') {
      if (!editFormData.pokemon1Name || !editFormData.pokemon2Name) {
        showNotification('Please provide names for both Pokemon in the fusion', 'error');
        return;
      }
    }

    if (editFormData.challenge === 'themes') {
      if (!editFormData.themeName) {
        showNotification('Please provide theme name', 'error');
        return;
      }
    }

    // Trainer type validation
    if (editFormData.challenge === 'trainers') {
      if (editFormData.trainerType === 'trainer' && editFormData.types.length > 0) {
        showNotification('Regular trainers should not have specific types', 'error');
        return;
      }
      if (editFormData.trainerType === 'gym-leader' && editFormData.types.length !== 1) {
        showNotification('Gym leaders must have exactly one type selected', 'error');
        return;
      }
    } else {
      // For non-trainer and non-fusion challenges, require at least one type
      if (editFormData.challenge !== 'fusions' && editFormData.types.length === 0) {
        showNotification('Please select at least one Pokemon type', 'error');
        return;
      }
    }

    setIsUpdating(true);
    try {
      let imageUrl = selectedArt.imageUrl;

      // Upload new image if provided
      if (editFormData.image) {
        const newImageUrl = await uploadChallengeImage(editFormData.image, editFormData.name);
        if (!newImageUrl) {
          showNotification('❌ Error uploading image. Please try again.', 'error');
          return;
        }
        imageUrl = newImageUrl;
      }

      // Update challenge art in database
      const challengeArtData: any = {
        name: editFormData.name,
        challenge: editFormData.challenge,
        types: editFormData.types,
        imageUrl
      };

      // Add creator if not body-completion
      if (editFormData.challenge !== 'body-completion') {
        challengeArtData.creator = editFormData.creator;
      }

      // Add challenge-specific fields
      if (editFormData.challenge === 'fusions') {
        challengeArtData.pokemon1Name = editFormData.pokemon1Name;
        challengeArtData.pokemon1ImageUrl = editFormData.pokemon1ImageUrl;
        challengeArtData.pokemon2Name = editFormData.pokemon2Name;
        challengeArtData.pokemon2ImageUrl = editFormData.pokemon2ImageUrl;
      }

      if (editFormData.challenge === 'trainers') {
        challengeArtData.trainerType = editFormData.trainerType;
      }

      if (editFormData.challenge === 'themes') {
        challengeArtData.themeName = editFormData.themeName;
      }

      const success = await updateChallengeArt(selectedArt.id, challengeArtData);

      if (success) {
        showNotification(`✅ ${editFormData.name} has been updated successfully!`, 'success');
        setShowEditForm(false);
        await loadChallengeData(); // Refresh the data
      } else {
        showNotification('❌ Error updating challenge art. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error updating challenge art:', error);
      showNotification('❌ Error updating challenge art. Check console for details.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle deleting challenge art
  const handleDeleteChallengeArt = async () => {
    if (!selectedArt) return;

    setIsDeleting(true);
    try {
      const success = await deleteChallengeArtWithImage(selectedArt.id, selectedArt.imageUrl);
      if (success) {
        showNotification(`✅ ${selectedArt.name} has been deleted successfully!`, 'success');
        setShowDeleteConfirm(false);
        setShowActionsDropdown(false);
        setSelectedArt(null); // Clear selection
        await loadChallengeData(); // Refresh the data
      } else {
        showNotification('❌ Failed to delete challenge art. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting challenge art:', error);
      showNotification('❌ Error deleting challenge art. Check console for details.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle type toggle for edit form
  const handleEditTypeToggle = (type: string) => {
    setEditFormData(prev => {
      if (prev.types.includes(type)) {
        return { ...prev, types: prev.types.filter(t => t !== type) };
      } else {
        // For gym leaders, only allow 1 type
        if (prev.challenge === 'trainers' && prev.trainerType === 'gym-leader') {
          if (prev.types.length < 1) {
            return { ...prev, types: [type] };
          } else {
            return prev; // Maximum 1 type for gym leaders
          }
        } else {
          // For other challenges, allow up to 2 types
          if (prev.types.length < 2) {
            return { ...prev, types: [...prev.types, type] };
          } else {
            return prev; // Maximum 2 types
          }
        }
      }
    });
  };

  // Handle image selection for edit form
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('File size too large. Please select an image under 5MB.', 'error');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
      }
      
      setEditFormData(prev => ({ ...prev, image: file }));
    }
  };

  // Handle paste for edit image upload
  const handleEditImagePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          setEditFormData(prev => ({ ...prev, image: file }));
          showNotification('✅ Image pasted successfully!', 'success');
        }
        break;
      }
    }
  };

  // Filter art by active challenge
  const filteredArt = challengeArt.filter(art => art.challenge === activeTab);

  // Get type colors
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
      <div className="max-w-full mx-auto relative min-h-screen transform scale-90 origin-top mt-4">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-purple-500 hover:bg-purple-400 transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading Challenge Art...
            </div>
          </div>
        )}

      {!loading && (
        <>
          {/* Page Title */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Challenges</h1>
            <p className="text-white/70">Pokemon art created for special challenges</p>
          </div>

          {/* Challenge Tabs */}
          <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2">
            <div className="flex flex-wrap gap-2">
              {CHALLENGE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                  title={tab.description}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            
            {/* Active Tab Description */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-white/70 text-sm">
                {CHALLENGE_TABS.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>

          {/* Main Layout: Art List | Detail Panel */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* Left Panel - Art List */}
            <div className="col-span-6 space-y-2 custom-scrollbar animate-slide-in-left">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-white font-bold text-xl">
                    {CHALLENGE_TABS.find(tab => tab.id === activeTab)?.name} Collection
                  </h2>
                  <p className="text-white/60 text-sm">
                    ({filteredArt.length} {filteredArt.length === 1 ? 'artwork' : 'artworks'})
                  </p>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-4 overflow-y-auto custom-scrollbar" style={{maxHeight: '60vh'}}>
                {filteredArt.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🎨</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Art Yet</h3>
                    <p className="text-white/60">No artwork has been created for this challenge yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredArt.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArt(art)}
                        className={`group cursor-pointer bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 hover:bg-white/20 transition-all duration-300 ${
                          selectedArt?.id === art.id ? 'ring-2 ring-yellow-400 bg-white/20' : ''
                        }`}
                      >
                        {/* Smaller Art Image */}
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-white/5">
                          <img
                            src={art.imageUrl}
                            alt={art.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        
                        {/* Art Info */}
                        <div className="space-y-2">
                          <h3 className="text-white font-bold text-base group-hover:text-yellow-300 transition-colors">
                            {art.name}
                          </h3>
                          
                          {/* Types */}
                          <div className="flex flex-wrap gap-1">
                            {art.types.map((type: string) => (
                              <span
                                key={type}
                                className={`px-1 py-0.5 rounded text-xs font-semibold text-white ${getTypeColor(type)}`}
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                          
                          {/* Challenge-specific info */}
                          {art.challenge === 'trainers' && art.trainerType && (
                            <div className="text-white/80 text-xs font-medium">
                              {art.trainerType === 'gym-leader' ? 'Gym Leader' : 'Trainer'}
                            </div>
                          )}
                          
                          {art.challenge === 'themes' && art.themeName && (
                            <div className="text-white/80 text-xs font-medium">
                              Theme: {art.themeName}
                            </div>
                          )}
                          
                          {art.challenge === 'fusions' && (art.pokemon1Name || art.pokemon2Name) && (
                            <div className="text-white/80 text-xs font-medium">
                              {art.pokemon1Name && art.pokemon2Name 
                                ? `${art.pokemon1Name} + ${art.pokemon2Name}`
                                : art.pokemon1Name || art.pokemon2Name
                              }
                            </div>
                          )}
                          
                          {/* Creator - only show if exists */}
                          {art.creator && (
                            <div className="flex items-center text-white/70 text-xs">
                              <span className="font-semibold">By:</span>
                              <span className="ml-1 text-yellow-300">{art.creator}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Art Button */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center space-x-2 mx-auto"
                >
                  <span>Add New Art</span>
                </button>
              </div>
            </div>
            
            {/* Right Panel - Art Detail */}
            <div className="col-span-6 space-y-2 custom-scrollbar animate-slide-in-right">
              <div className="text-center mb-4">
                <h2 className="text-white font-bold text-xl">Art Details</h2>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
                {selectedArt ? (
                  <div className="space-y-4">
                    {/* Art Image */}
                    <div className="w-full rounded-lg overflow-hidden bg-white/5" style={{aspectRatio: '1/1', maxHeight: '500px'}}>
                      <img
                        src={selectedArt.imageUrl}
                        alt={selectedArt.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Art Information */}
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{selectedArt.name}</h2>
                        <p className="text-white/70 text-sm">
                          Challenge: {CHALLENGE_TABS.find(tab => tab.id === selectedArt.challenge)?.name}
                        </p>
                      </div>
                      
                      {/* Types */}
                      <div>
                        <h3 className="text-white font-semibold mb-2">Types</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedArt.types.map((type: string) => (
                            <span
                              key={type}
                              className={`px-3 py-1 rounded-lg text-sm font-semibold text-white ${getTypeColor(type)}`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Creator - Only show if exists (not for body-completion) */}
                      {selectedArt.creator && (
                        <div>
                          <h3 className="text-white font-semibold mb-2">Creator</h3>
                          <div className="bg-white/10 rounded-lg p-3">
                            <span className="text-yellow-300 font-bold text-lg">{selectedArt.creator}</span>
                          </div>
                        </div>
                      )}

                      {/* Challenge-specific information */}
                      {selectedArt.challenge === 'fusions' && (selectedArt.pokemon1Name || selectedArt.pokemon2Name) && (
                        <div>
                          <h3 className="text-white font-semibold mb-2">Fusion Details</h3>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-center">
                              {/* Pokemon 1 */}
                              <div className="space-y-2">
                                {selectedArt.pokemon1ImageUrl && (
                                  <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-white/10">
                                    <img 
                                      src={selectedArt.pokemon1ImageUrl} 
                                      alt={selectedArt.pokemon1Name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="text-white text-sm font-medium">
                                  {selectedArt.pokemon1Name || 'Pokemon 1'}
                                </div>
                              </div>

                              {/* Fusion Arrow */}
                              <div className="text-center">
                                <div className="text-yellow-400 text-xl font-bold">→</div>
                                <div className="text-white/60 text-xs">FUSION</div>
                                <div className="text-yellow-400 text-xl font-bold">←</div>
                              </div>

                              {/* Pokemon 2 */}
                              <div className="space-y-2">
                                {selectedArt.pokemon2ImageUrl && (
                                  <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-white/10">
                                    <img 
                                      src={selectedArt.pokemon2ImageUrl} 
                                      alt={selectedArt.pokemon2Name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="text-white text-sm font-medium">
                                  {selectedArt.pokemon2Name || 'Pokemon 2'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Trainer Type */}
                      {selectedArt.challenge === 'trainers' && selectedArt.trainerType && (
                        <div>
                          <h3 className="text-white font-semibold mb-2">Trainer Type</h3>
                          <div className="bg-white/10 rounded-lg p-3">
                            <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                              selectedArt.trainerType === 'gym-leader' 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-blue-500 text-white'
                            }`}>
                              {selectedArt.trainerType === 'gym-leader' ? 'Gym Leader' : 'Trainer'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Theme Details */}
                      {selectedArt.challenge === 'themes' && selectedArt.themeName && (
                        <div>
                          <h3 className="text-white font-semibold mb-2">Theme Details</h3>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-2">
                            <div>
                              <span className="text-white/70 text-sm">Pokemon:</span>
                              <span className="text-yellow-300 font-medium ml-2">{selectedArt.name}</span>
                            </div>
                            <div>
                              <span className="text-white/70 text-sm">Theme:</span>
                              <span className="text-blue-300 font-medium ml-2">{selectedArt.themeName}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Creation Date */}
                      <div>
                        <h3 className="text-white font-semibold mb-2">Created</h3>
                        <p className="text-white/70">
                          {selectedArt.createdAt.toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions Dropdown - Only show for challenge art */}
                      {selectedArt.id && (
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
                                  onClick={handleEditChallengeArt}
                                  className="flex-[4] px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold transform hover:scale-[1.02]"
                                >
                                  ✏️ Edit Art
                                </button>
                                
                                {/* Delete Button (20% width, emoji only) */}
                                <button
                                  onClick={() => setShowDeleteConfirm(true)}
                                  className="flex-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-center transform hover:scale-[1.02]"
                                  title="Delete Art"
                                >
                                  🗑️
                                </button>
                              </div>
                              
                              {/* Delete Confirmation Dialog */}
                              {showDeleteConfirm && (
                                <div className="mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg animate-fade-in-up">
                                  <p className="text-white text-center text-sm mb-3">
                                    Are you sure you want to delete <strong>{selectedArt.name}</strong>?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setShowDeleteConfirm(false)}
                                      className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-sm"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleDeleteChallengeArt}
                                      disabled={isDeleting}
                                      className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm disabled:bg-red-400 disabled:cursor-not-allowed"
                                    >
                                      {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🖼️</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Select an Artwork</h3>
                    <p className="text-white/60">Click on any artwork to view its details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-[70] p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {notification.message}
        </div>
      )}
      </div>

      {/* Add Challenge Art Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Challenge Art</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Art Name */}
              <div>
                <label className="block text-white font-semibold mb-2">Art Name *</label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter artwork name"
                />
              </div>

              {/* Challenge Type Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">Challenge Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHALLENGE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleChallengeTypeChange(tab.id)}
                      className={`px-3 py-2 rounded-lg font-semibold transition-all text-sm ${
                        addFormData.challenge === tab.id
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                      title={tab.description}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator Selection - Hidden for body-completion */}
              {addFormData.challenge !== 'body-completion' && (
                <div>
                  <label className="block text-white font-semibold mb-2">Creator *</label>
                  <div className="flex gap-2">
                    {['DAVE', 'JOAO', 'GUTO'].map((creator) => (
                      <button
                        key={creator}
                        onClick={() => setAddFormData(prev => ({ ...prev, creator }))}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          addFormData.creator === creator
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/20 text-white/80 hover:bg-white/30'
                        }`}
                      >
                        {creator}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenge-specific fields */}
              {addFormData.challenge === 'fusions' && (
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-white font-semibold mb-3">Fusion Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Pokemon 1 */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Pokemon 1 Name *</label>
                        <input
                          type="text"
                          value={addFormData.pokemon1Name}
                          onChange={(e) => setAddFormData(prev => ({ ...prev, pokemon1Name: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="First Pokemon"
                        />
                      </div>

                      {/* Fusion Arrow */}
                      <div className="text-center">
                        <div className="text-yellow-400 text-2xl font-bold">→</div>
                        <div className="text-white/60 text-sm">FUSION</div>
                        <div className="text-yellow-400 text-2xl font-bold">←</div>
                      </div>

                      {/* Pokemon 2 */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Pokemon 2 Name *</label>
                        <input
                          type="text"
                          value={addFormData.pokemon2Name}
                          onChange={(e) => setAddFormData(prev => ({ ...prev, pokemon2Name: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="Second Pokemon"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trainer Type - Only for trainers challenge */}
              {addFormData.challenge === 'trainers' && (
                <div>
                  <label className="block text-white font-semibold mb-2">Type *</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'trainer', label: 'Trainer' },
                      { value: 'gym-leader', label: 'Gym Leader' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAddFormData(prev => ({ ...prev, trainerType: option.value as 'trainer' | 'gym-leader' }))}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          addFormData.trainerType === option.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/20 text-white/80 hover:bg-white/30'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Theme Fields - Only for themes challenge */}
              {addFormData.challenge === 'themes' && (
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-white font-semibold mb-3">Theme Details</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Theme Name */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Theme Name *</label>
                        <input
                          type="text"
                          value={addFormData.themeName}
                          onChange={(e) => setAddFormData(prev => ({ ...prev, themeName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="e.g., Halloween, Christmas, Cyberpunk"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div onPaste={handleAddImagePaste} tabIndex={0} className="outline-none">
                <label className="block text-white font-semibold mb-2">
                  Challenge Art Image * <span className="text-xs text-white/60">(Upload or paste)</span>
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

              {/* Types Selection - Show for most challenges except trainers and fusions (unless gym leader) */}
              {((addFormData.challenge !== 'trainers' && addFormData.challenge !== 'fusions') || (addFormData.challenge === 'trainers' && addFormData.trainerType === 'gym-leader')) && (
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Pokemon Types * 
                    {addFormData.challenge === 'trainers' && addFormData.trainerType === 'gym-leader' 
                      ? ' (Select gym type - 1 only)' 
                      : ' (Select 1-2)'
                    }
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {[
                      'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
                      'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
                      'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleAddTypeToggle(type)}
                        disabled={
                          !addFormData.types.includes(type) && 
                          ((addFormData.challenge === 'trainers' && addFormData.trainerType === 'gym-leader' && addFormData.types.length >= 1) ||
                           (addFormData.challenge !== 'trainers' && addFormData.types.length >= 2))
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          addFormData.types.includes(type)
                            ? 'bg-yellow-400 text-black'
                            : !addFormData.types.includes(type) && 
                              ((addFormData.challenge === 'trainers' && addFormData.trainerType === 'gym-leader' && addFormData.types.length >= 1) ||
                               (addFormData.challenge !== 'trainers' && addFormData.types.length >= 2))
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
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChallengeArt}
                  disabled={
                    isUploading || 
                    !addFormData.name || 
                    !addFormData.image ||
                    (addFormData.challenge !== 'body-completion' && !addFormData.creator) ||
                    (addFormData.challenge === 'fusions' && (!addFormData.pokemon1Name || !addFormData.pokemon2Name)) ||
                    (addFormData.challenge === 'themes' && !addFormData.themeName) ||
                    (addFormData.challenge === 'trainers' && addFormData.trainerType === 'trainer' && addFormData.types.length > 0) ||
                    (addFormData.challenge === 'trainers' && addFormData.trainerType === 'gym-leader' && addFormData.types.length !== 1) ||
                    (addFormData.challenge !== 'trainers' && addFormData.challenge !== 'fusions' && addFormData.types.length === 0)
                  }
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Adding...' : 'Add Challenge Art'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Challenge Art Modal */}
      {showEditForm && selectedArt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Challenge Art</h2>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Art Name */}
              <div>
                <label className="block text-white font-semibold mb-2">Art Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter artwork name"
                />
              </div>

              {/* Challenge Type Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">Challenge Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHALLENGE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setEditFormData(prev => ({ 
                        ...prev, 
                        challenge: tab.id,
                        // Reset challenge-specific fields when changing type
                        pokemon1Name: '',
                        pokemon1ImageUrl: '',
                        pokemon2Name: '',
                        pokemon2ImageUrl: '',
                        trainerType: 'trainer',
                        creator: tab.id === 'body-completion' ? '' : prev.creator
                      }))}
                      className={`px-3 py-2 rounded-lg font-semibold transition-all text-sm ${
                        editFormData.challenge === tab.id
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                      title={tab.description}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator Selection - Hidden for body-completion */}
              {editFormData.challenge !== 'body-completion' && (
                <div>
                  <label className="block text-white font-semibold mb-2">Creator *</label>
                  <div className="flex gap-2">
                    {['DAVE', 'JOAO', 'GUTO'].map((creator) => (
                      <button
                        key={creator}
                        onClick={() => setEditFormData(prev => ({ ...prev, creator }))}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          editFormData.creator === creator
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/20 text-white/80 hover:bg-white/30'
                        }`}
                      >
                        {creator}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenge-specific fields */}
              {editFormData.challenge === 'fusions' && (
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-white font-semibold mb-3">Fusion Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Pokemon 1 */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Pokemon 1 Name *</label>
                        <input
                          type="text"
                          value={editFormData.pokemon1Name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, pokemon1Name: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="First Pokemon"
                        />
                      </div>

                      {/* Fusion Arrow */}
                      <div className="text-center">
                        <div className="text-yellow-400 text-2xl font-bold">→</div>
                        <div className="text-white/60 text-sm">FUSION</div>
                        <div className="text-yellow-400 text-2xl font-bold">←</div>
                      </div>

                      {/* Pokemon 2 */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Pokemon 2 Name *</label>
                        <input
                          type="text"
                          value={editFormData.pokemon2Name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, pokemon2Name: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="Second Pokemon"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trainer Type - Only for trainers challenge */}
              {editFormData.challenge === 'trainers' && (
                <div>
                  <label className="block text-white font-semibold mb-2">Type *</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'trainer', label: 'Trainer' },
                      { value: 'gym-leader', label: 'Gym Leader' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setEditFormData(prev => ({ ...prev, trainerType: option.value as 'trainer' | 'gym-leader' }))}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          editFormData.trainerType === option.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/20 text-white/80 hover:bg-white/30'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Theme Fields - Only for themes challenge */}
              {editFormData.challenge === 'themes' && (
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-white font-semibold mb-3">Theme Details</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Theme Name */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Theme Name *</label>
                        <input
                          type="text"
                          value={editFormData.themeName}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, themeName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="e.g., Halloween, Christmas, Cyberpunk"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div onPaste={handleEditImagePaste} tabIndex={0} className="outline-none">
                <label className="block text-white font-semibold mb-2">
                  Challenge Art Image <span className="text-xs text-white/60">(Upload or paste to replace current image)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
                {editFormData.image && (
                  <p className="text-green-400 text-sm mt-2">
                    ✅ {editFormData.image.name} selected (will replace current image)
                  </p>
                )}
                {!editFormData.image && (
                  <p className="text-white/60 text-xs mt-1">
                    Leave empty to keep current image, or select a new image to replace it
                  </p>
                )}
              </div>

              {/* Types Selection - Show for most challenges except trainers and fusions (unless gym leader) */}
              {((editFormData.challenge !== 'trainers' && editFormData.challenge !== 'fusions') || (editFormData.challenge === 'trainers' && editFormData.trainerType === 'gym-leader')) && (
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Pokemon Types * 
                    {editFormData.challenge === 'trainers' && editFormData.trainerType === 'gym-leader' 
                      ? ' (Select gym type - 1 only)' 
                      : ' (Select 1-2)'
                    }
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {[
                      'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
                      'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
                      'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleEditTypeToggle(type)}
                        disabled={
                          !editFormData.types.includes(type) && 
                          ((editFormData.challenge === 'trainers' && editFormData.trainerType === 'gym-leader' && editFormData.types.length >= 1) ||
                           (editFormData.challenge !== 'trainers' && editFormData.types.length >= 2))
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editFormData.types.includes(type)
                            ? 'bg-yellow-400 text-black'
                            : !editFormData.types.includes(type) && 
                              ((editFormData.challenge === 'trainers' && editFormData.trainerType === 'gym-leader' && editFormData.types.length >= 1) ||
                               (editFormData.challenge !== 'trainers' && editFormData.types.length >= 2))
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
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateChallengeArt}
                  disabled={
                    isUpdating || 
                    !editFormData.name ||
                    (editFormData.challenge !== 'body-completion' && !editFormData.creator) ||
                    (editFormData.challenge === 'fusions' && (!editFormData.pokemon1Name || !editFormData.pokemon2Name)) ||
                    (editFormData.challenge === 'themes' && !editFormData.themeName) ||
                    (editFormData.challenge === 'trainers' && editFormData.trainerType === 'trainer' && editFormData.types.length > 0) ||
                    (editFormData.challenge === 'trainers' && editFormData.trainerType === 'gym-leader' && editFormData.types.length !== 1) ||
                    (editFormData.challenge !== 'trainers' && editFormData.challenge !== 'fusions' && editFormData.types.length === 0)
                  }
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Challenge Art'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Challenges;
