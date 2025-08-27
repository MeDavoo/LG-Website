import { useState } from 'react';
import { addPokemon, uploadPokemonImage, getNextPokedexNumber } from '../services/pokemonService';

interface AdminPanelProps {
  onPokemonAdded?: () => void;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AdminPanel = ({ onPokemonAdded, onShowNotification }: AdminPanelProps = {}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Add Pokemon form state
  const [formData, setFormData] = useState({
    name: '',
    artist: '',
    types: [] as string[],
    unique: '',
    evolutionStage: 0,
    image: null as File | null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const pokemonTypes = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  const artists = ['DAVE', 'JOAO', 'GUTO'];
  const uniqueOptions = [
    { value: '', label: 'Not Unique' },
    { value: 'U0', label: 'No Evolution (U0)' },
    { value: 'U1', label: 'One Evolution (U1)' },
    { value: 'U2', label: 'Two Evolutions (U2)' }
  ];

  const evolutionStageOptions = [
    { value: 0, label: 'Base Form (Stage 0)' },
    { value: 1, label: 'First Evolution (Stage 1)' },
    { value: 2, label: 'Second Evolution (Stage 2)' }
  ];

  const handleAddPokemon = async () => {
    if (!formData.name || !formData.artist || formData.types.length === 0 || !formData.image) {
      if (onShowNotification) {
        onShowNotification('Please fill in all required fields and select an image', 'error');
      }
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Upload image first
      const imageUrl = await uploadPokemonImage(formData.image, formData.name);
      if (!imageUrl) {
        throw new Error('Failed to upload image');
      }

      // Get next Pokedex number
      const pokedexNumber = await getNextPokedexNumber();

      // Add Pokemon to database
      const pokemonData = {
        pokedexNumber,
        name: formData.name,
        artist: formData.artist,
        types: formData.types,
        imageUrl,
        evolutionStage: formData.evolutionStage,
        ...(formData.unique && { unique: formData.unique })
      };

      await addPokemon(pokemonData);
      
      setUploadSuccess(true);
      if (onShowNotification) {
        onShowNotification(`${formData.name} has been added as Pokemon #${pokedexNumber}!`, 'success');
      }
      
      // Call callback to refresh data in parent component
      if (onPokemonAdded) {
        onPokemonAdded();
      }
      
      // Reset form
      setFormData({
        name: '',
        artist: '',
        types: [],
        unique: '',
        evolutionStage: 0,
        image: null
      });
      
      // Reset file input
      const fileInput = document.getElementById('pokemon-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error adding Pokemon:', error);
      if (onShowNotification) {
        onShowNotification('Error adding Pokemon. Check console for details.', 'error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleTypeToggle = (type: string) => {
    setFormData(prev => {
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
        if (onShowNotification) {
          onShowNotification('Pokemon can only have up to 2 types', 'error');
        }
        return prev;
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Add New Pokemon</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
        >
          {showAddForm ? 'Hide Form' : 'Show Form'}
        </button>
      </div>

      {showAddForm && (
        <div className="space-y-6">
          {/* Pokemon Name */}
          <div>
            <label className="block text-white font-semibold mb-2">Pokemon Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter Pokemon name"
            />
          </div>

          {/* Artist Selection */}
          <div>
            <label className="block text-white font-semibold mb-2">Artist *</label>
            <div className="flex gap-3">
              {artists.map(artist => (
                <button
                  key={artist}
                  onClick={() => setFormData(prev => ({ ...prev, artist }))}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    formData.artist === artist
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  {artist}
                </button>
              ))}
            </div>
          </div>

          {/* Pokemon Types */}
          <div>
            <label className="block text-white font-semibold mb-2">Types * (Select 1-2)</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {pokemonTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  disabled={!formData.types.includes(type) && formData.types.length >= 2}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    formData.types.includes(type)
                      ? `type-${type.toLowerCase()} text-white`
                      : 'bg-white/20 text-white/80 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-white/60 text-sm mt-2">
              Selected: {formData.types.join(', ') || 'None'}
            </p>
          </div>

          {/* Unique Pokemon Option */}
          <div>
            <label className="block text-white font-semibold mb-2">Unique Evolution Status</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {uniqueOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, unique: option.value }))}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    formData.unique === option.value
                      ? 'bg-green-500 text-white'
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
              {evolutionStageOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, evolutionStage: option.value }))}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    formData.evolutionStage === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-white/60 text-sm mt-1">
              Stage {formData.evolutionStage}: {evolutionStageOptions.find(opt => opt.value === formData.evolutionStage)?.label.split(' (')[0]}
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-white font-semibold mb-2">Pokemon Image *</label>
            <input
              id="pokemon-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600"
            />
            {formData.image && (
              <p className="text-green-300 text-sm mt-2">
                ✅ Selected: {formData.image.name}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleAddPokemon}
              disabled={isUploading || !formData.name || !formData.artist || formData.types.length === 0 || !formData.image}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                isUploading || !formData.name || !formData.artist || formData.types.length === 0 || !formData.image
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding Pokemon...
                </span>
              ) : (
                '🎨 Add Pokemon to Pokedex'
              )}
            </button>
            
            {uploadSuccess && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mt-4">
                <p className="text-green-300 font-semibold">Pokemon added successfully!</p>
                <p className="text-green-200 text-sm">Your new Pokemon is now in the Pokedex.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
