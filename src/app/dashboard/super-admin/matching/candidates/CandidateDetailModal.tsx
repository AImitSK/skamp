/**
 * Candidate Detail Modal
 *
 * Zeigt Details eines Matching-Kandidaten:
 * - Empfehlung für beste Variante
 * - Alle Varianten mit Kontakt-Details
 * - Import/Skip/Reject Aktionen
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
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import toast from 'react-hot-toast';

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
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [recommendation, setRecommendation] = useState<CandidateRecommendation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && candidate) {
      const rec = matchingService.getRecommendation(candidate);
      setRecommendation(rec);
      setSelectedVariantIndex(rec.recommendedIndex);
    }
  }, [isOpen, candidate]);

  /**
   * Skip-Handler
   */
  const handleSkip = async () => {
    if (!user) {
      toast.error('Nicht eingeloggt');
      return;
    }

    if (!confirm('Kandidat überspringen?')) return;

    const toastId = toast.loading('Überspringe Kandidat...');

    try {
      setActionLoading(true);

      await matchingService.skipCandidate({
        candidateId: candidate.id!,
        userId: user.uid,
        reason: 'Manually skipped'
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
   * Reject-Handler
   */
  const handleReject = async () => {
    if (!user) {
      toast.error('Nicht eingeloggt');
      return;
    }

    const reason = prompt('Grund für Ablehnung:');
    if (!reason) return;

    const toastId = toast.loading('Lehne Kandidat ab...');

    try {
      setActionLoading(true);

      await matchingService.rejectCandidate({
        candidateId: candidate.id!,
        userId: user.uid,
        reason
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

  /**
   * Import-Handler
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

    if (!confirm(`Kandidat mit Variante #${selectedVariantIndex + 1} importieren?`)) return;

    const toastId = toast.loading('Importiere Kandidat...');

    try {
      setActionLoading(true);

      const result = await matchingService.importCandidateWithAutoMatching({
        candidateId: candidate.id!,
        selectedVariantIndex,
        userId: user.uid,
        organizationId: currentOrganization.id
      });

      if (result.success) {
        // Detailliertes Erfolgs-Feedback
        let message = '✅ Kandidat erfolgreich importiert!\n\n';

        // Firma
        if (result.companyMatch) {
          const { companyName, matchType, wasCreated, wasEnriched } = result.companyMatch;

          if (wasCreated) {
            message += `🏢 Neue Firma erstellt: ${companyName}\n`;
          } else {
            message += `🏢 Firma verlinkt: ${companyName}\n`;
            if (wasEnriched) {
              message += `   ↳ Firmendaten wurden ergänzt\n`;
            }
          }
        }

        // Publikationen
        if (result.publicationMatches && result.publicationMatches.length > 0) {
          message += `📰 Publikationen (${result.publicationMatches.length}):\n`;
          for (const pub of result.publicationMatches) {
            if (pub.wasCreated) {
              message += `   • Neue Publikation: ${pub.publicationName}\n`;
            } else {
              message += `   • Verlinkt: ${pub.publicationName}\n`;
            }
          }
        }

        // Kontakt
        message += `👤 Kontakt erstellt: ID ${result.contactId}`;

        toast.success(message, { id: toastId, duration: 6000 });
        onUpdate();
        onClose();
      } else {
        toast.error(`Fehler: ${result.error}`, { id: toastId });
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

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-4xl w-full max-h-[90vh] rounded-lg bg-white dark:bg-zinc-900 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
                Kandidat Details
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

            <Button color="red" onClick={handleReject} disabled={actionLoading}>
              <XMarkIcon className="size-4" />
              <span>Ablehnen</span>
            </Button>

            <Button color="light" onClick={handleSkip} disabled={actionLoading}>
              <ForwardIcon className="size-4" />
              <span>Überspringen</span>
            </Button>

            <Button color="green" onClick={handleImport} disabled={actionLoading}>
              <CheckIcon className="size-4" />
              <span>Importieren</span>
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
