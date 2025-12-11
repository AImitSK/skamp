// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/shared/ApprovalStatusBadge.tsx
'use client';
import React from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface ApprovalStatusBadgeProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_review' | 'sent' | 'changes_requested';
}

export default React.memo(function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const t = useTranslations('campaigns.edit.approval');

  const statusConfig = {
    draft: {
      icon: ClockIcon,
      label: t('draft'),
      className: 'inline-flex items-center gap-1.5 text-gray-600'
    },
    pending: {
      icon: ClockIcon,
      label: t('pending'),
      className: 'inline-flex items-center gap-1.5 text-amber-600'
    },
    in_review: {
      icon: ClockIcon,
      label: t('inReview'),
      className: 'inline-flex items-center gap-1.5 text-blue-600'
    },
    approved: {
      icon: CheckCircleIcon,
      label: t('approved'),
      className: 'inline-flex items-center gap-1.5 text-green-600'
    },
    rejected: {
      icon: XCircleIcon,
      label: t('rejected'),
      className: 'inline-flex items-center gap-1.5 text-red-600'
    },
    sent: {
      icon: CheckCircleIcon,
      label: t('sent'),
      className: 'inline-flex items-center gap-1.5 text-blue-600'
    },
    changes_requested: {
      icon: ClockIcon,
      label: t('changesRequested'),
      className: 'inline-flex items-center gap-1.5 text-orange-600'
    }
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </span>
  );
});
