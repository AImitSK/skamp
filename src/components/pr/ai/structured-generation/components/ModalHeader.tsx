// src/components/pr/ai/structured-generation/components/ModalHeader.tsx
/**
 * Modal Header Component
 *
 * Zeigt den Header des Generierungs-Modals mit Titel,
 * Subtitle und Close-Button an.
 */

'use client';

import React from 'react';
import { DialogTitle } from '@headlessui/react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

/**
 * Props für ModalHeader Component
 */
export interface ModalHeaderProps {
  /** Callback für Modal schließen */
  onClose: () => void;
}

/**
 * ModalHeader Component
 *
 * Zeigt den Header des KI-Generierungs-Modals an.
 *
 * **Layout:**
 * - Links: Sparkles-Icon + Titel + Subtitle
 * - Rechts: Close-Button (X-Icon)
 * - Gradient-Hintergrund (Indigo → Purple)
 *
 * **Features:**
 * - Hover-Effekt auf Close-Button
 * - Shadow auf Icon-Container
 * - Responsive Padding
 *
 * @param props - Component Props
 *
 * @example
 * ```tsx
 * <ModalHeader onClose={() => setIsOpen(false)} />
 * ```
 */
function ModalHeader({ onClose }: ModalHeaderProps) {
  const t = useTranslations('pr.ai.structuredGeneration.header');

  return (
    <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <SparklesIcon className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <DialogTitle className="text-lg font-semibold">
            {t('title')}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('subtitle')}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default React.memo(ModalHeader);
