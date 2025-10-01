/**
 * Candidate Row Komponente
 *
 * Einzelne Zeile in der Kandidaten-Tabelle
 * - Score-Anzeige mit Farb-Kodierung
 * - Status-Badge
 * - Varianten-Info
 * - Quick-Actions (Details, Skip, Reject)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  ForwardIcon
} from '@heroicons/react/24/outline';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { matchingService } from '@/lib/firebase/matching-service';
import {
  MatchingCandidate,
  MATCHING_STATUS_LABELS,
  MATCHING_STATUS_COLORS,
  MATCH_TYPE_LABELS
} from '@/types/matching';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import toast from 'react-hot-toast';
import CandidateDetailModal from './CandidateDetailModal';
import SimpleModal from './SimpleModal';

interface CandidateRowProps {
  candidate: MatchingCandidate;
  onUpdate: () => void;
  onViewDetails?: () => void;
}

function CandidateRow({
  candidate,
  onUpdate,
  onViewDetails
}: CandidateRowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Score-Farbe basierend auf Wert
   */
  const getScoreColor = (score: number): 'green' | 'yellow' | 'orange' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 60) return 'orange';
    return 'red';
  };

  /**
   * Formatiert Datum
   */
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return '-';
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
    } catch (error) {
      console.error('Reject failed:', error);
      toast.error('Fehler beim Ablehnen', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Import-Aktion (Quick-Import mit erster Variante)
   */
  const handleQuickImport = async () => {
    if (!user) {
      toast.error('Nicht eingeloggt');
      return;
    }
    if (!currentOrganization) {
      toast.error('Keine Organisation ausgewählt');
      return;
    }

    if (!confirm('Kandidat mit erster Variante importieren?')) return;

    const toastId = toast.loading('Importiere Kandidat...');

    try {
      setActionLoading(true);

      const result = await matchingService.importCandidate({
        candidateId: candidate.id!,
        selectedVariantIndex: 0,
        userId: user.uid,
        organizationId: currentOrganization.id
      });

      if (result.success) {
        toast.success('Kandidat importiert!', { id: toastId });
        onUpdate();
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

  // Erste Variante für Preview
  const firstVariant = candidate.variants[0];
  const displayName = firstVariant.contactData.displayName;
  const email = firstVariant.contactData.emails?.[0]?.email;

  return (
    <TableRow>
      {/* Name / E-Mail */}
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <UserIcon className="size-10 text-zinc-400 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-zinc-900 dark:text-white truncate">
              {displayName}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1">
              {email ? (
                <>
                  <EnvelopeIcon className="size-3" />
                  {email}
                </>
              ) : (
                <span className="italic">Keine E-Mail</span>
              )}
            </div>
            {firstVariant.contactData.companyName && (
              <div className="text-sm text-zinc-500 dark:text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                <BuildingOfficeIcon className="size-3" />
                {firstVariant.contactData.companyName}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Score */}
      <TableCell>
        <Badge color={getScoreColor(candidate.score)}>
          {`${candidate.score} / 100`}
        </Badge>
      </TableCell>

      {/* Match-Type */}
      <TableCell>
        <Badge color="zinc">
          {MATCH_TYPE_LABELS[candidate.matchType]}
        </Badge>
      </TableCell>

      {/* Organisationen */}
      <TableCell>
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="size-4 text-zinc-400" />
          <span className="font-medium text-zinc-900 dark:text-white">
            {candidate.variants.length}
          </span>
          <span className="text-sm text-zinc-500">
            {candidate.variants.length === 1 ? 'Org' : 'Orgs'}
          </span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge color={MATCHING_STATUS_COLORS[candidate.status]}>
          {MATCHING_STATUS_LABELS[candidate.status]}
        </Badge>
      </TableCell>

      {/* Erstellt */}
      <TableCell>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDate(candidate.createdAt)}
        </div>
      </TableCell>

      {/* Aktionen */}
      <TableCell>
        <div className="flex items-center gap-1">
          {/* Details Button */}
          <Button
            color="light"
            onClick={onViewDetails}
            disabled={actionLoading}
            title="Details anzeigen"
            className="px-2 py-1"
          >
            <EyeIcon className="size-4" />
          </Button>

          {/* Conditional Actions based on Status */}
          {candidate.status === 'pending' && (
            <>
              {/* Quick Import */}
              <Button
                color="green"
                onClick={handleQuickImport}
                disabled={actionLoading}
                title="Schnell importieren (erste Variante)"
                className="px-2 py-1"
              >
                <CheckIcon className="size-4" />
              </Button>

              {/* Skip */}
              <Button
                color="light"
                onClick={handleSkip}
                disabled={actionLoading}
                title="Überspringen"
                className="px-2 py-1"
              >
                <ForwardIcon className="size-4" />
              </Button>

              {/* Reject */}
              <Button
                color="red"
                onClick={handleReject}
                disabled={actionLoading}
                title="Ablehnen"
                className="px-2 py-1"
              >
                <XMarkIcon className="size-4" />
              </Button>
            </>
          )}

          {candidate.status === 'imported' && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Importiert
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CandidateRowWithModal(props: CandidateRowProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  return (
    <>
      <CandidateRow {...props} onViewDetails={() => setShowDetailModal(true)} />

      <SimpleModal
        candidate={props.candidate}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  );
}
