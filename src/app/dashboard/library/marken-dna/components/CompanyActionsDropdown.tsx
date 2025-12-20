'use client';

import {
  EllipsisVerticalIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from '@/components/ui/dropdown';
import { MarkenDNADocumentType } from '@/types/marken-dna';
import clsx from 'clsx';

interface DocumentsStatus {
  briefing: boolean;
  swot: boolean;
  audience: boolean;
  positioning: boolean;
  goals: boolean;
  messages: boolean;
}

interface CompanyActionsDropdownProps {
  companyId: string;
  companyName: string;
  documents: DocumentsStatus;
  onCreateOrEdit: (type: MarkenDNADocumentType) => void;
  onDeleteAll: () => void;
}

const DOC_TYPES: Array<{ key: MarkenDNADocumentType; label: string }> = [
  { key: 'briefing', label: 'Briefing-Check' },
  { key: 'swot', label: 'SWOT-Analyse' },
  { key: 'audience', label: 'Zielgruppen-Radar' },
  { key: 'positioning', label: 'Positionierungs-Designer' },
  { key: 'goals', label: 'Ziele-Setzer' },
  { key: 'messages', label: 'Botschaften-Baukasten' },
];

export function CompanyActionsDropdown({
  companyId,
  companyName,
  documents,
  onCreateOrEdit,
  onDeleteAll,
}: CompanyActionsDropdownProps) {
  return (
    <Dropdown>
      {/* 3-Punkte Button (Design System Pattern) */}
      <DropdownButton
        plain
        className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
      </DropdownButton>

      <DropdownMenu anchor="bottom end" className="w-72">
        {/* Company Header */}
        <div className="px-3 py-2 border-b border-zinc-200">
          <span className="text-sm font-medium text-zinc-900">{companyName}</span>
        </div>

        {/* Document Items */}
        {DOC_TYPES.map(({ key, label }) => {
          const exists = documents[key];
          return (
            <DropdownItem
              key={key}
              onClick={() => onCreateOrEdit(key)}
            >
              {/* Status-Punkt (grau = fehlt, grün = vorhanden) */}
              <div
                className={clsx(
                  'h-2 w-2 rounded-full mr-2',
                  exists ? 'bg-green-500' : 'bg-zinc-300'
                )}
              />
              <span className="flex-1">{label}</span>
              {exists ? (
                <span className="text-xs text-zinc-500">Bearbeiten</span>
              ) : (
                <PlusIcon className="h-4 w-4 text-zinc-400" />
              )}
            </DropdownItem>
          );
        })}

        <DropdownDivider />

        {/* Delete All Action */}
        <DropdownItem onClick={onDeleteAll}>
          <TrashIcon className="h-4 w-4 text-red-600" />
          <span className="text-red-600">Alle Dokumente löschen</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
