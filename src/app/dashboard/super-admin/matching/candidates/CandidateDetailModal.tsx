/**
 * Candidate Detail Modal Komponente
 *
 * Modal für Kandidaten-Details mit:
 * - Varianten-Auswahl
 * - Empfehlungs-System
 * - Import/Skip/Reject Actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  XMarkIcon,
  CheckIcon,
  ForwardIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextArea } from '@/components/ui/textarea';
import { matchingService } from '@/lib/firebase/matching-service';
import {
  MatchingCandidate,
  CandidateRecommendation,
  MATCHING_STATUS_COLORS
} from '@/types/matching';
import CandidateVariantCard from './CandidateVariantCard';
import CandidateRecommendationBox from './CandidateRecommendation';

interface CandidateDetailModalProps {
  candidate: MatchingCandidate;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CandidateDetailModal({
  candidate,
  isOpen,
  onClose,
  onUpdate
}: CandidateDetailModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [recommendation, setRecommendation] = useState<CandidateRecommendation | null>(null);

  /**
   * Lädt Empfehlung beim Öffnen
   */
  useEffect(() => {
    if (isOpen && candidate) {
      const rec = matchingService.getRecommendation(candidate);
      setRecommendation(rec);
      setSelectedVariantIndex(rec.recommendedIndex);
      setReviewNotes('');
    }
  }, [isOpen, candidate]);

  /**
   * Import-Aktion
   */
  const handleImport = async () => {
    if (!user) {
      toast.error('Nicht eingeloggt');
      return;
    }
    if (!currentOrganization) {
      toast.error('Keine Organisation ausgewählt');
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
        toast.success(
          'Kandidat erfolgreich als Premium-Journalist importiert!',
          { id: toastId, duration: 5000 }
        );
        onUpdate();
        onClose();
      } else {
        toast.error(
          `Fehler beim Import: ${result.error}`,
          { id: toastId }
        );
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(
        `Import fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Skip-Aktion
   */
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

  /**
   * Reject-Aktion
   */
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

  const selectedVariant = candidate.variants[selectedVariantIndex];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-5xl w-full max-h-[90vh] rounded-lg bg-white dark:bg-zinc-900 shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {selectedVariant.contactData.displayName}
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
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <XMarkIcon className="size-5 text-zinc-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {`${candidate.variants.length} Varianten aus verschiedenen Organisationen`}
              </p>
            </div>

            {/* Empfehlung */}
            {recommendation && (
              <div className="mb-6">
                <CandidateRecommendationBox
                  recommendation={recommendation}
                  variantIndex={selectedVariantIndex}
                  onSelectVariant={setSelectedVariantIndex}
                />
              </div>
            )}

            {/* Varianten */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="size-5 text-blue-600" />
                Gefundene Varianten
              </h2>

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

            {/* Review-Notizen */}
            {candidate.status === 'pending' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Notizen (optional)
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

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              color="light"
              onClick={onClose}
              disabled={actionLoading}
            >
              Abbrechen
            </Button>

            {candidate.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button
                  color="red"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  <XMarkIcon className="size-4" />
                  <span>Ablehnen</span>
                </Button>

                <Button
                  color="light"
                  onClick={handleSkip}
                  disabled={actionLoading}
                >
                  <ForwardIcon className="size-4" />
                  <span>Überspringen</span>
                </Button>

                {actionLoading ? (
                  <Button
                    color="green"
                    disabled={true}
                  >
                    <ArrowPathIcon className="size-4 animate-spin" />
                    <span>Importiere...</span>
                  </Button>
                ) : (
                  <Button
                    color="green"
                    onClick={handleImport}
                  >
                    <CheckIcon className="size-4" />
                    <span>Als Premium importieren</span>
                  </Button>
                )}
              </div>
            )}

            {candidate.status !== 'pending' && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Dieser Kandidat wurde bereits reviewt.
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
