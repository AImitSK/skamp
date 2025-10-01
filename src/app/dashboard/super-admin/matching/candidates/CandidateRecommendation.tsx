/**
 * Candidate Recommendation Komponente
 *
 * Zeigt Empfehlung welche Variante die beste ist:
 * - Empfohlene Variante highlighten
 * - Grund für Empfehlung
 * - Quick-Select Button
 */

'use client';

import {
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CandidateRecommendation } from '@/types/matching';

interface CandidateRecommendationBoxProps {
  recommendation: CandidateRecommendation;
  variantIndex: number;
  onSelectVariant: (index: number) => void;
}

export default function CandidateRecommendationBox({
  recommendation,
  variantIndex,
  onSelectVariant
}: CandidateRecommendationBoxProps) {
  const isRecommendedSelected = variantIndex === recommendation.recommendedIndex;

  return (
    <div className={`
      rounded-lg p-4 mb-6 border-2
      ${isRecommendedSelected
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
      }
    `}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <SparklesIcon className="size-6 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              💡 Empfehlung
            </h3>
            <Badge color="blue" className="text-xs">
              Variante #{recommendation.recommendedIndex + 1}
            </Badge>
          </div>

          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            {recommendation.reason}
          </p>

          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <CheckCircleIcon className="size-4" />
            <span>
              Vollständigkeits-Score: {recommendation.score} / 100
            </span>
          </div>
        </div>

        {/* Action */}
        {!isRecommendedSelected && (
          <div className="flex-shrink-0">
            <Button
              color="blue"
              onClick={() => onSelectVariant(recommendation.recommendedIndex)}
              className="text-sm"
            >
              Auswählen
            </Button>
          </div>
        )}

        {isRecommendedSelected && (
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircleIcon className="size-5" />
              Ausgewählt
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
