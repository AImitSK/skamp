import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export type ToneOption = 'formal' | 'casual' | 'modern' | null;

interface ToneOverrideSelectProps {
  defaultTone: string | null;
  onToneChange: (tone: ToneOption) => void;
}

export function ToneOverrideSelect({
  defaultTone,
  onToneChange,
}: ToneOverrideSelectProps) {
  const t = useTranslations('assistant');
  const [showWarning, setShowWarning] = useState(false);

  const handleToneChange = (tone: ToneOption) => {
    if (tone && tone !== defaultTone) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    onToneChange(tone);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-zinc-700">
        {t('tone.label')}
        {defaultTone && (
          <span className="ml-2 text-xs text-zinc-500">
            ({t('tone.dnaLabel')}: {defaultTone})
          </span>
        )}
      </label>

      <select
        onChange={(e) =>
          handleToneChange((e.target.value as ToneOption) || null)
        }
        className="block w-full rounded-lg border border-zinc-300 bg-white
                   px-3 py-2 text-sm h-10
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">{t('tone.options.inherit')}</option>
        <option value="formal">{t('tone.options.formal')}</option>
        <option value="casual">{t('tone.options.casual')}</option>
        <option value="modern">{t('tone.options.modern')}</option>
      </select>

      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-800">
              <strong>{t('tone.warning.title')}:</strong>{' '}
              {t('tone.warning.message')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
