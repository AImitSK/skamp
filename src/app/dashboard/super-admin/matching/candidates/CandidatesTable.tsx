/**
 * Candidates Table Komponente
 *
 * Zeigt Matching-Kandidaten in einer Tabelle mit:
 * - Sortierung
 * - Score-Badges
 * - Status-Badges
 * - Varianten-Count
 * - Action-Buttons
 */

'use client';

import { useState } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MatchingCandidate,
  MatchingCandidateSorting,
  MATCHING_STATUS_LABELS,
  MATCHING_STATUS_COLORS,
  MATCH_TYPE_LABELS
} from '@/types/matching';
import CandidateRow from './CandidateRow';

interface CandidatesTableProps {
  candidates: MatchingCandidate[];
  loading: boolean;
  sorting: MatchingCandidateSorting;
  onSortingChange: (sorting: MatchingCandidateSorting) => void;
  onRefresh: () => void;
}

export default function CandidatesTable({
  candidates,
  loading,
  sorting,
  onSortingChange,
  onRefresh
}: CandidatesTableProps) {

  /**
   * Ändert Sortierung
   */
  const handleSort = (field: MatchingCandidateSorting['field']) => {
    if (sorting.field === field) {
      // Toggle direction
      onSortingChange({
        field,
        direction: sorting.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Neues Feld, default desc
      onSortingChange({
        field,
        direction: 'desc'
      });
    }
  };

  /**
   * Sortier-Icon
   */
  const getSortIcon = (field: MatchingCandidateSorting['field']) => {
    if (sorting.field !== field) {
      return <ChevronUpIcon className="size-4 text-zinc-400" />;
    }

    return sorting.direction === 'asc' ? (
      <ChevronUpIcon className="size-4 text-zinc-900 dark:text-white" />
    ) : (
      <ChevronDownIcon className="size-4 text-zinc-900 dark:text-white" />
    );
  };

  /**
   * Sortierbare Table Header
   */
  const SortableHeader = ({
    field,
    children
  }: {
    field: MatchingCandidateSorting['field'];
    children: React.ReactNode;
  }) => (
    <TableHeader>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white"
      >
        {children}
        {getSortIcon(field)}
      </button>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="p-12 text-center">
        <ArrowPathIcon className="mx-auto size-8 text-zinc-400 animate-spin" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Lade Kandidaten...
        </p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return null; // Empty state wird von Parent gehandelt
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHead>
            <TableRow>
              <SortableHeader field="matchKey">
                Name / E-Mail
              </SortableHeader>

              <SortableHeader field="score">
                Score
              </SortableHeader>

              <TableHeader>Match-Type</TableHeader>

              <SortableHeader field="variantCount">
                Organisationen
              </SortableHeader>

              <TableHeader>Status</TableHeader>

              <SortableHeader field="createdAt">
                Erstellt
              </SortableHeader>

              <TableHeader>Aktionen</TableHeader>
            </TableRow>
          </TableHead>

          <TableBody>
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                onUpdate={onRefresh}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {candidates.length} {candidates.length === 1 ? 'Kandidat' : 'Kandidaten'}
          </div>

          <Button
            color="light"
            onClick={onRefresh}
            className="text-sm"
          >
            <ArrowPathIcon className="size-4" />
            Aktualisieren
          </Button>
        </div>
      </div>
    </div>
  );
}
