// src/components/projects/distribution/components/details/ListInfoHeader.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { LIST_CATEGORY_LABELS } from '@/types/lists';

interface ListInfoHeaderProps {
  listName: string;
  listCategory: string;
  listType: string;
  contactCount: number;
  listDescription?: string;
}

export default function ListInfoHeader({
  listName,
  listCategory,
  listType,
  contactCount,
  listDescription,
}: ListInfoHeaderProps) {
  return (
    <div>
      {/* Liste Beschreibung (falls vorhanden) */}
      {listDescription && (
        <div className="mb-4">
          <Text className="text-sm text-gray-600">{listDescription}</Text>
        </div>
      )}

      {/* Listen-Informationen Header */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-200">
        <div>
          <Text className="text-xs text-gray-500 mb-1">Kategorie</Text>
          <Badge color="zinc" className="text-xs">
            {LIST_CATEGORY_LABELS[listCategory as keyof typeof LIST_CATEGORY_LABELS] || listCategory}
          </Badge>
        </div>
        <div>
          <Text className="text-xs text-gray-500 mb-1">Typ</Text>
          <Badge
            color={listType === 'dynamic' ? 'green' : 'blue'}
            className="text-xs"
          >
            {listType === 'dynamic' ? 'Dynamisch' : 'Statisch'}
          </Badge>
        </div>
        <div>
          <Text className="text-xs text-gray-500 mb-1">Kontakte</Text>
          <Text className="text-sm font-semibold">{contactCount.toLocaleString()}</Text>
        </div>
      </div>
    </div>
  );
}
