import { BeakerIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ExpertModeIndicatorProps {
  hasDNASynthese: boolean;
  hasKernbotschaft: boolean;
}

export function ExpertModeIndicator({
  hasDNASynthese,
  hasKernbotschaft,
}: ExpertModeIndicatorProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2 text-purple-700 font-medium mb-2">
        <BeakerIcon className="h-4 w-4" />
        Experten-Modus aktiv
      </div>
      <ul className="space-y-1 text-purple-600">
        {hasDNASynthese && (
          <li className="flex items-center gap-1">
            <CheckIcon className="h-3 w-3" />
            DNA Synthese wird verwendet
          </li>
        )}
        {hasKernbotschaft && (
          <li className="flex items-center gap-1">
            <CheckIcon className="h-3 w-3" />
            Kernbotschaft wird verwendet
          </li>
        )}
      </ul>
    </div>
  );
}
