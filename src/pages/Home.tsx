import { useState, useEffect } from 'react';
import { getAllPokemon, Pokemon } from '../services/pokemonService';
import AdminPanel from '../components/AdminPanel';

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
  const [pokemonData, setPokemonData] = useState<Pokemon[]>([]);
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

  const [hoveredPokemon, setHoveredPokemon] = useState<PokemonSlot | null>(null);
  
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

  // Filter pokemon based on current filters
  const filteredPokemon = pokemonSlots.filter(pokemon => {
    // Search filter
    if (searchTerm && !pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Type filter
    if (selectedTypes.length > 0 && pokemon.types) {
      const hasSelectedType = selectedTypes.some(type => pokemon.types!.includes(type));
      if (!hasSelectedType) return false;
    }
    
    // Artist filter
    if (selectedArtists.length > 0 && pokemon.artist) {
      if (!selectedArtists.includes(pokemon.artist)) return false;
    }
    
    // Unique only filter (specifically U0 - doesn't evolve)
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
    <div className="max-w-7xl mx-auto relative">
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              <span className="text-yellow-300">LG Pokedex</span>
            </h1>
            <div className="mt-4 text-white/60">
              <span className="text-yellow-300 font-bold">{filteredPokemon.filter(p => p.hasArt).length}</span> / 151 Pokemon Registered
              {(searchTerm || selectedTypes.length > 0 || selectedArtists.length > 0 || uniqueOnly) && (
                <span className="ml-4 text-blue-300">
                  ({filteredPokemon.length} filtered)
                </span>
              )}
            </div>
          </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar - Top */}
        <div className="max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search Pokemon by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* Types - Second Row Spanning Page */}
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 text-center">Types</h3>
          <div className="flex flex-wrap gap-2 justify-center">
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
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                  selectedTypes.includes(type)
                    ? `${getTypeColor(type)} text-white scale-110`
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Other Filters - Third Row Spanning Page */}
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 text-center">Other Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Artists */}
            <div className="text-center">
              <label className="block text-white/80 text-sm mb-2">Artists</label>
              <div className="flex flex-wrap gap-2 justify-center">
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
                    className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                      selectedArtists.includes(artist)
                        ? 'bg-yellow-400 text-black scale-110'
                        : 'bg-white/20 text-white/80 hover:bg-white/30'
                    }`}
                  >
                    {artist}
                  </button>
                ))}
              </div>
            </div>

            {/* Doesn't Evolve (U0) */}
            <div className="text-center">
              <label className="block text-white/80 text-sm mb-2">Special</label>
              <button
                onClick={() => setUniqueOnly(!uniqueOnly)}
                className={`px-4 py-1 rounded-full text-sm font-semibold transition-all ${
                  uniqueOnly
                    ? 'bg-purple-500 text-white scale-110'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                🌟 Doesn't Evolve ({pokemonSlots.filter(p => p.unique === 'U0').length})
              </button>
            </div>

            {/* Evolution Stages */}
            <div className="text-center">
              <label className="block text-white/80 text-sm mb-2">Evolution Stages</label>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setEvolutionFilter('stage0')}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                    evolutionFilter === 'stage0'
                      ? 'bg-green-500 text-white scale-110'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  Base
                </button>
                <button
                  onClick={() => setEvolutionFilter('stage1')}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                    evolutionFilter === 'stage1'
                      ? 'bg-yellow-500 text-white scale-110'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  First
                </button>
                <button
                  onClick={() => setEvolutionFilter('stage2')}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                    evolutionFilter === 'stage2'
                      ? 'bg-red-500 text-white scale-110'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  Second
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedTypes.length > 0 || selectedArtists.length > 0 || uniqueOnly || evolutionFilter !== 'all') && (
          <div className="text-center">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTypes([]);
                setSelectedArtists([]);
                setUniqueOnly(false);
                setEvolutionFilter('all');
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Pokedex Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filteredPokemon.map((pokemon) => (
          <div
            key={pokemon.id}
            className={`relative aspect-square rounded-lg border-2 transition-all duration-300 cursor-pointer ${
              pokemon.hasArt 
                ? 'bg-white/20 border-yellow-400 hover:scale-110 hover:z-10 hover:shadow-2xl' 
                : 'bg-white/5 border-white/20 hover:bg-white/10'
            }`}
            onMouseEnter={() => setHoveredPokemon(pokemon)}
            onMouseLeave={() => setHoveredPokemon(null)}
          >
            {/* Pokemon Number */}
            <div className="absolute top-1 left-1 text-xs font-bold text-white/80 bg-black/50 px-1 rounded">
              #{pokemon.id.toString().padStart(3, '0')}
            </div>

            {/* Content */}
            <div className="flex flex-col items-center justify-center h-full p-2">
              {pokemon.hasArt ? (
                <>
                  {/* Pokemon Image */}
                  <div className="w-full h-3/4 mb-1 rounded overflow-hidden">
                    <img
                      src={pokemon.imageUrl}
                      alt={pokemon.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Pokemon Name */}
                  <div className="text-center">
                    <div className="text-white font-semibold text-xs truncate w-full">
                      {pokemon.name}
                    </div>
                    <div className="text-white/60 text-xs">
                      by {pokemon.artist}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Empty Slot */}
                  <div className="w-full h-3/4 mb-1 rounded bg-white/10 flex items-center justify-center">
                    <span className="text-white/40 text-2xl">?</span>
                  </div>
                  <div className="text-white/40 text-xs text-center">
                    No artwork yet
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Pokemon Form */}
      <AdminPanel onPokemonAdded={loadPokemonData} />

      {/* Hover Preview Modal */}
      {hoveredPokemon && hoveredPokemon.hasArt && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-lg rounded-xl p-6 border border-white/30 shadow-2xl max-w-md">
            <div className="text-center">
              {/* Large Image */}
              <div className="w-64 h-64 mx-auto mb-4 rounded-lg overflow-hidden">
                <img
                  src={hoveredPokemon.imageUrl}
                  alt={hoveredPokemon.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Details */}
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {hoveredPokemon.name}
              </h3>
              <p className="text-gray-600 mb-3">
                Pokemon #{hoveredPokemon.id.toString().padStart(3, '0')} • Created by {hoveredPokemon.artist}
              </p>
              
              {/* Types */}
              {hoveredPokemon.types && (
                <div className="flex justify-center gap-2">
                  {hoveredPokemon.types.map((type) => (
                    <span
                      key={type}
                      className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getTypeColor(type)}`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Home;
