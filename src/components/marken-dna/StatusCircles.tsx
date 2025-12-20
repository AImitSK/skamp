import clsx from 'clsx';
import { useTranslations } from 'next-intl';

export type DocumentStatus = 'missing' | 'draft' | 'completed';
export type MarkenDNADocumentType = 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages';

interface StatusCirclesProps {
  documents: {
    briefing: DocumentStatus;
    swot: DocumentStatus;
    audience: DocumentStatus;
    positioning: DocumentStatus;
    goals: DocumentStatus;
    messages: DocumentStatus;
  };
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onCircleClick?: (type: MarkenDNADocumentType) => void;
}

const DOC_TYPES: readonly MarkenDNADocumentType[] = ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'] as const;

const SIZE_CLASSES = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const getStatusColor = (status: DocumentStatus): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'draft':
      return 'bg-yellow-500';
    case 'missing':
      return 'bg-zinc-300';
  }
};

export function StatusCircles({
  documents,
  size = 'md',
  clickable = false,
  onCircleClick,
}: StatusCirclesProps) {
  const t = useTranslations('markenDNA.documents');
  const completedCount = DOC_TYPES.filter((type) => documents[type] === 'completed').length;
  const percentage = Math.round((completedCount / DOC_TYPES.length) * 100);

  return (
    <div className="flex items-center gap-1">
      {DOC_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => clickable && onCircleClick?.(type)}
          disabled={!clickable}
          className={clsx(
            'rounded-full transition-colors',
            SIZE_CLASSES[size],
            getStatusColor(documents[type]),
            clickable && 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1',
            !clickable && 'cursor-default'
          )}
          title={t(type)}
          aria-label={`${t(type)}: ${documents[type]}`}
        />
      ))}
      <span className="ml-2 text-xs text-zinc-500">
        {percentage}%
      </span>
    </div>
  );
}
