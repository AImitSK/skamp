/**
 * Matching-Kandidat Detail-Seite
 *
 * Zeigt alle Details eines Kandidaten und ermöglicht Import/Skip/Reject
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
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
import CandidateVariantCard from '../CandidateVariantCard';
import CandidateRecommendationBox from '../CandidateRecommendation';

export default function CandidateDetailPage({
  params
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [candidate, setCandidate] = useState<MatchingCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [recommendation, setRecommendation] = useState<CandidateRecommendation | null>(null);

  /**
   * Lädt Kandidat
   */
  const loadCandidate = async () => {
    try {
      setLoading(true);
      const data = await matchingService.getCandidateById(resolvedParams.candidateId);

      if (!data) {
        toast.error('Kandidat nicht gefunden');
        router.push('/dashboard/super-admin/matching/candidates');
        return;
      }

      setCandidate(data);

      // Empfehlung laden
      const rec = matchingService.getRecommendation(data);
      setRecommendation(rec);
      setSelectedVariantIndex(rec.recommendedIndex);
    } catch (error) {
      console.error('Error loading candidate:', error);
      toast.error('Fehler beim Laden des Kandidaten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidate();
  }, [resolvedParams.candidateId]);

  /**
   * Import-Aktion
   */
  const handleImport = async () => {
    if (!candidate) return;
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
        organizationId: currentOrganization.id // ✅ DEINE SuperAdmin Org
      });

      if (result.success) {
        toast.success(
          'Kandidat erfolgreich als Premium-Journalist importiert!',
          { id: toastId, duration: 5000 }
        );
        router.push('/dashboard/super-admin/matching/candidates');
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
    if (!candidate) return;

    const toastId = toast.loading('Überspringe Kandidat...');

    try {
      setActionLoading(true);

      await matchingService.skipCandidate({
        candidateId: candidate.id!,
        userId: 'current-user',
        reason: reviewNotes || 'Manually skipped'
      });

      toast.success('Kandidat übersprungen', { id: toastId });
      router.push('/dashboard/super-admin/matching/candidates');
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
    if (!candidate) return;

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
        userId: 'current-user',
        reason: reviewNotes
      });

      toast.success('Kandidat abgelehnt', { id: toastId });
      router.push('/dashboard/super-admin/matching/candidates');
    } catch (error) {
      console.error('Reject failed:', error);
      toast.error('Fehler beim Ablehnen', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <ArrowPathIcon className="size-12 text-zinc-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  const selectedVariant = candidate.variants[selectedVariantIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          color="light"
          onClick={() => router.push('/dashboard/super-admin/matching/candidates')}
        >
          <ArrowLeftIcon className="size-4" />
          Zurück zur Liste
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
            {selectedVariant.contactData.displayName}
          </h1>

          <Badge color={MATCHING_STATUS_COLORS[candidate.status]}>
            {candidate.status}
          </Badge>

          <Badge color="blue">
            Score: {candidate.score} / 100
          </Badge>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {candidate.variants.length} Varianten aus verschiedenen Organisationen
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
          onClick={() => router.push('/dashboard/super-admin/matching/candidates')}
          disabled={actionLoading}
        >
          Abbrechen
        </Button>

        {candidate.status === 'pending' && (
          <div className="flex items-center gap-2">
            {/* Reject */}
            <Button
              color="red"
              onClick={handleReject}
              disabled={actionLoading}
            >
              <XMarkIcon className="size-4" />
              Ablehnen
            </Button>

            {/* Skip */}
            <Button
              color="light"
              onClick={handleSkip}
              disabled={actionLoading}
            >
              <ForwardIcon className="size-4" />
              Überspringen
            </Button>

            {/* Import */}
            {actionLoading ? (
              <Button
                color="green"
                onClick={handleImport}
                disabled={actionLoading}
              >
                <ArrowPathIcon className="size-4 animate-spin" />
                Importiere...
              </Button>
            ) : (
              <Button
                color="green"
                onClick={handleImport}
                disabled={actionLoading}
              >
                <CheckIcon className="size-4" />
                Als Premium importieren
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
    </div>
  );
}
