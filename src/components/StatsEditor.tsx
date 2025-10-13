import React, { useState, useEffect } from 'react';
import { PokemonStats, PokemonAbility, POKEMON_ABILITIES, PokemonType } from '../types/pokemon';

interface StatsEditorProps {
  pokemonId: string;
  initialStats?: PokemonStats;
  initialAbility?: PokemonAbility;
  onSave: (stats: PokemonStats, ability: PokemonAbility) => Promise<void>;
}

// Type color mapping
const getTypeColor = (type: PokemonType): string => {
  switch (type) {
    case PokemonType.NORMAL: return 'bg-gray-400';
    case PokemonType.FIRE: return 'bg-red-500';
    case PokemonType.WATER: return 'bg-blue-500';
    case PokemonType.ELECTRIC: return 'bg-yellow-400';
    case PokemonType.GRASS: return 'bg-green-500';
    case PokemonType.ICE: return 'bg-cyan-400';
    case PokemonType.FIGHTING: return 'bg-red-700';
    case PokemonType.POISON: return 'bg-purple-500';
    case PokemonType.GROUND: return 'bg-yellow-600';
    case PokemonType.FLYING: return 'bg-indigo-400';
    case PokemonType.PSYCHIC: return 'bg-pink-500';
    case PokemonType.BUG: return 'bg-green-400';
    case PokemonType.ROCK: return 'bg-yellow-700';
    case PokemonType.GHOST: return 'bg-purple-700';
    case PokemonType.DRAGON: return 'bg-indigo-700';
    case PokemonType.DARK: return 'bg-gray-800';
    case PokemonType.STEEL: return 'bg-gray-500';
    case PokemonType.FAIRY: return 'bg-pink-300';
    default: return 'bg-gray-400';
  }
};

// Sort abilities by type order
const sortedAbilities = POKEMON_ABILITIES.sort((a, b) => {
  const typeOrder = [
    PokemonType.NORMAL, PokemonType.FIRE, PokemonType.WATER, PokemonType.ELECTRIC,
    PokemonType.GRASS, PokemonType.ICE, PokemonType.FIGHTING, PokemonType.POISON,
    PokemonType.GROUND, PokemonType.FLYING, PokemonType.PSYCHIC, PokemonType.BUG,
    PokemonType.ROCK, PokemonType.GHOST, PokemonType.DRAGON, PokemonType.DARK,
    PokemonType.STEEL, PokemonType.FAIRY
  ];
  
  const aIndex = typeOrder.indexOf(a.type);
  const bIndex = typeOrder.indexOf(b.type);
  
  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }
  
  return a.name.localeCompare(b.name);
});

const StatsEditor: React.FC<StatsEditorProps> = ({
  pokemonId,
  initialStats,
  initialAbility,
  onSave
}) => {
  const [stats, setStats] = useState<PokemonStats>({
    hp: 50,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    speed: 50,
    total: 300
  });
  
  const [selectedAbility, setSelectedAbility] = useState<PokemonAbility | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.ability-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Initialize stats and ability when component mounts or props change
  useEffect(() => {
    // Always reset to defaults first
    const defaultStats = {
      hp: 50,
      attack: 50,
      defense: 50,
      spAttack: 50,
      spDefense: 50,
      speed: 50,
      total: 300
    };
    
    if (initialStats) {
      const newStats = {
        ...initialStats,
        total: initialStats.hp + initialStats.attack + initialStats.defense + 
               initialStats.spAttack + initialStats.spDefense + initialStats.speed
      };
      setStats(newStats);
    } else {
      setStats(defaultStats);
    }
    
    if (initialAbility) {
      setSelectedAbility(initialAbility);
    } else {
      setSelectedAbility(null);
    }
    
    setHasChanges(false);
  }, [initialStats, initialAbility, pokemonId]);

  // Calculate total when stats change
  useEffect(() => {
    const total = stats.hp + stats.attack + stats.defense + stats.spAttack + stats.spDefense + stats.speed;
    setStats(prev => ({ ...prev, total }));
  }, [stats.hp, stats.attack, stats.defense, stats.spAttack, stats.spDefense, stats.speed]);

  // Handle stat changes
  const handleStatChange = (statName: keyof Omit<PokemonStats, 'total'>, value: number) => {
    setStats(prev => ({ ...prev, [statName]: value }));
    setHasChanges(true);
  };

  // Handle ability selection
  const handleAbilityChange = (ability: PokemonAbility) => {
    setSelectedAbility(ability);
    setHasChanges(true);
    setIsDropdownOpen(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedAbility) {
      alert('Please select an ability');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(stats, selectedAbility);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving stats:', error);
      alert('Failed to save stats. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get stat color based on value
  const getStatColor = (value: number): string => {
    if (value >= 90) return 'from-green-500 to-green-600';
    if (value >= 70) return 'from-yellow-500 to-yellow-600';
    if (value >= 50) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  // Get total stats color
  const getTotalColor = (total: number): string => {
    if (total >= 540) return 'text-green-400';
    if (total >= 480) return 'text-yellow-400';
    if (total >= 420) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-3 space-y-3">
      {/* Save Button - Only show when changes exist */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedAbility}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isSaving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ overflow: 'visible' }}>
        {/* Stats Section - Takes 2/3 of the space */}
        <div className="lg:col-span-2 space-y-2">
          <h4 className="text-sm font-semibold text-white/90 mb-2">Stats</h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* HP */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">HP</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.hp}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="255"
                  value={stats.hp}
                  onChange={(e) => handleStatChange('hp', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r ${getStatColor(stats.hp)} rounded-lg transition-all duration-200`}
                  style={{ width: `${(stats.hp / 255) * 100}%` }}
                />
              </div>
            </div>

            {/* Attack */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">ATK</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.attack}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="255"
                  value={stats.attack}
                  onChange={(e) => handleStatChange('attack', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r ${getStatColor(stats.attack)} rounded-lg transition-all duration-200`}
                  style={{ width: `${(stats.attack / 255) * 100}%` }}
                />
              </div>
            </div>

            {/* Defense */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">DEF</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.defense}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="255"
                  value={stats.defense}
                  onChange={(e) => handleStatChange('defense', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r ${getStatColor(stats.defense)} rounded-lg transition-all duration-200`}
                  style={{ width: `${(stats.defense / 255) * 100}%` }}
                />
              </div>
            </div>

            {/* Special Attack */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">SP.A</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.spAttack}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="255"
                  value={stats.spAttack}
                  onChange={(e) => handleStatChange('spAttack', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r ${getStatColor(stats.spAttack)} rounded-lg transition-all duration-200`}
                  style={{ width: `${(stats.spAttack / 255) * 100}%` }}
                />
              </div>
            </div>

            {/* Special Defense */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">SP.D</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.spDefense}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="255"
                  value={stats.spDefense}
                  onChange={(e) => handleStatChange('spDefense', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r ${getStatColor(stats.spDefense)} rounded-lg transition-all duration-200`}
                  style={{ width: `${(stats.spDefense / 255) * 100}%` }}
                />
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">SPD</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.speed}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="255"
                  value={stats.speed}
                  onChange={(e) => handleStatChange('speed', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r ${getStatColor(stats.speed)} rounded-lg transition-all duration-200`}
                  style={{ width: `${(stats.speed / 255) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="pt-2 mt-2 border-t border-white/10">
            <div className="flex justify-between items-center">
              <label className="text-white font-semibold text-sm">Total</label>
              <span className={`font-bold ${getTotalColor(stats.total || 0)}`}>
                {stats.total}
              </span>
            </div>
          </div>
        </div>

        {/* Abilities Section - Takes 1/3 of the space */}
        <div className="space-y-2" style={{ overflow: 'visible', position: 'relative', zIndex: 1000 }}>
          <h4 className="text-sm font-semibold text-white/90">Ability</h4>
          
          {/* Custom Dropdown */}
          <div className="relative ability-dropdown" style={{ overflow: 'visible' }}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs text-left flex items-center justify-between"
            >
              {selectedAbility ? (
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded-full ${getTypeColor(selectedAbility.type)} text-white font-bold text-xs uppercase`}>
                    {selectedAbility.type}
                  </span>
                  <span>{selectedAbility.name}</span>
                </div>
              ) : (
                <span className="text-white/50">Select ability...</span>
              )}
              <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <>
                {/* Invisible backdrop to catch clicks */}
                <div 
                  className="fixed inset-0 z-[99998]" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ pointerEvents: 'auto' }}
                />
                {/* Dropdown menu */}
                <div 
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-xl max-h-48 overflow-y-auto" 
                  style={{ 
                    zIndex: 99999,
                    backgroundColor: '#1f2937',
                    pointerEvents: 'auto',
                    position: 'absolute'
                  }}
                >
                  {sortedAbilities.map(ability => (
                    <button
                      key={ability.id}
                      type="button"
                      onClick={() => handleAbilityChange(ability)}
                      className="w-full p-2 text-left hover:bg-white/10 focus:bg-white/10 focus:outline-none text-xs flex items-center gap-2 text-white"
                      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
                    >
                      <span className={`px-1.5 py-0.5 rounded-full ${getTypeColor(ability.type)} text-white font-bold text-xs flex-shrink-0 uppercase`}>
                        {ability.type}
                      </span>
                      <span>{ability.name}</span>
                    </button>
                ))}
                </div>
              </>
            )}
          </div>

          {selectedAbility && (
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              <h5 className="font-semibold text-white mb-1 text-xs flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded-full ${getTypeColor(selectedAbility.type)} text-white font-bold text-xs uppercase`}>
                  {selectedAbility.type}
                </span>
                {selectedAbility.name}
              </h5>
              <p className="text-white/80 text-xs leading-relaxed">
                {selectedAbility.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsEditor;