// src/components/campaigns/pr-seo/components/RecommendationsList.tsx
"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { RecommendationsListProps } from '../types';

/**
 * Empfehlungen-Liste Komponente
 * Zeigt SEO-Empfehlungen mit Expand/Collapse an
 */
export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const [showAll, setShowAll] = useState(false);

  if (recommendations.length === 0) {
    return null;
  }

  const displayedRecommendations = showAll ? recommendations : recommendations.slice(0, 3);

  return (
    <div className="mt-4 p-3 bg-gray-100 rounded-md">
      <div>
        <p className="text-sm font-medium text-gray-900 mb-1">
          Empfehlungen: ({recommendations.length})
        </p>
        <ul className="text-xs text-gray-700 space-y-2">
          {displayedRecommendations.map((rec, index) => (
            <li key={index} className="flex items-start justify-between gap-2 leading-relaxed">
              <span className="leading-relaxed">• {rec.replace('[KI] ', '')}</span>
              {rec.startsWith('[KI]') && (
                <Badge color="purple" className="text-[9px] px-1 py-0 mt-0.5 flex-shrink-0 leading-none h-3">
                  KI
                </Badge>
              )}
            </li>
          ))}
        </ul>

        {/* Expand/Collapse Button */}
        {recommendations.length > 3 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAll(!showAll);
            }}
            className="text-xs text-gray-600 hover:text-gray-800 mt-2 flex items-center gap-1 transition-colors"
          >
            {showAll ? (
              <>
                weniger anzeigen
                <ChevronUpIcon className="h-3 w-3" />
              </>
            ) : (
              <>
                <span className="font-semibold">{recommendations.length - 3} weitere anzeigen</span>
                <ChevronDownIcon className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
