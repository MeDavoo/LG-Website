import { useState, useEffect } from 'react';
import { getAllPokemon, Pokemon } from '../services/pokemonService';
import SpinningWheel, { WheelSegment } from '../components/SpinningWheel';
import { getAllPokemonFromGenerations, pokemonGenerations, getPokemonArtworkUrl } from '../data/pokemonData';

interface WheelTab {
  id: string;
  name: string;
  description: string;
}

const WHEEL_TABS: WheelTab[] = [
  { id: 'types', name: 'TYPES', description: 'Random Pokemon types for challenges' },
  { id: 'evolution', name: 'EVOLUTION', description: 'Random evolution stages and categories' },
  { id: 'fusion', name: 'FUSION', description: 'Spin for 2 Pokemon to fuse together' },
  { id: 'pokemon', name: 'POKEMON', description: 'Random single Pokemon selection' },
  { id: 'custom', name: 'CUSTOM', description: 'Create your own custom wheels' }
];

const Wheels = () => {
  const [activeTab, setActiveTab] = useState<string>('types');
  const [pokemonData, setPokemonData] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [fusionResults, setFusionResults] = useState<{ pokemon1: Pokemon | null; pokemon2: Pokemon | null }>({
    pokemon1: null,
    pokemon2: null
  });
  const [typeResult, setTypeResult] = useState<WheelSegment | null>(null);
  const [evolutionResult, setEvolutionResult] = useState<WheelSegment | null>(null);
  const [pokemonResult, setPokemonResult] = useState<WheelSegment | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });
  const [customWheelSegments, setCustomWheelSegments] = useState<WheelSegment[]>([]);
  const [customWheelText, setCustomWheelText] = useState('');
  const [customResult, setCustomResult] = useState<WheelSegment | null>(null);
  const [selectedGenerations, setSelectedGenerations] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8]); // All generations selected by default

  // Pokemon types for the type wheel
  const pokemonTypes = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  // Evolution options
  const evolutionOptions = [
    { label: 'No Evos', value: 'U0' },
    { label: 'One Evos', value: 'U1' },
    { label: 'Two Evos', value: 'U2' },
    { label: 'GMAX', value: 'GMAX' },
    { label: 'Legendary', value: 'Legendary' },
    { label: 'MEGA', value: 'MEGA' }
  ];

  // Load Pokemon data
  useEffect(() => {
    loadPokemonData();
  }, []);

  const loadPokemonData = async () => {
    try {
      setLoading(true);
      const data = await getAllPokemon();
      setPokemonData(data);
    } catch (error) {
      console.error('Error loading Pokemon data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Generate type wheel segments
  const getTypeWheelSegments = (): WheelSegment[] => {
    const typeColors = [
      '#A8A878', '#F08030', '#6890F0', '#F8D030', '#78C850', '#98D8D8',
      '#C03028', '#A040A0', '#E0C068', '#A890F0', '#F85888', '#A8B820',
      '#B8A038', '#705898', '#7038F8', '#705848', '#B8B8D0', '#EE99AC'
    ];

    return pokemonTypes.map((type, index) => ({
      id: type.toLowerCase(),
      label: type,
      color: typeColors[index % typeColors.length],
      data: { type }
    }));
  };

  // Generate evolution wheel segments
  const getEvolutionWheelSegments = (): WheelSegment[] => {
    const evolutionColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#607D8B'];
    
    return evolutionOptions.map((option, index) => ({
      id: option.value,
      label: option.label,
      color: evolutionColors[index % evolutionColors.length],
      data: { evolution: option.value }
    }));
  };

  // Generate Pokemon wheel segments (ALL Pokemon from website)
  const getPokemonWheelSegments = (): WheelSegment[] => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9999', '#66B2FF', '#99FF99', '#FFB366', '#FF99CC', '#99CCFF',
      '#FFD93D', '#6BCF7F', '#4D96FF', '#9775FA', '#FF8787', '#74C0FC',
      '#FFB74D', '#81C784', '#64B5F6', '#BA68C8', '#F06292', '#A1887F'
    ];

    return pokemonData.map((pokemon, index) => ({
      id: pokemon.id,
      label: pokemon.name,
      color: colors[index % colors.length],
      data: { pokemon }
    }));
  };

  // Generate fusion wheel segments (Pokemon from selected generations)
  const getFusionWheelSegments = (): WheelSegment[] => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9999', '#66B2FF', '#99FF99', '#FFB366', '#FF99CC', '#99CCFF',
      '#FFD93D', '#6BCF7F', '#4D96FF', '#9775FA', '#FF8787', '#74C0FC',
      '#FFB74D', '#81C784', '#64B5F6', '#BA68C8', '#F06292', '#A1887F'
    ];

    const selectedPokemon = getAllPokemonFromGenerations(selectedGenerations);
    return selectedPokemon.map((pokemon, index) => ({
      id: `real-${index}`,
      label: pokemon,
      color: colors[index % colors.length],
      data: { pokemon: { name: pokemon, id: `real-${index}` } }
    }));
  };

  // Handle fusion wheel spin (need to spin twice)
  const handleFusionSpin = (result: WheelSegment) => {
    const pokemon = result.data.pokemon as { name: string; id: string };
    
    if (!fusionResults.pokemon1) {
      setFusionResults(prev => ({ ...prev, pokemon1: pokemon as any }));
      showNotification(`First Pokemon: ${pokemon.name}!`, 'info');
    } else if (!fusionResults.pokemon2) {
      setFusionResults(prev => ({ ...prev, pokemon2: pokemon as any }));
      showNotification(`Fusion Complete: ${fusionResults.pokemon1?.name} + ${pokemon.name}!`, 'success');
    } else {
      // Reset and start over
      setFusionResults({ pokemon1: pokemon as any, pokemon2: null });
      showNotification(`New fusion started with ${pokemon.name}!`, 'info');
    }
  };

  // Reset fusion results
  const resetFusion = () => {
    setFusionResults({ pokemon1: null, pokemon2: null });
    showNotification('Fusion reset! Spin to select your first Pokemon.', 'info');
  };

  // Reset fusion when generation selection changes
  useEffect(() => {
    if (fusionResults.pokemon1 || fusionResults.pokemon2) {
      setFusionResults({ pokemon1: null, pokemon2: null });
    }
  }, [selectedGenerations]);

  // Generate random colors for custom wheel segments
  const generateRandomColors = (count: number): string[] => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9999', '#66B2FF', '#99FF99', '#FFB366', '#FF99CC', '#99CCFF',
      '#FFD93D', '#6BCF7F', '#4D96FF', '#9775FA', '#FF8787', '#74C0FC',
      '#FFB74D', '#81C784', '#64B5F6', '#BA68C8', '#F06292', '#A1887F',
      '#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6',
      '#4FC3F7', '#4DD0E1', '#4DB6AC', '#81C784', '#AED581', '#DCE775',
      '#FFF176', '#FFD54F', '#FFB74D', '#FF8A65', '#A1887F', '#90A4AE'
    ];
    
    // Shuffle and return the required number of colors
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result;
  };

  // Update custom wheel segments based on text input
  const updateCustomWheelFromText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const colors = generateRandomColors(lines.length);
    
    const segments: WheelSegment[] = lines.map((line, index) => ({
      id: `custom-${index}`,
      label: line,
      color: colors[index],
      data: { custom: true }
    }));
    
    setCustomWheelSegments(segments);
  };

  // Custom wheel functions (simplified)
  const handleCustomTextChange = (text: string) => {
    setCustomWheelText(text);
    updateCustomWheelFromText(text);
  };

  const clearCustomWheel = () => {
    setCustomWheelText('');
    setCustomWheelSegments([]);
    setCustomResult(null);
    showNotification('Custom wheel cleared.', 'info');
  };

  return (
    <div className="max-w-full mx-auto relative min-h-screen transform scale-90 origin-top mt-4">
      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-purple-500 hover:bg-purple-400 transition ease-in-out duration-150">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading Wheels...
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Page Title */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Random Wheels</h1>
            <p className="text-white/70">Spin the wheels for random selections and inspiration!</p>
          </div>

          {/* Wheel Tabs */}
          <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2">
            <div className="flex flex-wrap gap-2">
              {WHEEL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 rounded-lg transition-all duration-300 flex-1 min-w-[120px] ${
                    activeTab === tab.id
                      ? 'bg-yellow-400 text-black font-bold shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">{tab.name}</div>
                    <div className="text-xs opacity-80 mt-1">{tab.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wheel Content */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
            {activeTab === 'fusion' && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-white mb-2"> Fusion Wheel</h2>
                  <p className="text-white/70">Spin to get 2 random Pokemon for your fusion art!</p>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-4 items-start justify-items-center">
                  {/* Pokemon 1 - Left Side (2 columns) */}
                  <div className="lg:col-span-2 flex justify-end">
                    <div className="bg-white/10 rounded-lg p-6 border border-white/10 w-full max-w-xs">
                      <h3 className="text-white font-bold text-xl mb-4 text-center">Pokemon 1</h3>
                      <div className="flex flex-col items-center justify-center min-h-[300px]">
                        {fusionResults.pokemon1 ? (
                          <div className="text-center space-y-4">
                            <img 
                              src={getPokemonArtworkUrl(fusionResults.pokemon1.name)} 
                              alt={fusionResults.pokemon1.name}
                              className="w-56 h-56 mx-auto object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <div className="text-white font-bold text-xl">
                              {fusionResults.pokemon1.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/60 text-center">
                            <div className="text-lg">Waiting...</div>
                            <div className="text-sm mt-2">Spin to select</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generation Filter and Controls - Center (3 columns) */}
                  <div className="lg:col-span-3 flex flex-col items-center space-y-6">
                    <div className="bg-white/10 rounded-lg p-6 border border-white/10 w-full max-w-md">
                      {/* Generation Filter */}
                      <div className="mb-6">
                        <h3 className="text-white font-bold text-lg mb-3 text-center">Select Generations</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {pokemonGenerations.map((generation, index) => (
                            <label key={index} className="flex items-center space-x-2 text-white/80 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedGenerations.includes(index)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGenerations(prev => [...prev, index].sort());
                                  } else {
                                    setSelectedGenerations(prev => prev.filter(gen => gen !== index));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{generation.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="text-center mt-2 text-xs text-white/60">
                          {getAllPokemonFromGenerations(selectedGenerations).length} Pokemon available
                        </div>
                      </div>

                      {fusionResults.pokemon1 && fusionResults.pokemon2 && (
                        <div className="p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
                          <div className="text-center">
                            <div className="text-green-300 font-bold text-lg mb-3">Fusion Ready!</div>
                            <div className="flex items-center justify-center gap-3 mb-2">
                              <div className="text-center">
                                <div className="text-white text-sm">{fusionResults.pokemon1.name}</div>
                              </div>
                              <div className="text-yellow-400 text-lg font-bold">+</div>
                              <div className="text-center">
                                <div className="text-white text-sm">{fusionResults.pokemon2.name}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(fusionResults.pokemon1 || fusionResults.pokemon2) && (
                        <button
                          onClick={resetFusion}
                          className="w-full mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Reset Fusion
                        </button>
                      )}
                    </div>

                    {/* Big Wheel - Center */}
                    <SpinningWheel
                      segments={getFusionWheelSegments()}
                      onSpin={handleFusionSpin}
                      size={650}
                    />
                  </div>

                  {/* Pokemon 2 - Right Side (2 columns) */}
                  <div className="lg:col-span-2 flex justify-start">
                    <div className="bg-white/10 rounded-lg p-6 border border-white/10 w-full max-w-xs">
                      <h3 className="text-white font-bold text-xl mb-4 text-center">Pokemon 2</h3>
                      <div className="flex flex-col items-center justify-center min-h-[300px]">
                        {fusionResults.pokemon2 ? (
                          <div className="text-center space-y-4">
                            <img 
                              src={getPokemonArtworkUrl(fusionResults.pokemon2.name)} 
                              alt={fusionResults.pokemon2.name}
                              className="w-56 h-56 mx-auto object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <div className="text-white font-bold text-xl">
                              {fusionResults.pokemon2.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/60 text-center">
                            <div className="text-lg">Waiting...</div>
                            <div className="text-sm mt-2">Spin to select</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'types' && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2"> Type Wheel</h2>
                  <p className="text-white/70">Spin to get random Pokemon types for challenges!</p>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center justify-items-center">
                  {/* Result Display - Left Side (2 columns) */}
                  <div className="lg:col-span-2 flex justify-center">
                    <div className="bg-white/10 rounded-lg p-6 border border-white/10 w-full max-w-sm">
                      <h3 className="text-white font-bold text-lg mb-4 text-center">Selected Type</h3>
                      <div className="text-center">
                        <div className="bg-white/20 rounded-lg p-6 mt-2">
                          <div className="text-white font-bold text-2xl">
                            {typeResult ? typeResult.label : 'Spin to select...'}
                          </div>
                          {typeResult && (
                            <div 
                              className="mt-4 mx-auto w-16 h-16 rounded-full border-4 border-white/30"
                              style={{ backgroundColor: typeResult.color }}
                            ></div>
                          )}
                        </div>
                        
                        {typeResult && (
                          <button
                            onClick={() => setTypeResult(null)}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Clear Result
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wheel - Right Side (3 columns) */}
                  <div className="lg:col-span-3 flex justify-center">
                    <SpinningWheel
                      segments={getTypeWheelSegments()}
                      onSpin={(result) => {
                        setTypeResult(result);
                        showNotification(`Selected type: ${result.label}!`, 'success');
                      }}
                      size={500}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'evolution' && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2"> Evolution Wheel</h2>
                  <p className="text-white/70">Spin to determine evolution stages and special categories!</p>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center justify-items-center">
                  {/* Result Display - Left Side (2 columns) */}
                  <div className="lg:col-span-2 flex justify-center">
                    <div className="bg-white/10 rounded-lg p-6 border border-white/10 w-full max-w-sm">
                      <h3 className="text-white font-bold text-lg mb-4 text-center">Selected Evolution</h3>
                      <div className="text-center">
                        <div className="bg-white/20 rounded-lg p-6 mt-2">
                          <div className="text-white font-bold text-2xl">
                            {evolutionResult ? evolutionResult.label : 'Spin to select...'}
                          </div>
                          {evolutionResult && (
                            <div 
                              className="mt-4 mx-auto w-16 h-16 rounded-full border-4 border-white/30"
                              style={{ backgroundColor: evolutionResult.color }}
                            ></div>
                          )}
                        </div>
                        
                        {evolutionResult && (
                          <button
                            onClick={() => setEvolutionResult(null)}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Clear Result
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wheel - Right Side (3 columns) */}
                  <div className="lg:col-span-3 flex justify-center">
                    <SpinningWheel
                      segments={getEvolutionWheelSegments()}
                      onSpin={(result) => {
                        setEvolutionResult(result);
                        showNotification(`Selected: ${result.label}!`, 'success');
                      }}
                      size={500}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pokemon' && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-white mb-2"> Pokemon Wheel</h2>
                  <p className="text-white/70">Spin to get a random Pokemon for art inspiration!</p>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center justify-items-center">
                  {/* Result Display - Left Side (2 columns) */}
                  <div className="lg:col-span-2 flex justify-center">
                    <div className="bg-white/10 rounded-lg p-6 border border-white/10 w-full max-w-sm">
                      <h3 className="text-white font-bold text-lg mb-4 text-center">Selected Pokemon</h3>
                      <div className="text-center">
                        <div className="bg-white/20 rounded-lg p-6 mt-2">
                          {pokemonResult ? (
                            <div className="space-y-3">
                              <img 
                                src={pokemonResult.data.pokemon.imageUrl} 
                                alt={pokemonResult.label}
                                className="w-24 h-24 mx-auto object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="text-white font-bold text-xl">
                                {pokemonResult.label}
                              </div>
                            </div>
                          ) : (
                            <div className="text-white font-bold text-2xl">Spin to select...</div>
                          )}
                        </div>
                        
                        {pokemonResult && (
                          <button
                            onClick={() => setPokemonResult(null)}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Clear Result
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wheel - Right Side (3 columns) */}
                  <div className="lg:col-span-3 flex justify-center">
                    <SpinningWheel
                      segments={getPokemonWheelSegments()}
                      onSpin={(result) => {
                        setPokemonResult(result);
                        showNotification(`Selected Pokemon: ${result.label}!`, 'success');
                      }}
                      size={580}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'custom' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">🛠️ Custom Wheels</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Wheel Creator */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <h3 className="text-white font-bold text-lg mb-4">Wheel Builder</h3>
                    
                    {/* Text Area for Custom Segments */}
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">
                          Enter Options (one per line)
                        </label>
                        <textarea
                          value={customWheelText}
                          onChange={(e) => handleCustomTextChange(e.target.value)}
                          placeholder={`Option 1\nOption 2\nOption 3\n...`}
                          className="w-full h-48 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-white/80 text-sm">
                          Segments: {customWheelSegments.length}
                          {customWheelSegments.length > 20 && (
                            <span className="text-yellow-300 ml-2">(Text cycling mode)</span>
                          )}
                        </div>
                        {customWheelSegments.length > 0 && (
                          <button
                            onClick={clearCustomWheel}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Result Area */}
                    {customWheelSegments.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-white/80 text-sm mb-2">Result:</div>
                        <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                          <div className="text-center">
                            <div className="text-white font-bold text-xl">
                              {customResult ? customResult.label : 'Spin to select...'}
                            </div>
                            {customResult && (
                              <div 
                                className="mt-3 mx-auto w-12 h-12 rounded-full border-3 border-white/30"
                                style={{ backgroundColor: customResult.color }}
                              ></div>
                            )}
                          </div>
                          
                          {customResult && (
                            <button
                              onClick={() => setCustomResult(null)}
                              className="w-full mt-3 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                            >
                              Clear Result
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Wheel Display */}
                  <div className="text-center">
                    {customWheelSegments.length > 0 ? (
                      <SpinningWheel
                        segments={customWheelSegments}
                        onSpin={(result) => {
                          setCustomResult(result);
                          showNotification(`Selected: ${result.label}!`, 'success');
                        }}
                        size={500}
                      />
                    ) : (
                      <div className="bg-white/5 rounded-lg p-8 border border-white/10">
                        <div className="text-white/60 text-center">
                          <h3 className="text-lg font-semibold mb-2">No Options Yet</h3>
                          <p className="text-sm mb-4">Type your options in the text area to create your wheel!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
  );
};

export default Wheels;