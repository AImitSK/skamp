/**
 * Candidate Detail Modal Komponente
 *
 * Zeigt detaillierte Informationen über einen Kandidaten:
 * - Alle Varianten aus verschiedenen Organisationen
 * - Varianten-Vergleich
 * - Empfehlung welche Variante die beste ist
 * - Import-Flow mit Daten-Override
 * - Review-Aktionen (Import, Skip, Reject)
 */

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  CheckIcon,
  ForwardIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
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
  candidate: MatchingCandidate | null;
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
  // State
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<CandidateRecommendation | null>(null);

  /**
   * Lädt Empfehlung
   */
  useEffect(() => {
    if (candidate) {
      const rec = matchingService.getRecommendation(candidate);
      setRecommendation(rec);
      setSelectedVariantIndex(rec.recommendedIndex);
    }
  }, [candidate]);

  /**
   * Reset beim Schließen
   */
  const handleClose = () => {
    setSelectedVariantIndex(0);
    setReviewNotes('');
    setLoading(false);
    onClose();
  };

  /**
   * Import-Aktion
   */
  const handleImport = async () => {
    if (!candidate) return;

    if (!confirm('Kandidat als Premium-Journalist importieren?')) return;

    const toastId = toast.loading('Importiere Kandidat...');

    try {
      setLoading(true);

      const result = await matchingService.importCandidate({
        candidateId: candidate.id!,
        selectedVariantIndex,
        userId: 'current-user' // TODO: Get from auth
      });

      if (result.success) {
        toast.success(
          'Kandidat erfolgreich als Premium-Journalist importiert!',
          { id: toastId, duration: 5000 }
        );
        onUpdate();
        handleClose();
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
      setLoading(false);
    }
  };

  /**
   * Skip-Aktion
   */
  const handleSkip = async () => {
    if (!candidate) return;

    const toastId = toast.loading('Überspringe Kandidat...');

    try {
      setLoading(true);

      await matchingService.skipCandidate({
        candidateId: candidate.id!,
        userId: 'current-user', // TODO: Get from auth
        reason: reviewNotes || 'Manually skipped'
      });

      toast.success('Kandidat übersprungen', { id: toastId });
      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Skip failed:', error);
      toast.error('Fehler beim Überspringen', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reject-Aktion
   */
  const handleReject = async () => {
    if (!candidate) return;

    if (!reviewNotes.trim()) {
      toast.error('Bitte gib einen Grund für die Ablehnung an.');
      return;
    }

    if (!confirm('Kandidat ablehnen?')) return;

    const toastId = toast.loading('Lehne Kandidat ab...');

    try {
      setLoading(true);

      await matchingService.rejectCandidate({
        candidateId: candidate.id!,
        userId: 'current-user', // TODO: Get from auth
        reason: reviewNotes
      });

      toast.success('Kandidat abgelehnt', { id: toastId });
      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Reject failed:', error);
      toast.error('Fehler beim Ablehnen', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return null;

  const selectedVariant = candidate.variants[selectedVariantIndex];

  return (
    <Dialog open={isOpen} onClose={handleClose} size="5xl">
      <DialogTitle>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
            {selectedVariant.contactData.displayName}
          </span>

          <Badge color={MATCHING_STATUS_COLORS[candidate.status]}>
            {candidate.status}
          </Badge>

          <Badge color="blue">
            Score: {candidate.score} / 100
          </Badge>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {candidate.variants.length} Varianten aus verschiedenen Organisationen
        </div>
      </DialogTitle>

      <DialogBody className="max-h-[70vh] overflow-y-auto">
        {/* Empfehlung */}
        <div>
          {recommendation && (
            <CandidateRecommendationBox
              recommendation={recommendation}
              variantIndex={selectedVariantIndex}
              onSelectVariant={setSelectedVariantIndex}
            />
          )}
        </div>

        {/* Varianten */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="size-5 text-blue-600" />
            Gefundene Varianten
          </h3>

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
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              📝 Notizen (optional)
            </label>
            <TextArea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Notizen zum Review (z.B. Grund für Skip/Reject)..."
              rows={3}
            />
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button
          color="light"
          onClick={handleClose}
          disabled={loading}
        >
          Abbrechen
        </Button>

        {candidate.status === 'pending' && (
          <div className="flex items-center gap-2">
              {/* Reject */}
              <Button
                color="red"
                onClick={handleReject}
                disabled={loading}
              >
                <XMarkIcon className="size-4" />
                Ablehnen
              </Button>

              {/* Skip */}
              <Button
                color="light"
                onClick={handleSkip}
                disabled={loading}
              >
                <ForwardIcon className="size-4" />
                Überspringen
              </Button>

              {/* Import */}
              <Button
                color="green"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    Importiere...
                  </>
                ) : (
                  <>
                    <CheckIcon className="size-4" />
                    Als Premium importieren
                  </>
                )}
              </Button>
            </div>
          )}

        {candidate.status !== 'pending' && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Dieser Kandidat wurde bereits reviewt.
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
