// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/CampaignHeader.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { PRCampaign } from '@/types/pr';

interface CampaignHeaderProps {
  campaign: PRCampaign;
  selectedCompanyName?: string;
  selectedCompanyId?: string;
}

export default function CampaignHeader({ campaign, selectedCompanyName, selectedCompanyId }: CampaignHeaderProps) {
  const t = useTranslations('campaigns.edit.header');

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return t('unknownDate');

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if ((timestamp as any).seconds) {
      date = new Date((timestamp as any).seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return t('unknownDate');
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'zinc';
      case 'in_review': return 'amber';
      case 'approved': return 'green';
      case 'sent': return 'blue';
      case 'changes_requested': return 'orange';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('status.draft');
      case 'in_review': return t('status.inReview');
      case 'approved': return t('status.approved');
      case 'sent': return t('status.sent');
      case 'changes_requested': return t('status.changesRequested');
      default: return status;
    }
  };

  return (
    <div className="mb-6">
      {/* Titel-Zeile */}
      <div className="mb-2">
        <Heading className="!text-2xl">{campaign.title}</Heading>
      </div>

      {/* Metadaten-Zeile */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {selectedCompanyName && selectedCompanyId && (
          <span>
            {t('client')}:{' '}
            <Link
              href={`/dashboard/contacts/crm/companies/${selectedCompanyId}`}
              className="hover:text-[#005fab] transition-colors"
            >
              {selectedCompanyName}
            </Link>
          </span>
        )}
        <span>
          {t('created')}: {formatDate(campaign.createdAt)}
        </span>
        <Badge color={getStatusColor(campaign.status) as any}>
          {getStatusLabel(campaign.status)}
        </Badge>
      </div>
    </div>
  );
}
