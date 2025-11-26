'use client';

import { FaceSmileIcon, FaceFrownIcon } from '@heroicons/react/24/outline';

interface SentimentIconProps {
  className?: string;
  title?: string;
}

/**
 * Positiv-Icon: Lächelndes Gesicht
 */
export function SentimentPositiveIcon({ className = 'h-5 w-5', title = 'Positiv' }: SentimentIconProps) {
  return <FaceSmileIcon className={`${className} text-green-600`} title={title} />;
}

/**
 * Neutral-Icon: Neutrales Gesicht mit geradem Mund
 * Custom SVG da Heroicons kein passendes neutrales Gesicht hat
 */
export function SentimentNeutralIcon({ className = 'h-5 w-5', title = 'Neutral' }: SentimentIconProps) {
  return (
    <svg
      className={`${className} text-zinc-400`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      title={title}
    >
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h8" />
      <circle cx="9" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Negativ-Icon: Trauriges Gesicht
 */
export function SentimentNegativeIcon({ className = 'h-5 w-5', title = 'Negativ' }: SentimentIconProps) {
  return <FaceFrownIcon className={`${className} text-red-600`} title={title} />;
}

/**
 * Gibt das passende Sentiment-Icon basierend auf dem Wert zurück
 */
export function SentimentIcon({
  sentiment,
  className = 'h-5 w-5',
  title
}: {
  sentiment: 'positive' | 'neutral' | 'negative';
  className?: string;
  title?: string;
}) {
  switch (sentiment) {
    case 'positive':
      return <SentimentPositiveIcon className={className} title={title || 'Positiv'} />;
    case 'neutral':
      return <SentimentNeutralIcon className={className} title={title || 'Neutral'} />;
    case 'negative':
      return <SentimentNegativeIcon className={className} title={title || 'Negativ'} />;
  }
}
