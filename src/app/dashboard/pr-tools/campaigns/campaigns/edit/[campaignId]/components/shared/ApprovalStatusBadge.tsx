// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/shared/ApprovalStatusBadge.tsx
import React from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ApprovalStatusBadgeProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_review' | 'sent' | 'changes_requested';
}

const statusConfig = {
  draft: {
    icon: ClockIcon,
    label: 'Entwurf',
    className: 'inline-flex items-center gap-1.5 text-gray-600'
  },
  pending: {
    icon: ClockIcon,
    label: 'Ausstehend',
    className: 'inline-flex items-center gap-1.5 text-amber-600'
  },
  in_review: {
    icon: ClockIcon,
    label: 'In Prüfung',
    className: 'inline-flex items-center gap-1.5 text-blue-600'
  },
  approved: {
    icon: CheckCircleIcon,
    label: 'Freigegeben',
    className: 'inline-flex items-center gap-1.5 text-green-600'
  },
  rejected: {
    icon: XCircleIcon,
    label: 'Abgelehnt',
    className: 'inline-flex items-center gap-1.5 text-red-600'
  },
  sent: {
    icon: CheckCircleIcon,
    label: 'Versendet',
    className: 'inline-flex items-center gap-1.5 text-blue-600'
  },
  changes_requested: {
    icon: ClockIcon,
    label: 'Änderungen Angefordert',
    className: 'inline-flex items-center gap-1.5 text-orange-600'
  }
};

export default React.memo(function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </span>
  );
});
