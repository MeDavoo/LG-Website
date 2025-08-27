import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Users, Image, Palette, TrendingUp, TrendingDown } from 'lucide-react';
import { getAllPokemon, Pokemon } from '../services/pokemonService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ArtistStats {
  artist: string;
  totalPokemon: number;
  uniquePokemon: number;
  uniqueTypeDistribution: { [key: string]: number };
}

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<Pokemon[]>([]);

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

  // Calculate statistics
  const totalPokemon = pokemonData.length;
  const totalSlots = 151;
  const completionPercentage = Math.round((totalPokemon / totalSlots) * 100);

  // Type distribution for all Pokemon
  const typeCount: { [key: string]: number } = {};
  pokemonData.forEach(p => {
    p.types.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
  });

  // Artist distribution
  const artistCount: { [key: string]: number } = {};
  pokemonData.forEach(p => {
    artistCount[p.artist] = (artistCount[p.artist] || 0) + 1;
  });

  // Count unique Pokemon (U0, U1, U2)
  const uniquePokemonCount = pokemonData.filter(p => p.unique && ['U0', 'U1', 'U2'].includes(p.unique)).length;

  // All possible Pokemon types
  const allPokemonTypes = [
    'Fire', 'Water', 'Electric', 'Grass', 'Psychic', 'Dragon', 'Dark', 'Ghost', 
    'Steel', 'Normal', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Bug', 
    'Rock', 'Fairy'
  ];

  // Individual artist stats with unique Pokemon focus
  const artistStats: ArtistStats[] = Object.keys(artistCount).map(artist => {
    const artistPokemon = pokemonData.filter(p => p.artist === artist);
    const artistUnique = artistPokemon.filter(p => p.unique && ['U0', 'U1', 'U2'].includes(p.unique));
    
    // Type distribution for this artist's unique Pokemon only - include all types
    const uniqueTypeDistribution: { [key: string]: number } = {};
    
    // Initialize all types with 0
    allPokemonTypes.forEach(type => {
      uniqueTypeDistribution[type] = 0;
    });
    
    // Count actual types
    artistUnique.forEach(p => {
      p.types.forEach(type => {
        uniqueTypeDistribution[type] = (uniqueTypeDistribution[type] || 0) + 1;
      });
    });
    
    return {
      artist,
      totalPokemon: artistPokemon.length,
      uniquePokemon: artistUnique.length,
      uniqueTypeDistribution
    };
  }).sort((a, b) => b.totalPokemon - a.totalPokemon);

  // Get suggestions for an artist based on their type distribution
  const getArtistSuggestions = (typeDistribution: { [key: string]: number }) => {
    const typeEntries = Object.entries(typeDistribution);
    
    // Sort by count to get the distribution
    const sortedByCount = typeEntries.sort((a, b) => a[1] - b[1]);
    
    // Get the lowest 2-3 types (should do more of)
    const lowestCounts = sortedByCount.slice(0, Math.min(3, sortedByCount.length));
    const shouldDoMore = lowestCounts.filter(([_, count]) => count <= Math.min(2, Math.max(...typeEntries.map(([_, c]) => c))));
    
    // Get the highest 2-3 types (should do less of) - only if they have more than 0
    const highestCounts = sortedByCount.slice(-3).reverse();
    const shouldDoLess = highestCounts.filter(([_, count]) => count > 0 && count >= Math.max(1, Math.max(...typeEntries.map(([_, c]) => c)) - 1));
    
    return {
      doMore: shouldDoMore.slice(0, 3), // Limit to 3
      doLess: shouldDoLess.slice(0, 3)  // Limit to 3
    };
  };

  // Get type colors for consistency
  const getTypeColor = (type: string, opacity = 0.8) => {
    const colors: { [key: string]: string } = {
      Fire: `rgba(240, 128, 48, ${opacity})`,
      Water: `rgba(104, 144, 240, ${opacity})`,
      Electric: `rgba(248, 208, 48, ${opacity})`,
      Grass: `rgba(120, 200, 80, ${opacity})`,
      Psychic: `rgba(248, 88, 136, ${opacity})`,
      Dragon: `rgba(112, 56, 248, ${opacity})`,
      Dark: `rgba(112, 88, 72, ${opacity})`,
      Ghost: `rgba(112, 88, 152, ${opacity})`,
      Steel: `rgba(184, 184, 208, ${opacity})`,
      Normal: `rgba(184, 184, 168, ${opacity})`,
      Ice: `rgba(152, 216, 216, ${opacity})`,
      Fighting: `rgba(192, 48, 40, ${opacity})`,
      Poison: `rgba(160, 64, 160, ${opacity})`,
      Ground: `rgba(224, 192, 104, ${opacity})`,
      Flying: `rgba(168, 144, 240, ${opacity})`,
      Bug: `rgba(168, 184, 32, ${opacity})`,
      Rock: `rgba(184, 160, 56, ${opacity})`,
      Fairy: `rgba(238, 153, 172, ${opacity})`,
    };
    return colors[type] || `rgba(184, 184, 168, ${opacity})`;
  };

  // Chart data for overall type distribution
  const typeChartData = {
    labels: Object.keys(typeCount),
    datasets: [
      {
        label: 'Pokemon Count',
        data: Object.values(typeCount),
        backgroundColor: Object.keys(typeCount).map(type => getTypeColor(type)),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Artist contribution chart
  const artistChartData = {
    labels: Object.keys(artistCount),
    datasets: [
      {
        label: 'Pokemon Created',
        data: Object.values(artistCount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll create custom legend
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Statistics</h1>
        <p className="text-white/80">Complete overview of our Pokemon artwork collection</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Image className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalPokemon}</div>
          <div className="text-white/70 text-sm">Completed Artwork</div>
          <div className="text-white/50 text-xs">{completionPercentage}% of 151 slots</div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Users className="text-green-400" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{Object.keys(artistCount).length}</div>
          <div className="text-white/70 text-sm">Active Artists</div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Palette className="text-purple-400" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{uniquePokemonCount}</div>
          <div className="text-white/70 text-sm">Unique Pokemon</div>
          <div className="text-white/50 text-xs">Baseless Creations (U0/U1/U2)</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Type Distribution */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Pokemon Types Distribution</h3>
          <div className="flex items-center gap-6 h-80">
            {/* Compact Legend on the Left */}
            <div className="flex-shrink-0 w-32 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {Object.entries(typeCount).map(([type, count]) => (
                  <div key={type} className="flex items-center space-x-1">
                    <span 
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getTypeColor(type, 1) }}
                    ></span>
                    <div className="min-w-0">
                      <div className="text-white text-xs truncate leading-tight">{type}</div>
                      <div className="text-white/60 text-xs leading-tight">{count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Larger Chart on the Right */}
            <div className="flex-1 h-full">
              <Doughnut data={typeChartData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Artist Contributions */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Artist Contributions</h3>
          <div className="h-80">
            <Bar data={artistChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Artist Individual Stats */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
        <h3 className="text-xl font-bold text-white mb-6">Individual Artist Statistics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {artistStats.map((stat) => {
            const suggestions = getArtistSuggestions(stat.uniqueTypeDistribution);
            
            return (
              <div key={stat.artist} className="bg-white/5 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">{stat.artist}</h4>
                
                {/* Artist Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-white/60 text-sm">Total Pokemon</div>
                    <div className="text-yellow-300 font-bold text-2xl">{stat.totalPokemon}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm">Unique Pokemon</div>
                    <div className="text-purple-300 font-bold text-2xl">{stat.uniquePokemon}</div>
                  </div>
                </div>

                {/* Unique Pokemon Type Distribution Chart and Suggestions */}
                {stat.uniquePokemon > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Chart */}
                    <div className="lg:col-span-3">
                      <h5 className="text-white font-semibold mb-3">Unique Pokemon Type Distribution</h5>
                      <div className="h-64">
                        <Bar 
                          data={{
                            labels: allPokemonTypes,
                            datasets: [
                              {
                                label: 'Unique Pokemon Count',
                                data: allPokemonTypes.map(type => stat.uniqueTypeDistribution[type] || 0),
                                backgroundColor: allPokemonTypes.map(type => getTypeColor(type)),
                                borderColor: allPokemonTypes.map(type => getTypeColor(type, 1)),
                                borderWidth: 1,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  color: 'white',
                                  stepSize: 1,
                                },
                                grid: {
                                  color: 'rgba(255, 255, 255, 0.2)',
                                },
                              },
                              x: {
                                ticks: {
                                  color: 'white',
                                  maxRotation: 45,
                                  minRotation: 45,
                                  font: {
                                    size: 10,
                                  },
                                },
                                grid: {
                                  color: 'rgba(255, 255, 255, 0.2)',
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Suggestions */}
                    <div className="lg:col-span-1">
                      <h5 className="text-white font-semibold mb-3">Suggestions</h5>
                      <div className="space-y-4">
                        {/* Do More Of */}
                        {suggestions.doMore.length > 0 && (
                          <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingUp className="text-green-400" size={16} />
                              <span className="text-green-300 text-sm font-semibold">Try More</span>
                            </div>
                            <div className="space-y-1">
                              {suggestions.doMore.map(([type, count]) => (
                                <div key={type} className="text-white text-sm">
                                  <span 
                                    className={`inline-block w-3 h-3 rounded-full mr-2`}
                                    style={{ backgroundColor: getTypeColor(type, 1) }}
                                  ></span>
                                  {type}
                                  <span className="text-white/60 text-xs ml-2">({count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Do Less Of */}
                        {suggestions.doLess.length > 0 && suggestions.doLess.some(([_, count]) => count > 0) && (
                          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingDown className="text-red-400" size={16} />
                              <span className="text-red-300 text-sm font-semibold">Maybe Less</span>
                            </div>
                            <div className="space-y-1">
                              {suggestions.doLess.filter(([_, count]) => count > 0).map(([type, count]) => (
                                <div key={type} className="text-white text-sm">
                                  <span 
                                    className={`inline-block w-3 h-3 rounded-full mr-2`}
                                    style={{ backgroundColor: getTypeColor(type, 1) }}
                                  ></span>
                                  {type}
                                  <span className="text-white/60 text-xs ml-2">({count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* No suggestions message */}
                        {suggestions.doMore.length === 0 && suggestions.doLess.length === 0 && (
                          <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-3 text-center">
                            <span className="text-blue-300 text-sm">Perfect balance! 🎯</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {stat.uniquePokemon === 0 && (
                  <div className="text-white/50 text-center py-4">
                    No unique Pokemon yet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Statistics;
