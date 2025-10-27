// src/components/projects/pressemeldungen/PressemeldungApprovalTable.tsx
'use client';

import { ApprovalEnhanced } from '@/types/approvals';
import ApprovalTableRow from './components/ApprovalTableRow';
import EmptyState from './components/EmptyState';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  approvals: ApprovalEnhanced[];
  onRefresh: () => void;
}

export default function PressemeldungApprovalTable({
  approvals,
  onRefresh
}: Props) {
  if (approvals.length === 0) {
    return (
      <EmptyState
        icon={CheckCircleIcon}
        title="Keine Freigaben"
        description="Keine Freigaben für dieses Projekt gefunden"
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-[35%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kampagne
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </div>
          <div className="w-[27%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kunde & Kontakt
          </div>
          <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Letzte Aktivität
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-200">
        {approvals.map((approval) => (
          <ApprovalTableRow
            key={approval.id}
            approval={approval}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}