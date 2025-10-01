/**
 * Simple Test Modal - Step by Step Testing
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ForwardIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchingCandidate, MATCHING_STATUS_COLORS, CandidateRecommendation } from '@/types/matching';
import { matchingService } from '@/lib/firebase/matching-service';
import CandidateRecommendationBox from './CandidateRecommendation';

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
  const [recommendation, setRecommendation] = useState<CandidateRecommendation | null>(null);

  useEffect(() => {
    if (isOpen && candidate) {
      const rec = matchingService.getRecommendation(candidate);
      setRecommendation(rec);
      setSelectedVariantIndex(rec.recommendedIndex);
    }
  }, [isOpen, candidate]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-zinc-900 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
                Step 4: Mit Recommendation
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Kandidat: {candidate.variants[0]?.contactData.displayName || 'Unbekannt'}
            </p>

            {recommendation && (
              <CandidateRecommendationBox
                recommendation={recommendation}
                variantIndex={selectedVariantIndex}
                onSelectVariant={setSelectedVariantIndex}
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button color="light" onClick={onClose}>
              Abbrechen
            </Button>

            <Button color="red" onClick={onClose}>
              <XMarkIcon className="size-4" />
              <span>Ablehnen</span>
            </Button>

            <Button color="light" onClick={onClose}>
              <ForwardIcon className="size-4" />
              <span>Überspringen</span>
            </Button>

            <Button color="green" onClick={onClose}>
              <CheckIcon className="size-4" />
              <span>Importieren</span>
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
