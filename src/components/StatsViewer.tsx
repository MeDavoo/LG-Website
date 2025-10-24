import React, { useState, useEffect } from 'react';
import { PokemonStats } from '../types/pokemon';

interface StatsViewerProps {
  pokemonId: string;
  initialStats?: PokemonStats;
  initialAbility?: string;
  initialHiddenAbility?: string;
  onSave: (stats: PokemonStats, ability: string, hiddenAbility?: string) => Promise<void>;
  isEditMode: boolean;
  isAdmin: boolean;
  onToggleEditMode: () => void;
}

const StatsViewer: React.FC<StatsViewerProps> = ({
  pokemonId,
  initialStats,
  initialAbility,
  initialHiddenAbility,
  onSave,
  isEditMode,
  isAdmin,
  onToggleEditMode
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
  
  const [ability, setAbility] = useState<string>('');
  const [hiddenAbility, setHiddenAbility] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Initialize stats and abilities when component mounts or props change
  useEffect(() => {
    console.log('🎯 STATSVIEWER: Initializing with props:', { initialAbility, initialHiddenAbility });
    
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
    
    setAbility(initialAbility || '');
    setHiddenAbility(initialHiddenAbility || '');
    setHasChanges(false);
    setIsDataLoaded(true);
  }, [initialStats, initialAbility, initialHiddenAbility, pokemonId]);

  // Calculate total when stats change
  useEffect(() => {
    const total = stats.hp + stats.attack + stats.defense + stats.spAttack + stats.spDefense + stats.speed;
    setStats(prev => ({ ...prev, total }));
  }, [stats.hp, stats.attack, stats.defense, stats.spAttack, stats.spDefense, stats.speed]);

  // Handle stat changes
  const handleStatChange = (statName: keyof Omit<PokemonStats, 'total'>, value: number) => {
    if (!isEditMode) return;
    setStats(prev => ({ ...prev, [statName]: value }));
    setHasChanges(true);
  };

  // Handle ability changes
  const handleAbilityChange = (value: string) => {
    if (!isEditMode) return;
    setAbility(value);
    setHasChanges(true);
  };

  const handleHiddenAbilityChange = (value: string) => {
    if (!isEditMode) return;
    setHiddenAbility(value);
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!ability.trim()) {
      alert('Please enter a primary ability');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(stats, ability.trim(), hiddenAbility.trim() || undefined);
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
    if (value >= 140) return 'from-cyan-400 to-teal-500'; // Turquoise/cyan for excellent stats
    if (value >= 90) return 'from-green-400 to-green-600'; // Green for good stats
    if (value >= 70) return 'from-yellow-400 to-yellow-600'; // Yellow for decent stats
    if (value >= 50) return 'from-orange-400 to-orange-600'; // Orange for average stats
    return 'from-red-400 to-red-600'; // Red for low stats
  };

  // Get total stats color
  const getTotalColor = (total: number): string => {
    if (total >= 550) return 'text-blue-400';      // Blue for excellent totals (550+)
    if (total >= 480) return 'text-green-400';     // Strong green for great totals (480+)
    if (total >= 425) return 'text-green-300';     // Light green for good totals (425+)
    if (total >= 380) return 'text-yellow-400';    // Yellow for decent totals (380+)
    if (total >= 340) return 'text-orange-400';    // Orange for average totals (340+)
    return 'text-red-400';                         // Red only for poor totals (<340)
  };

  // Format ability name for URL (lowercase, spaces to hyphens)
  const formatAbilityForUrl = (abilityName: string): string => {
    return abilityName.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-3 space-y-3 relative">
      <style>{`
        .slider-overlay::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          border: 2px solid #374151;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .slider-overlay::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          border: 2px solid #374151;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .slider-overlay::-webkit-slider-track {
          background: transparent;
          height: 100%;
        }
        
        .slider-overlay::-moz-range-track {
          background: transparent;
          height: 100%;
        }
      `}</style>
      {/* Admin Edit Mode Toggle Button - Bottom Right */}
      {isAdmin && (
        <button
          onClick={onToggleEditMode}
          className={`absolute bottom-3 right-3 px-3 py-1.5 text-white rounded-lg transition-colors font-medium text-xs transform hover:scale-[1.02] z-10 ${
            isEditMode 
              ? 'bg-orange-500 hover:bg-orange-600' 
              : 'bg-purple-500 hover:bg-purple-600'
          }`}
        >
          {isEditMode ? '👁️ View Mode' : '✏️ Edit Mode'}
        </button>
      )}

      {/* Save Button - Only show when changes exist and in edit mode */}
      {hasChanges && isEditMode && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !ability.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* Stats Section - 7/10 of the space (70%) */}
        <div className="lg:col-span-7 space-y-3">
          <h4 className="text-lg font-semibold text-white/90">
            Stats
          </h4>
          
          <div className="space-y-1.5">
            {/* HP */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">HP</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.hp}</span>
              </div>
              {/* Progress Bar with Overlay Slider */}
              <div className="relative h-1.5 rounded-lg overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getStatColor(stats.hp)} transition-all duration-200 rounded-lg`}
                  style={{ width: `${(stats.hp / 255) * 100}%` }}
                />
                {/* Slider - Overlay on progress bar in edit mode */}
                {isEditMode && (
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={stats.hp}
                    onChange={(e) => handleStatChange('hp', parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-overlay"
                    style={{
                      background: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Attack */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">Attack</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.attack}</span>
              </div>
              {/* Progress Bar with Overlay Slider */}
              <div className="relative h-1.5 rounded-lg overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getStatColor(stats.attack)} transition-all duration-200 rounded-lg`}
                  style={{ width: `${(stats.attack / 255) * 100}%` }}
                />
                {/* Slider - Overlay on progress bar in edit mode */}
                {isEditMode && (
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={stats.attack}
                    onChange={(e) => handleStatChange('attack', parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-overlay"
                    style={{
                      background: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Defense */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">Defense</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.defense}</span>
              </div>
              {/* Progress Bar with Overlay Slider */}
              <div className="relative h-1.5 rounded-lg overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getStatColor(stats.defense)} transition-all duration-200 rounded-lg`}
                  style={{ width: `${(stats.defense / 255) * 100}%` }}
                />
                {/* Slider - Overlay on progress bar in edit mode */}
                {isEditMode && (
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={stats.defense}
                    onChange={(e) => handleStatChange('defense', parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-overlay"
                    style={{
                      background: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Special Attack */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">Sp. Attack</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.spAttack}</span>
              </div>
              {/* Progress Bar with Overlay Slider */}
              <div className="relative h-1.5 rounded-lg overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getStatColor(stats.spAttack)} transition-all duration-200 rounded-lg`}
                  style={{ width: `${(stats.spAttack / 255) * 100}%` }}
                />
                {/* Slider - Overlay on progress bar in edit mode */}
                {isEditMode && (
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={stats.spAttack}
                    onChange={(e) => handleStatChange('spAttack', parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-overlay"
                    style={{
                      background: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Special Defense */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">Sp. Defense</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.spDefense}</span>
              </div>
              {/* Progress Bar with Overlay Slider */}
              <div className="relative h-1.5 rounded-lg overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getStatColor(stats.spDefense)} transition-all duration-200 rounded-lg`}
                  style={{ width: `${(stats.spDefense / 255) * 100}%` }}
                />
                {/* Slider - Overlay on progress bar in edit mode */}
                {isEditMode && (
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={stats.spDefense}
                    onChange={(e) => handleStatChange('spDefense', parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-overlay"
                    style={{
                      background: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-white/80 font-medium text-xs">Speed</label>
                <span className="text-white font-bold text-xs min-w-[30px] text-right">{stats.speed}</span>
              </div>
              {/* Progress Bar with Overlay Slider */}
              <div className="relative h-1.5 rounded-lg overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getStatColor(stats.speed)} transition-all duration-200 rounded-lg`}
                  style={{ width: `${(stats.speed / 255) * 100}%` }}
                />
                {/* Slider - Overlay on progress bar in edit mode */}
                {isEditMode && (
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={stats.speed}
                    onChange={(e) => handleStatChange('speed', parseInt(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-overlay"
                    style={{
                      background: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Total */}
            <div className="pt-2 mt-2 border-t border-white/20">
              <div className="flex justify-between items-center">
                <label className="text-white font-semibold text-sm">Total</label>
                <span className={`font-bold text-sm ${getTotalColor(stats.total || 0)}`}>
                  {stats.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abilities Section - 3/10 of the space (30%) */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-lg font-semibold text-white/90">
            Abilities
          </h4>
          
          {/* Primary Ability */}
          <div className="space-y-1">
            <label className="text-white/80 font-medium text-xs">Primary Ability</label>
            {isEditMode ? (
              <input
                type="text"
                value={ability}
                onChange={(e) => handleAbilityChange(e.target.value)}
                placeholder="Enter primary ability..."
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              />
            ) : (
              <div className="w-full min-h-[32px] flex items-center">
                {!isDataLoaded ? (
                  <div className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs flex items-center justify-center">
                    <span className="text-white/50">Loading...</span>
                  </div>
                ) : ability ? (
                  <a
                    href={`https://pokemondb.net/ability/${formatAbilityForUrl(ability)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full p-3 bg-white/10 hover:bg-white/15 border-2 border-blue-500 hover:border-blue-400 rounded-lg text-white font-bold text-sm text-center transition-all transform hover:scale-[1.02] uppercase"
                  >
                    {ability}
                  </a>
                ) : (
                  <div className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs flex items-center justify-center">
                    <span className="text-white/50">No ability set</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hidden Ability */}
          <div className="space-y-1">
            <label className="text-white/80 font-medium text-xs">Hidden Ability</label>
            {isEditMode ? (
              <input
                type="text"
                value={hiddenAbility}
                onChange={(e) => handleHiddenAbilityChange(e.target.value)}
                placeholder="Enter hidden ability (optional)..."
                className="w-full p-2 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
              />
            ) : (
              <div className="w-full min-h-[32px] flex items-center">
                {!isDataLoaded ? (
                  <div className="w-full p-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs flex items-center justify-center">
                    <span className="text-white/50">Loading...</span>
                  </div>
                ) : hiddenAbility ? (
                  <a
                    href={`https://pokemondb.net/ability/${formatAbilityForUrl(hiddenAbility)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full p-3 bg-white/10 hover:bg-white/15 border-2 border-purple-500 hover:border-purple-400 rounded-lg text-white font-bold text-sm text-center transition-all transform hover:scale-[1.02] uppercase"
                  >
                    {hiddenAbility}
                  </a>
                ) : (
                  <div className="w-full p-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs flex items-center justify-center">
                    <span className="text-white/50">No hidden ability</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsViewer;