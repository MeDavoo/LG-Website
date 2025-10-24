import React, { useState, useEffect } from 'react';

interface EvolutionEditorProps {
  pokemonId: string;
  pokemonName: string;
  initialMethod?: string;
  isEditMode: boolean;
  onSave: (pokemonId: string, method: string) => Promise<void>;
}

const EvolutionEditor: React.FC<EvolutionEditorProps> = ({
  pokemonId,
  pokemonName,
  initialMethod,
  isEditMode,
  onSave
}) => {
  const [method, setMethod] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize method when props change
  useEffect(() => {
    setMethod(initialMethod || '');
    setHasChanges(false);
  }, [initialMethod, pokemonId]);

  // Handle method change
  const handleMethodChange = (value: string) => {
    if (!isEditMode) return;
    setMethod(value);
    setHasChanges(value !== (initialMethod || ''));
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(pokemonId, method);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving evolution method:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-1 min-w-0">
      {/* Save Button - Only show when changes exist and in edit mode */}
      {hasChanges && isEditMode && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSaving ? 'Saving...' : '💾'}
        </button>
      )}

      {/* Evolution Method Display/Edit */}
      {isEditMode ? (
        <textarea
          value={method}
          onChange={(e) => handleMethodChange(e.target.value)}
          placeholder={`Evolution method for ${pokemonName}...`}
          className="w-full min-w-16 max-w-20 p-1 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs resize-none"
          rows={2}
        />
      ) : (
        <div className="text-xs text-white/70 text-center min-h-8 flex items-center justify-center max-w-20 break-words leading-tight">
          {method && (
            <span>{method}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default EvolutionEditor;