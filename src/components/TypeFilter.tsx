import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PokemonType } from '../types/pokemon';

interface TypeFilterProps {
  selectedTypes: PokemonType[];
  onTypesChange: (types: PokemonType[]) => void;
}

const TypeFilter = ({ selectedTypes, onTypesChange }: TypeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const allTypes = Object.values(PokemonType);

  const toggleType = (type: PokemonType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        <span>
          {selectedTypes.length === 0 
            ? 'Filter by Type' 
            : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`
          }
        </span>
        <ChevronDown 
          size={20} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/90 backdrop-blur-md border border-white/30 rounded-lg p-2 z-10 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1">
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-yellow-400 text-black'
                    : 'hover:bg-white/20 text-gray-800'
                }`}
              >
                <span 
                  className={`w-3 h-3 rounded-full ${getTypeColor(type)}`}
                ></span>
                <span className="text-sm font-medium">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </button>
            ))}
          </div>
          
          {selectedTypes.length > 0 && (
            <button
              onClick={() => onTypesChange([])}
              className="w-full mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TypeFilter;
