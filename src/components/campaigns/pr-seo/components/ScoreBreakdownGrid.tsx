// src/components/campaigns/pr-seo/components/ScoreBreakdownGrid.tsx
"use client";

import type { ScoreBreakdownGridProps } from '../types';

/**
 * Score-Breakdown-Grid Komponente
 * Zeigt Score-Aufschlüsselung in 4 Boxen an
 */
export function ScoreBreakdownGrid({ breakdown }: ScoreBreakdownGridProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-4 gap-2 mb-3">
      {/* Headline Score */}
      <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getScoreColor(breakdown.headline)}`}></div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            Headline: {breakdown.headline}/100
          </div>
        </div>
      </div>

      {/* Keywords Score */}
      <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getScoreColor(breakdown.keywords)}`}></div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            Keywords: {breakdown.keywords}/100
          </div>
        </div>
      </div>

      {/* Struktur Score */}
      <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getScoreColor(breakdown.structure)}`}></div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            Struktur: {Math.round(breakdown.structure)}/100
          </div>
        </div>
      </div>

      {/* Social Score */}
      <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getScoreColor(breakdown.social)}`}></div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            Social: {Math.round(breakdown.social)}/100
          </div>
        </div>
      </div>
    </div>
  );
}
