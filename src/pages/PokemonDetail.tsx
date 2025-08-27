import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Heart, User, Calendar, MessageCircle } from 'lucide-react';
import { Pokemon } from '../types/pokemon';

const PokemonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for development
    const mockPokemon: Pokemon = {
      id: id || '1',
      name: 'Flamewyrm',
      types: ['fire', 'dragon'] as any,
      artist: 'David',
      imageUrl: 'https://via.placeholder.com/500x500/ef4444/ffffff?text=Flamewyrm',
      description: 'A majestic fire dragon Pokemon with crystalline wings that shimmer in the sunlight. Known for its fierce loyalty and protective nature.',
      stats: {
        hp: 85,
        attack: 120,
        defense: 95,
        speed: 100
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 42,
      comments: [
        {
          id: '1',
          author: 'Sarah',
          content: 'Amazing artwork! Love the detail in the wings.',
          createdAt: new Date()
        },
        {
          id: '2',
          author: 'Mike',
          content: 'This is so cool! The fire effects are incredible.',
          createdAt: new Date()
        }
      ]
    };

    setPokemon(mockPokemon);
    setLoading(false);
  }, [id]);

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      normal: 'bg-gray-400',
      fire: 'bg-red-500',
      water: 'bg-blue-500',
      electric: 'bg-yellow-400',
      grass: 'bg-green-500',
      ice: 'bg-cyan-400',
      fighting: 'bg-red-700',
      poison: 'bg-purple-500',
      ground: 'bg-yellow-600',
      flying: 'bg-indigo-400',
      psychic: 'bg-pink-500',
      bug: 'bg-green-400',
      rock: 'bg-yellow-800',
      ghost: 'bg-purple-700',
      dragon: 'bg-indigo-700',
      dark: 'bg-gray-800',
      steel: 'bg-gray-500',
      fairy: 'bg-pink-300'
    };
    return colors[type] || 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!pokemon) {
    return (
      <div className="text-center py-16">
        <p className="text-white text-lg">Pokemon not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20">
          <img
            src={pokemon.imageUrl}
            alt={pokemon.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">{pokemon.name}</h1>
            
            {/* Types */}
            <div className="flex flex-wrap gap-2 mb-6">
              {pokemon.types.map((type) => (
                <span
                  key={type}
                  className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${getTypeColor(type)}`}
                >
                  {type.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-white/80 text-lg leading-relaxed mb-6">
              {pokemon.description}
            </p>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-2 text-white/70">
                <User size={20} />
                <span>Artist: {pokemon.artist}</span>
              </div>
              <div className="flex items-center space-x-2 text-white/70">
                <Heart size={20} />
                <span>{pokemon.likes} likes</span>
              </div>
              <div className="flex items-center space-x-2 text-white/70">
                <Calendar size={20} />
                <span>Created: {pokemon.createdAt.toDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-white/70">
                <MessageCircle size={20} />
                <span>{pokemon.comments.length} comments</span>
              </div>
            </div>

            {/* Stats */}
            {pokemon.stats && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Stats</h3>
                <div className="space-y-4">
                  {Object.entries(pokemon.stats).map(([stat, value]) => (
                    <div key={stat}>
                      <div className="flex justify-between text-white mb-1">
                        <span className="capitalize">{stat}</span>
                        <span>{value}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(value / 150) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-12 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-2xl font-bold text-white mb-6">Comments</h3>
        
        {pokemon.comments.length === 0 ? (
          <p className="text-white/60">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-4">
            {pokemon.comments.map((comment) => (
              <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{comment.author}</span>
                  <span className="text-white/60 text-sm">{comment.createdAt.toDateString()}</span>
                </div>
                <p className="text-white/80">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PokemonDetail;
