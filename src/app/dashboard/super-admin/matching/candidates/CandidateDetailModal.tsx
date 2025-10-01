/**
 * Candidate Detail Modal Komponente
 *
 * Modal für Kandidaten-Details mit allen Features
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ForwardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextArea } from '@/components/ui/textarea';
import { MatchingCandidate, MATCHING_STATUS_COLORS, CandidateRecommendation } from '@/types/matching';
import { matchingService } from '@/lib/firebase/matching-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import toast from 'react-hot-toast';
import CandidateRecommendationBox from './CandidateRecommendation';
import CandidateVariantCard from './CandidateVariantCard';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: MatchingCandidate;
  onUpdate: () => void;
}

export default function CandidateDetailModal({
  isOpen,
  onClose,
  candidate,
  onUpdate
}: CandidateDetailModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [recommendation, setRecommendation] = useState<CandidateRecommendation | null>(null);

  useEffect(() => {
    if (isOpen && candidate) {
      const rec = matchingService.getRecommendation(candidate);
      setRecommendation(rec);
      setSelectedVariantIndex(rec.recommendedIndex);
      setReviewNotes('');
    }
  }, [isOpen, candidate]);

  const handleImport = async () => {
    if (!user || !currentOrganization) {
      toast.error('Nicht eingeloggt oder keine Organisation');
      return;
    }
    if (!confirm('Kandidat als Premium-Journalist importieren?')) return;

    const toastId = toast.loading('Importiere Kandidat...');
    try {
      setActionLoading(true);
      const result = await matchingService.importCandidate({
        candidateId: candidate.id!,
        selectedVariantIndex,
        userId: user.uid,
        organizationId: currentOrganization.id
      });

      if (result.success) {
        toast.success('Kandidat erfolgreich importiert!', { id: toastId, duration: 5000 });
        onUpdate();
        onClose();
      } else {
        toast.error(`Fehler: ${result.error}`, { id: toastId });
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Import fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) {
      toast.error('Nicht eingeloggt');
      return;
    }
    const toastId = toast.loading('Überspringe Kandidat...');
    try {
      setActionLoading(true);
      await matchingService.skipCandidate({
        candidateId: candidate.id!,
        userId: user.uid,
        reason: reviewNotes || 'Manually skipped'
      });
      toast.success('Kandidat übersprungen', { id: toastId });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Skip failed:', error);
      toast.error('Fehler beim Überspringen', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user) {
      toast.error('Nicht eingeloggt');
      return;
    }
    if (!reviewNotes.trim()) {
      toast.error('Bitte gib einen Grund für die Ablehnung an.');
      return;
    }
    if (!confirm('Kandidat ablehnen?')) return;

    const toastId = toast.loading('Lehne Kandidat ab...');
    try {
      setActionLoading(true);
      await matchingService.rejectCandidate({
        candidateId: candidate.id!,
        userId: user.uid,
        reason: reviewNotes
      });
      toast.success('Kandidat abgelehnt', { id: toastId });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Reject failed:', error);
      toast.error('Fehler beim Ablehnen', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-4xl w-full max-h-[90vh] rounded-lg bg-white dark:bg-zinc-900 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
                {candidate.variants[0]?.contactData.displayName || 'Kandidat'}
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

            {candidate.status === 'pending' && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  <span>Notizen (optional)</span>
                </label>
                <TextArea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Notizen zum Review (z.B. Grund für Skip/Reject)..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button color="light" onClick={onClose} disabled={actionLoading}>
              <span>Abbrechen</span>
            </Button>

            {candidate.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button color="red" onClick={handleReject} disabled={actionLoading}>
                  <XMarkIcon className="size-4" />
                  <span>Ablehnen</span>
                </Button>

                <Button color="light" onClick={handleSkip} disabled={actionLoading}>
                  <ForwardIcon className="size-4" />
                  <span>Überspringen</span>
                </Button>

                {actionLoading ? (
                  <Button color="green" disabled={true}>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    <span>Importiere...</span>
                  </Button>
                ) : (
                  <Button color="green" onClick={handleImport}>
                    <CheckIcon className="size-4" />
                    <span>Als Premium importieren</span>
                  </Button>
                )}
              </div>
            )}

            {candidate.status !== 'pending' && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <span>Dieser Kandidat wurde bereits reviewt.</span>
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
