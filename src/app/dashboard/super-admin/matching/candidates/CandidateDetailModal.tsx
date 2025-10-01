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
import {
  XMarkIcon,
  CheckIcon,
  ForwardIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@/components/catalyst/dialog';
import { Button } from '@/components/catalyst/button';
import { Badge } from '@/components/catalyst/badge';
import { TextArea } from '@/components/catalyst/textarea';
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

    try {
      setLoading(true);

      const result = await matchingService.importCandidate({
        candidateId: candidate.id!,
        selectedVariantIndex,
        userId: 'current-user' // TODO: Get from auth
      });

      if (result.success) {
        alert('✅ Kandidat erfolgreich importiert!');
        onUpdate();
        handleClose();
      } else {
        alert('❌ Fehler beim Import: ' + result.error);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('❌ Import fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Skip-Aktion
   */
  const handleSkip = async () => {
    if (!candidate) return;

    try {
      setLoading(true);

      await matchingService.skipCandidate({
        candidateId: candidate.id!,
        userId: 'current-user', // TODO: Get from auth
        reason: reviewNotes || 'Manually skipped'
      });

      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Skip failed:', error);
      alert('❌ Fehler beim Überspringen');
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
      alert('Bitte gib einen Grund für die Ablehnung an.');
      return;
    }

    if (!confirm('Kandidat ablehnen?')) return;

    try {
      setLoading(true);

      await matchingService.rejectCandidate({
        candidateId: candidate.id!,
        userId: 'current-user', // TODO: Get from auth
        reason: reviewNotes
      });

      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Reject failed:', error);
      alert('❌ Fehler beim Ablehnen');
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return null;

  const selectedVariant = candidate.variants[selectedVariantIndex];

  return (
    <Dialog open={isOpen} onClose={handleClose} size="5xl">
      <DialogPanel>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {selectedVariant.contactData.displayName}
              </DialogTitle>

              <Badge color={MATCHING_STATUS_COLORS[candidate.status]}>
                {candidate.status}
              </Badge>

              <Badge color="blue">
                Score: {candidate.score} / 100
              </Badge>
            </div>

            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {candidate.variants.length} Varianten aus verschiedenen Organisationen
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Empfehlung */}
        {recommendation && (
          <CandidateRecommendationBox
            recommendation={recommendation}
            variantIndex={selectedVariantIndex}
            onSelectVariant={setSelectedVariantIndex}
          />
        )}

        {/* Varianten */}
        <div className="mb-6">
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
          <div className="mb-6">
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
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
        </div>
      </DialogPanel>
    </Dialog>
  );
}
