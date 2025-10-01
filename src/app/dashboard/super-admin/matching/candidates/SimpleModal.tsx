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
        <DialogPanel className="mx-auto max-w-4xl w-full max-h-[90vh] rounded-lg bg-white dark:bg-zinc-900 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
                Step 5: Mit VariantCards
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

          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Kandidat: {candidate.variants[0]?.contactData.displayName || 'Unbekannt'}
            </p>

            {recommendation && (
              <div className="mb-6">
                <CandidateRecommendationBox
                  recommendation={recommendation}
                  variantIndex={selectedVariantIndex}
                  onSelectVariant={setSelectedVariantIndex}
                />
              </div>
            )}

            <div className="space-y-4">
              {candidate.variants.map((variant, index) => (
                <CandidateVariantCard
                  key={index}
                  variant={variant}
                  index={index}
                  isSelected={selectedVariantIndex === index}
                  isRecommended={recommendation?.recommendedIndex === index}
                  onSelect={() => setSelectedVariantIndex(index)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-zinc-200 dark:border-zinc-800">
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
