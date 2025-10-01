/**
 * Simple Test Modal - Testing CandidateVariantCard
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { MatchingCandidate } from '@/types/matching';
import CandidateVariantCard from './CandidateVariantCard';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: MatchingCandidate;
}

export default function SimpleModal({
  isOpen,
  onClose,
  candidate
}: SimpleModalProps) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-4xl w-full max-h-[90vh] rounded-lg bg-white dark:bg-zinc-900 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
              {candidate.variants[0]?.contactData.displayName || 'Kandidat'}
            </DialogTitle>

            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <XMarkIcon className="size-5 text-zinc-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Test: Rendering CandidateVariantCard
            </p>

            <div className="space-y-4">
              {candidate.variants.map((variant, index) => (
                <CandidateVariantCard
                  key={index}
                  variant={variant}
                  index={index}
                  isSelected={selectedVariantIndex === index}
                  isRecommended={false}
                  onSelect={() => setSelectedVariantIndex(index)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button color="light" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
