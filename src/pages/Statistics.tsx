import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Users, Image, Palette, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { getAllPokemon, Pokemon, getArtistRankings, getAllRatings, PokemonRating, getGlobalRankings } from '../services/pokemonService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
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
  const [artistRankings, setArtistRankings] = useState<{ 
    [artist: string]: { pokemonId: string; rank: number; totalPoints: number; pokemon: Pokemon }[] 
  }>({});
  const [globalRankings, setGlobalRankings] = useState<{ pokemonId: string; rank: number; totalPoints: number }[]>([]);
  const [pokemonRatings, setPokemonRatings] = useState<{ [pokemonId: string]: PokemonRating }>({});
  const [selectedArtist, setSelectedArtist] = useState<string>(''); // New state for selected artist tab

  useEffect(() => {
    loadPokemonData();
  }, []);

  const loadPokemonData = async () => {
    try {
      setLoading(true);
      const data = await getAllPokemon();
      setPokemonData(data);
      
      // Load all Pokemon ratings
      const ratings = await getAllRatings();
      setPokemonRatings(ratings);
      
      // Load global rankings
      const globalRankingData = await getGlobalRankings();
      setGlobalRankings(globalRankingData);
      
      // Get unique artists and load their rankings
      const artists = [...new Set(data.map(p => p.artist))];
      const rankingsMap: { [artist: string]: { pokemonId: string; rank: number; totalPoints: number; pokemon: Pokemon }[] } = {};
      
      for (const artist of artists) {
        const artistRankingData = await getArtistRankings(artist);
        // Enhance with Pokemon data
        rankingsMap[artist] = artistRankingData.map(ranking => ({
          ...ranking,
          pokemon: data.find(p => p.id === ranking.pokemonId)!
        }));
      }
      
      setArtistRankings(rankingsMap);
    } catch (error) {
      console.error('Error loading Pokemon data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalPokemon = pokemonData.length;
  // Calculate total slots dynamically based on highest pokedex number
  const totalSlots = pokemonData.length > 0 
    ? Math.max(...pokemonData.map(p => p.pokedexNumber || 0), 151) // Minimum 151 for classic feel
    : 151;
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

  // Type count distribution (single vs dual type)
  const singleTypeCount = pokemonData.filter(p => p.types.length === 1).length;
  const dualTypeCount = pokemonData.filter(p => p.types.length === 2).length;
  const typeCountDistribution = {
    'Single Type': singleTypeCount,
    'Dual Type': dualTypeCount
  };

  // Count unique Pokemon (U0, U1, U2)
  const uniquePokemonCount = pokemonData.filter(p => p.unique && ['U0', 'U1', 'U2'].includes(p.unique)).length;

  // Evolution distribution
  const evolutionCount = {
    'No Evolution (U0)': pokemonData.filter(p => p.unique === 'U0').length,
    'One Evolution (U1)': pokemonData.filter(p => p.unique === 'U1').length,
    'Two Evolutions (U2)': pokemonData.filter(p => p.unique === 'U2').length,
  };

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

  // Set first artist as selected when data loads
  useEffect(() => {
    if (artistStats.length > 0 && !selectedArtist) {
      setSelectedArtist(artistStats[0].artist);
    }
  }, [artistStats, selectedArtist]);

  // Helper function to get average stars for a Pokemon
  const getAverageStars = (pokemonId: string): number | null => {
    const rating = pokemonRatings[pokemonId];
    return rating ? rating.averageRating : null;
  };

  // Helper function to format average stars display
  const formatAverageStars = (pokemonId: string): string => {
    const avgStars = getAverageStars(pokemonId);
    if (avgStars === null || avgStars === 0) {
      return 'No ratings';
    }
    return `${avgStars.toFixed(1)}★`;
  };

  // Helper function to get global rank for a Pokemon
  const getGlobalRank = (pokemonId: string): number | null => {
    const globalRanking = globalRankings.find(r => r.pokemonId === pokemonId);
    return globalRanking ? globalRanking.rank : null;
  };

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

  // Type count distribution chart (single vs dual type)
  const typeCountChartData = {
    labels: Object.keys(typeCountDistribution),
    datasets: [
      {
        label: 'Pokemon Count',
        data: Object.values(typeCountDistribution),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Green for single type
          'rgba(59, 130, 246, 0.8)',  // Blue for dual type
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Evolution distribution chart
  const evolutionChartData = {
    labels: Object.keys(evolutionCount),
    datasets: [
      {
        label: 'Pokemon Count',
        data: Object.values(evolutionCount),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red for U0 (no evolution)
          'rgba(245, 158, 11, 0.8)',  // Orange for U1 (one evolution)
          'rgba(34, 197, 94, 0.8)',   // Green for U2 (two evolutions)
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
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
          minRotation: 0,
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: {
        display: false, // We'll create custom legend
      },
    },
    layout: {
      padding: 10,
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
          <div className="text-white/50 text-xs">{completionPercentage}% of {totalSlots} slots</div>
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        {/* Type Distribution - Takes 1/2 width (2 columns) */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
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
            
            {/* Doughnut Chart - Properly contained */}
            <div className="flex-1 h-full flex items-center justify-center overflow-hidden">
              <div className="w-72 h-72 max-w-full max-h-full">
                <Doughnut data={typeChartData} options={doughnutOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Type Count Distribution - Takes 1/4 width (1 column) */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-6">Single vs Dual Type</h3>
          <div className="h-80">
            <Bar data={typeCountChartData} options={chartOptions} />
          </div>
        </div>

        {/* Evolution Distribution - Takes 1/4 width (1 column) */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-6">Evolution Distribution</h3>
          <div className="h-80">
            <Bar data={evolutionChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Global Rankings Line Chart */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Trophy className="mr-3 text-yellow-400" size={24} />
          Global Pokemon Rankings Over Time
        </h3>
        <div className="h-96">
          {(() => {
            // Get all Pokemon sorted by Pokedex number
            const sortedPokemon = [...pokemonData].sort((a, b) => a.pokedexNumber - b.pokedexNumber);
            
            // Calculate ranking changes for color coding
            const rankingChanges: number[] = [];
            let previousRank: number | null = null;
            
            const chartData = sortedPokemon.map((pokemon, index) => {
              const globalRank = getGlobalRank(pokemon.id);
              
              // Calculate change from previous Pokemon's rank (skip first Pokemon)
              let change = 0;
              if (index > 0 && previousRank !== null && globalRank !== null) {
                change = previousRank - globalRank; // Positive = improvement (going up), Negative = decline (going down)
              }
              rankingChanges.push(change);
              previousRank = globalRank;
              
              return globalRank || totalPokemon + 1;
            });

            return (
              <Line 
                data={{
                  labels: sortedPokemon.slice(1).map(pokemon => `#${pokemon.pokedexNumber.toString().padStart(3, '0')} ${pokemon.name}`),
                  datasets: [
                    {
                      label: 'Global Rank',
                      data: chartData.slice(1),
                      borderColor: (context) => {
                        if (!context.parsed) return 'rgba(59, 130, 246, 1)';
                        const index = context.dataIndex;
                        // Since we sliced, index 0 is now the second Pokemon, but we want to treat it as blue
                        if (index === 0) return 'rgba(59, 130, 246, 1)'; // First visible point is blue
                        
                        const change = rankingChanges[index + 1]; // Adjust for slice(1)
                        if (change > 0) return 'rgba(34, 197, 94, 1)'; // Green for improvement (rank going up)
                        if (change < 0) return 'rgba(239, 68, 68, 1)'; // Red for decline (rank going down)
                        return 'rgba(156, 163, 175, 1)'; // Gray for no change
                      },
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 3,
                      fill: false,
                      tension: 0.1,
                      pointBackgroundColor: (context) => {
                        if (!context.parsed) return 'rgba(59, 130, 246, 1)';
                        const index = context.dataIndex;
                        if (index === 0) return 'rgba(59, 130, 246, 1)'; // First visible point is blue
                        
                        const change = rankingChanges[index + 1]; // Adjust for slice(1)
                        if (change > 0) return 'rgba(34, 197, 94, 1)'; // Green
                        if (change < 0) return 'rgba(239, 68, 68, 1)'; // Red
                        return 'rgba(156, 163, 175, 1)'; // Gray
                      },
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      segment: {
                        borderColor: (ctx) => {
                          const index = ctx.p1DataIndex;
                          if (index === 0) return 'rgba(59, 130, 246, 1)'; // First visible segment is blue
                          
                          const change = rankingChanges[index + 1]; // Adjust for slice(1)
                          if (change > 0) return 'rgba(34, 197, 94, 1)'; // Green for improvement
                          if (change < 0) return 'rgba(239, 68, 68, 1)'; // Red for decline
                          return 'rgba(156, 163, 175, 1)'; // Gray for no change
                        }
                      }
                    },
                    {
                      label: 'Trend Line',
                      data: (() => {
                        // Calculate trend line using moving average
                        const windowSize = Math.max(5, Math.floor(chartData.slice(1).length / 10)); // Adaptive window size
                        const trendData = [];
                        const data = chartData.slice(1);
                        
                        for (let i = 0; i < data.length; i++) {
                          const start = Math.max(0, i - Math.floor(windowSize / 2));
                          const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
                          const window = data.slice(start, end);
                          const average = window.reduce((sum, val) => sum + val, 0) / window.length;
                          trendData.push(average);
                        }
                        
                        return trendData;
                      })(),
                      borderColor: 'rgba(255, 215, 0, 0.9)', // Gold color
                      backgroundColor: 'transparent',
                      borderWidth: 4,
                      fill: false,
                      tension: 0.4,
                      pointRadius: 0, // Hide points on trend line
                      pointHoverRadius: 0,
                      borderDash: [5, 5], // Dashed line
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                  plugins: {
                    legend: {
                      display: false,
                      labels: {
                        color: 'white',
                        generateLabels: function() {
                          // Custom label for trend line only
                          return [{
                            text: 'Overall Trend',
                            fillStyle: 'rgba(255, 215, 0, 0.9)',
                            strokeStyle: 'rgba(255, 215, 0, 0.9)',
                            lineWidth: 4,
                            lineDash: [5, 5],
                          }];
                        },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        title: (context: any) => {
                          const index = context[0].dataIndex;
                          const pokemon = sortedPokemon[index + 1]; // Adjust for slice(1)
                          return `${pokemon.name} (#${pokemon.pokedexNumber.toString().padStart(3, '0')})`;
                        },
                        label: (context: any) => {
                          const index = context.dataIndex;
                          const pokemon = sortedPokemon[index + 1]; // Adjust for slice(1)
                          const globalRank = context.parsed.y;
                          const avgStars = formatAverageStars(pokemon.id);
                          
                          const result = [
                            `Global Rank: #${globalRank > totalPokemon ? 'Unranked' : globalRank}`,
                            `Artist: ${pokemon.artist}`,
                            `Average Rating: ${avgStars}`,
                            `Types: ${pokemon.types.join(', ')}`
                          ];
                          
                          // Add ranking change info (index + 1 because we sliced)
                          if (index >= 0) { // Now we always have a comparison since we start from second Pokemon
                            const change = rankingChanges[index + 1];
                            if (change > 0) {
                              result.push(`📈 Improved by ${change} positions`);
                            } else if (change < 0) {
                              result.push(`📉 Declined by ${Math.abs(change)} positions`);
                            } else {
                              result.push(`➖ No change in ranking`);
                            }
                          }
                          
                          return result;
                        },
                        afterLabel: () => {
                          return `Out of ${totalPokemon} total Pokemon`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      reverse: true, // Lower ranks (better) appear higher on chart
                      beginAtZero: false,
                      max: totalPokemon,
                      title: {
                        display: true,
                        text: 'Global Rank',
                        color: 'white',
                        font: {
                          size: 14,
                          weight: 'bold',
                        },
                      },
                      ticks: {
                        color: 'white',
                        stepSize: Math.ceil(totalPokemon / 5), // Fewer ticks = fewer grid lines
                        callback: function(value) {
                          return '#' + value;
                        },
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)', // More subtle grid lines
                        lineWidth: 1,
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Pokemon (Pokedex Order)',
                        color: 'white',
                        font: {
                          size: 14,
                          weight: 'bold',
                        },
                      },
                      ticks: {
                        display: false, // Hide all x-axis labels
                      },
                      grid: {
                        display: false, // Hide vertical grid lines completely
                      },
                    },
                  },
                }}
              />
            );
          })()}
        </div>
        
        {/* Legend for the color coding */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-6 bg-white/5 rounded-lg px-6 py-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-green-500 rounded"></div>
              <span className="text-green-400 text-sm font-medium">Ranking Improved</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-red-500 rounded"></div>
              <span className="text-red-400 text-sm font-medium">Ranking Declined</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-400 rounded"></div>
              <span className="text-gray-400 text-sm font-medium">➖ No Change</span>
            </div>
          </div>
        </div>
      </div>

      {/* Artist Individual Stats - Tabbed Interface */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
        <h3 className="text-xl font-bold text-white mb-6">Individual Artist Statistics</h3>
        
        {/* Artist Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/20 pb-4">
          {artistStats.map((stat) => (
            <button
              key={stat.artist}
              onClick={() => setSelectedArtist(stat.artist)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                selectedArtist === stat.artist
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {stat.artist}
              <span className="ml-2 text-xs opacity-70">
                ({stat.totalPokemon})
              </span>
            </button>
          ))}
        </div>

        {/* Selected Artist Content */}
        {selectedArtist && artistStats.find(stat => stat.artist === selectedArtist) && (
          <div className="bg-white/5 rounded-lg p-6">
            {(() => {
              const stat = artistStats.find(s => s.artist === selectedArtist)!;
              const suggestions = getArtistSuggestions(stat.uniqueTypeDistribution);
              
              return (
                <>
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
                  
                  {/* Artist Pokemon Rankings */}
                  {artistRankings[stat.artist] && artistRankings[stat.artist].length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-white font-semibold mb-3 flex items-center">
                        <Trophy className="mr-2 text-yellow-400" size={16} />
                        Pokemon Rankings ({artistRankings[stat.artist].length})
                      </h5>
                      
                      {/* Podium Display for Top 3 */}
                      {artistRankings[stat.artist].length >= 3 && (
                        <div className="mb-6 bg-gradient-to-b from-yellow-500/10 to-transparent rounded-lg p-8">
                          <div className="flex items-end justify-center space-x-8 relative max-w-2xl mx-auto">
                            {/* 2nd Place - Left */}
                            <div className="flex flex-col items-center">
                              <div className="relative mb-3">
                                <img 
                                  src={artistRankings[stat.artist][1].pokemon.imageUrl} 
                                  alt={artistRankings[stat.artist][1].pokemon.name}
                                  className="w-24 h-24 object-contain filter drop-shadow-lg"
                                />
                                <div className="absolute -top-3 -right-3 bg-gray-300 text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                  2
                                </div>
                              </div>
                              <div className="bg-gray-300/20 rounded-t-lg w-28 h-14 flex items-center justify-center">
                                <span className="text-gray-300 font-bold">2nd</span>
                              </div>
                            </div>
                            
                            {/* 1st Place - Center (Higher) */}
                            <div className="flex flex-col items-center">
                              <div className="relative mb-3">
                                <img 
                                  src={artistRankings[stat.artist][0].pokemon.imageUrl} 
                                  alt={artistRankings[stat.artist][0].pokemon.name}
                                  className="w-32 h-32 object-contain filter drop-shadow-xl transform scale-110"
                                />
                                <div className="absolute -top-4 -right-4 bg-yellow-500 text-black rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                                  1
                                </div>
                              </div>
                              <div className="bg-yellow-500/30 rounded-t-lg w-32 h-20 flex items-center justify-center">
                                <span className="text-yellow-300 font-bold text-lg">1st</span>
                              </div>
                            </div>
                            
                            {/* 3rd Place - Right */}
                            <div className="flex flex-col items-center">
                              <div className="relative mb-3">
                                <img 
                                  src={artistRankings[stat.artist][2].pokemon.imageUrl} 
                                  alt={artistRankings[stat.artist][2].pokemon.name}
                                  className="w-24 h-24 object-contain filter drop-shadow-lg"
                                />
                                <div className="absolute -top-3 -right-3 bg-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                  3
                                </div>
                              </div>
                              <div className="bg-amber-600/20 rounded-t-lg w-28 h-12 flex items-center justify-center">
                                <span className="text-amber-400 font-bold">3rd</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Pokemon Names Below Podium */}
                          <div className="flex justify-center space-x-8 mt-4 max-w-2xl mx-auto">
                            <div className="text-center w-28">
                              <div className="text-gray-300 font-medium truncate">
                                {artistRankings[stat.artist][1].pokemon.name}
                              </div>
                              <div className="text-yellow-400 text-xs mt-1">
                                {formatAverageStars(artistRankings[stat.artist][1].pokemonId)}
                              </div>
                            </div>
                            <div className="text-center w-32">
                              <div className="text-yellow-300 font-bold text-lg truncate">
                                {artistRankings[stat.artist][0].pokemon.name}
                              </div>
                              <div className="text-yellow-400 text-sm mt-1">
                                {formatAverageStars(artistRankings[stat.artist][0].pokemonId)}
                              </div>
                            </div>
                            <div className="text-center w-28">
                              <div className="text-amber-400 font-medium truncate">
                                {artistRankings[stat.artist][2].pokemon.name}
                              </div>
                              <div className="text-yellow-400 text-xs mt-1">
                                {formatAverageStars(artistRankings[stat.artist][2].pokemonId)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {artistRankings[stat.artist].slice(3).map((ranking, index) => (
                            <div 
                              key={ranking.pokemonId} 
                              className="flex items-center justify-between bg-white/5 rounded p-3 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`
                                  flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                                  bg-white/20 text-white
                                `}>
                                  {index + 4}
                                </div>
                                <img 
                                  src={ranking.pokemon.imageUrl} 
                                  alt={ranking.pokemon.name}
                                  className="w-8 h-8 object-contain"
                                />
                                <div>
                                  <div className="text-white font-medium">
                                    {ranking.pokemon.name}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {ranking.pokemon.types.map(type => (
                                      <span 
                                        key={type}
                                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                        style={{ backgroundColor: getTypeColor(type, 0.8) }}
                                      >
                                        {type}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white/60 text-sm">
                                  Rank #{ranking.rank}
                                </div>
                                <div className="text-yellow-400 text-xs mt-1">
                                  {formatAverageStars(ranking.pokemonId)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Artist Performance Over Time Line Chart */}
                  {artistRankings[stat.artist] && artistRankings[stat.artist].length > 1 && (
                    <div className="mt-6">
                      <h5 className="text-white font-semibold mb-3 flex items-center">
                        <TrendingUp className="mr-2 text-blue-400" size={16} />
                        Performance Over Time ({artistRankings[stat.artist].length} Pokemon)
                      </h5>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="h-80">
                          {(() => {
                            // Sort Pokemon by their pokedexNumber to show chronological order
                            const sortedByTime = [...artistRankings[stat.artist]].sort((a, b) => {
                              return a.pokemon.pokedexNumber - b.pokemon.pokedexNumber;
                            });
                            
                            // Find the rank of each Pokemon within this artist's collection
                            const artistRanksMap = new Map();
                            artistRankings[stat.artist].forEach((ranking, index) => {
                              artistRanksMap.set(ranking.pokemonId, index + 1);
                            });
                            
                            return (
                              <Line 
                                data={{
                                  labels: sortedByTime.map(ranking => ranking.pokemon.name),
                                  datasets: [
                                    {
                                      label: 'Artist Rank',
                                      data: sortedByTime.map(ranking => artistRanksMap.get(ranking.pokemonId)),
                                      borderColor: 'rgba(59, 130, 246, 1)',
                                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                      borderWidth: 3,
                                      fill: true,
                                      tension: 0.4,
                                      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                                      pointBorderColor: '#ffffff',
                                      pointBorderWidth: 2,
                                      pointRadius: 6,
                                      pointHoverRadius: 8,
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
                                    tooltip: {
                                      callbacks: {
                                        title: (context: any) => {
                                          const index = context[0].dataIndex;
                                          const pokemon = sortedByTime[index].pokemon;
                                          return `${pokemon.name} (#${pokemon.pokedexNumber.toString().padStart(3, '0')})`;
                                        },
                                        label: (context: any) => {
                                          const rank = context.parsed.y;
                                          const pokemon = sortedByTime[context.dataIndex];
                                          const avgStars = formatAverageStars(pokemon.pokemonId);
                                          const globalRank = getGlobalRank(pokemon.pokemonId);
                                          return [
                                            `Artist Rank: #${rank}`, 
                                            `Global Rank: #${globalRank || 'N/A'}`,
                                            `Average Rating: ${avgStars}`
                                          ];
                                        },
                                        afterLabel: (context: any) => {
                                          const pokemon = sortedByTime[context.dataIndex].pokemon;
                                          return `Pokedex #${pokemon.pokedexNumber.toString().padStart(3, '0')}`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    y: {
                                      reverse: true, // Lower ranks (better) appear higher on chart
                                      beginAtZero: false,
                                      title: {
                                        display: true,
                                        text: 'Pokemon Rank',
                                        color: 'white',
                                        font: {
                                          size: 12,
                                        },
                                      },
                                      ticks: {
                                        color: 'white',
                                        stepSize: 1,
                                        callback: function(value) {
                                          return '#' + value;
                                        },
                                      },
                                      grid: {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                      },
                                    },
                                    x: {
                                      title: {
                                        display: true,
                                        text: 'Pokemon Names (Chronological Order)',
                                        color: 'white',
                                        font: {
                                          size: 12,
                                        },
                                      },
                                      ticks: {
                                        color: 'white',
                                        font: {
                                          size: 9,
                                        },
                                        maxRotation: 45,
                                        minRotation: 45,
                                      },
                                      grid: {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                      },
                                    },
                                  },
                                }}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Global Performance Line Chart */}
                  {artistRankings[stat.artist] && artistRankings[stat.artist].length > 1 && (
                    <div className="mt-6">
                      <h5 className="text-white font-semibold mb-3 flex items-center">
                        <Trophy className="mr-2 text-purple-400" size={16} />
                        Global Performance Over Time ({artistRankings[stat.artist].length} Pokemon)
                      </h5>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="h-80">
                          {(() => {
                            // Sort Pokemon by their pokedexNumber to show chronological order
                            const sortedByTime = [...artistRankings[stat.artist]].sort((a, b) => {
                              return a.pokemon.pokedexNumber - b.pokemon.pokedexNumber;
                            });
                            
                            return (
                              <Line 
                                data={{
                                  labels: sortedByTime.map(ranking => ranking.pokemon.name),
                                  datasets: [
                                    {
                                      label: 'Global Rank',
                                      data: sortedByTime.map(ranking => getGlobalRank(ranking.pokemonId) || totalPokemon + 1),
                                      borderColor: 'rgba(168, 85, 247, 1)', // Purple color
                                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                      borderWidth: 3,
                                      fill: true,
                                      tension: 0.4,
                                      pointBackgroundColor: 'rgba(168, 85, 247, 1)',
                                      pointBorderColor: '#ffffff',
                                      pointBorderWidth: 2,
                                      pointRadius: 6,
                                      pointHoverRadius: 8,
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
                                    tooltip: {
                                      callbacks: {
                                        title: (context: any) => {
                                          const index = context[0].dataIndex;
                                          const pokemon = sortedByTime[index].pokemon;
                                          return `${pokemon.name} (#${pokemon.pokedexNumber.toString().padStart(3, '0')})`;
                                        },
                                        label: (context: any) => {
                                          const globalRank = context.parsed.y;
                                          const pokemonData = sortedByTime[context.dataIndex];
                                          const avgStars = formatAverageStars(pokemonData.pokemonId);
                                          const artistRanksMap = new Map();
                                          artistRankings[stat.artist].forEach((ranking, index) => {
                                            artistRanksMap.set(ranking.pokemonId, index + 1);
                                          });
                                          const artistRank = artistRanksMap.get(pokemonData.pokemonId);
                                          return [
                                            `Global Rank: #${globalRank > totalPokemon ? 'Unranked' : globalRank}`,
                                            `Artist Rank: #${artistRank}`,
                                            `Average Rating: ${avgStars}`
                                          ];
                                        },
                                        afterLabel: () => {
                                          return `Out of ${totalPokemon} total Pokemon`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    y: {
                                      reverse: true, // Lower ranks (better) appear higher on chart
                                      beginAtZero: false,
                                      max: totalPokemon,
                                      title: {
                                        display: true,
                                        text: 'Global Rank (out of all Pokemon)',
                                        color: 'white',
                                        font: {
                                          size: 12,
                                        },
                                      },
                                      ticks: {
                                        color: 'white',
                                        stepSize: Math.ceil(totalPokemon / 10), // Divide into ~10 steps
                                        callback: function(value) {
                                          return '#' + value;
                                        },
                                      },
                                      grid: {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                      },
                                    },
                                    x: {
                                      title: {
                                        display: true,
                                        text: 'Pokemon Names (Chronological Order)',
                                        color: 'white',
                                        font: {
                                          size: 12,
                                        },
                                      },
                                      ticks: {
                                        color: 'white',
                                        font: {
                                          size: 9,
                                        },
                                        maxRotation: 45,
                                        minRotation: 45,
                                      },
                                      grid: {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                      },
                                    },
                                  },
                                }}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {stat.uniquePokemon === 0 && (
                    <div className="text-white/50 text-center py-4">
                      No unique Pokemon yet
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
};

export default Statistics;
