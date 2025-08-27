import { Link } from 'react-router-dom';
import { Heart, User } from 'lucide-react';
import { Pokemon } from '../types/pokemon';

interface PokemonCardProps {
  pokemon: Pokemon;
}

const PokemonCard = ({ pokemon }: PokemonCardProps) => {
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

  return (
    <Link to={`/pokemon/${pokemon.id}`} className="group">
      <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:bg-white/20 transition-all duration-300 pokemon-card">
        {/* Image */}
        <div className="aspect-square overflow-hidden">
          <img
            src={pokemon.imageUrl}
            alt={pokemon.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-bold text-lg mb-2 group-hover:text-yellow-300 transition-colors">
            {pokemon.name}
          </h3>
          
          {/* Types */}
          <div className="flex flex-wrap gap-1 mb-3">
            {pokemon.types.map((type) => (
              <span
                key={type}
                className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getTypeColor(type)}`}
              >
                {type.toUpperCase()}
              </span>
            ))}
          </div>
          
          {/* Artist and Likes */}
          <div className="flex items-center justify-between text-sm text-white/70">
            <div className="flex items-center space-x-1">
              <User size={14} />
              <span>{pokemon.artist}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart size={14} />
              <span>{pokemon.likes}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PokemonCard;
