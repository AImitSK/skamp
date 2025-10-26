// src/components/projects/distribution/components/MasterListRow.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowPathIcon, StarIcon } from '@heroicons/react/24/outline';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';

interface MasterListRowProps {
  list: DistributionList;
  isLinked: boolean;
  onViewDetails: () => void;
  onToggleLink: () => void;
}

export default function MasterListRow({
  list,
  isLinked,
  onViewDetails,
  onToggleLink,
}: MasterListRowProps) {
  // Datum formatieren
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Name */}
        <div className="w-[35%] min-w-0">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <button
                onClick={onViewDetails}
                className="text-left w-full group"
              >
                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                  {list.name}
                </p>
                {list.description && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {list.description}
                  </p>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Kategorie */}
        <div className="w-[15%]">
          <Badge
            color="zinc"
            className="text-xs whitespace-nowrap"
          >
            {LIST_CATEGORY_LABELS[list.category as keyof typeof LIST_CATEGORY_LABELS] || list.category}
          </Badge>
        </div>

        {/* Typ */}
        <div className="w-[15%]">
          <Badge
            color={list.type === 'dynamic' ? 'green' : 'blue'}
            className="text-xs whitespace-nowrap"
          >
            {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
          </Badge>
        </div>

        {/* Kontakte */}
        <div className="w-[12%]">
          <span className="text-sm font-medium text-gray-700">
            {(list.contactCount || 0).toLocaleString()}
          </span>
        </div>

        {/* Aktualisiert */}
        <div className="flex-1">
          <div className="flex items-center text-sm text-gray-600">
            {list.type === 'dynamic' && (
              <ArrowPathIcon className="h-3 w-3 mr-1 text-gray-400" />
            )}
            <span>{formatDate(list.lastUpdated || list.updatedAt)}</span>
          </div>
        </div>

        {/* Link/Unlink Button */}
        <div className="ml-4">
          <Button
            onClick={onToggleLink}
            className={`text-xs px-3 py-1.5 flex items-center gap-1 ${
              isLinked
                ? 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200'
            }`}
            style={isLinked ? {
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#1d4ed8',
              borderColor: 'rgba(59, 130, 246, 0.3)'
            } : {
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              border: '1px solid #d1d5db'
            }}
            aria-label={isLinked ? 'Verknüpfung entfernen' : 'Liste verknüpfen'}
          >
            <StarIcon
              className={`h-3 w-3 ${
                isLinked ? 'text-blue-700' : 'text-zinc-500'
              }`}
              fill={isLinked ? 'currentColor' : 'none'}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
