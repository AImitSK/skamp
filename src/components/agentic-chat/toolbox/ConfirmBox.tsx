'use client';

// src/components/agentic-chat/toolbox/ConfirmBox.tsx
// Bestätigungs-Dialog für User-Freigaben

import { CheckIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { ConfirmBoxProps } from './types';

/**
 * ConfirmBox
 *
 * Zeigt eine Bestätigungs-Box mit Zusammenfassung.
 * Wird durch skill_confirm.requestApproval() gesteuert.
 *
 * Buttons:
 * - [Ja]: Bestätigt und finalisiert das Dokument
 * - [Anpassen]: Schließt die Box und erlaubt weitere Eingaben
 */
export function ConfirmBox({ title, summaryItems, onConfirm, onAdjust, isLoading = false }: ConfirmBoxProps) {
  return (
    <div className="bg-white border-2 border-primary/20 rounded-lg p-5 mb-4 shadow-sm">
      {/* Header */}
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">
        {title}
      </h3>

      {/* Summary Table */}
      <div className="bg-zinc-50 rounded-lg p-4 mb-5">
        <dl className="space-y-2">
          {summaryItems.map((item) => (
            <div key={item.key} className="flex">
              <dt className="w-1/3 text-sm font-medium text-zinc-500">
                {item.key}
              </dt>
              <dd className="w-2/3 text-sm text-zinc-900">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onAdjust}
          disabled={isLoading}
          className="
            inline-flex items-center gap-2 px-4 h-10
            text-sm font-medium text-zinc-700
            bg-white border border-zinc-300 rounded-lg
            hover:bg-zinc-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <PencilIcon className="w-4 h-4" />
          Anpassen
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="
            inline-flex items-center gap-2 px-5 h-10
            text-sm font-medium text-white
            bg-primary hover:bg-primary-hover rounded-lg
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Wird gespeichert...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              Ja, abschließen
            </>
          )}
        </button>
      </div>
    </div>
  );
}
