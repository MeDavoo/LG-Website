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
import { Users, Image, Palette } from 'lucide-react';
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

  // Individual artist stats with unique Pokemon focus
  const artistStats: ArtistStats[] = Object.keys(artistCount).map(artist => {
    const artistPokemon = pokemonData.filter(p => p.artist === artist);
    const artistUnique = artistPokemon.filter(p => p.unique && ['U0', 'U1', 'U2'].includes(p.unique));
    
    // Type distribution for this artist's unique Pokemon only
    const uniqueTypeDistribution: { [key: string]: number } = {};
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
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
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
        <h1 className="text-4xl font-bold text-white mb-4">LGDEX Statistics</h1>
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
          <div className="text-3xl font-bold text-white mb-1">{Object.keys(typeCount).length}</div>
          <div className="text-white/70 text-sm">Unique Types</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Type Distribution */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Pokemon Types Distribution</h3>
          <div className="h-80">
            <Doughnut data={typeChartData} options={doughnutOptions} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {artistStats.map((stat) => (
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

              {/* Unique Pokemon Type Distribution Chart */}
              {stat.uniquePokemon > 0 && (
                <div>
                  <h5 className="text-white font-semibold mb-3">Unique Pokemon Type Distribution</h5>
                  <div className="h-48">
                    <Bar 
                      data={{
                        labels: Object.keys(stat.uniqueTypeDistribution),
                        datasets: [
                          {
                            label: 'Unique Pokemon Count',
                            data: Object.values(stat.uniqueTypeDistribution),
                            backgroundColor: Object.keys(stat.uniqueTypeDistribution).map(type => getTypeColor(type)),
                            borderColor: Object.keys(stat.uniqueTypeDistribution).map(type => getTypeColor(type, 1)),
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          ...chartOptions.scales,
                          y: {
                            ...chartOptions.scales.y,
                            beginAtZero: true,
                            ticks: {
                              ...chartOptions.scales.y.ticks,
                              stepSize: 1,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
              
              {stat.uniquePokemon === 0 && (
                <div className="text-white/50 text-center py-4">
                  No unique Pokemon yet
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Statistics;
