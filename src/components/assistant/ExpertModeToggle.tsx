import { BeakerIcon } from '@heroicons/react/24/outline';

interface ExpertModeToggleProps {
  mode: 'standard' | 'expert';
  onModeChange: (mode: 'standard' | 'expert') => void;
  hasDNASynthese: boolean;
}

export function ExpertModeToggle({
  mode,
  onModeChange,
  hasDNASynthese,
}: ExpertModeToggleProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-zinc-700 mb-2">
        Modus
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('standard')}
          className={`flex-1 h-10 px-6 rounded-lg font-medium whitespace-nowrap transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
            ${
              mode === 'standard'
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
        >
          Standard
        </button>
        <button
          onClick={() => onModeChange('expert')}
          disabled={!hasDNASynthese}
          title={
            !hasDNASynthese
              ? 'Erstellen Sie zuerst eine DNA Synthese'
              : undefined
          }
          className={`flex-1 h-10 px-6 rounded-lg font-medium whitespace-nowrap transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
            ${
              mode === 'expert'
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }
            ${!hasDNASynthese ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <BeakerIcon className="h-4 w-4 inline-block mr-2" />
          Experte
        </button>
      </div>
    </div>
  );
}
