/**
 * Simple Test Modal - Step by Step Testing
 */

'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchingCandidate, MATCHING_STATUS_COLORS } from '@/types/matching';

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
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-zinc-900 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
                Step 2: Mit Badges
              </DialogTitle>

              <Badge color={MATCHING_STATUS_COLORS[candidate.status]}>
                {candidate.status}
              </Badge>

              <Badge color="blue">
                {`Score: ${candidate.score} / 100`}
              </Badge>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <XMarkIcon className="size-5 text-zinc-500" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Kandidat: {candidate.variants[0]?.contactData.displayName || 'Unbekannt'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button color="light" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
