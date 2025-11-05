// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/CampaignHeader.tsx
import React from 'react';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { PRCampaign } from '@/types/pr';

interface CampaignHeaderProps {
  campaign: PRCampaign;
  selectedCompanyName?: string;
  selectedCompanyId?: string;
}

export default function CampaignHeader({ campaign, selectedCompanyName, selectedCompanyId }: CampaignHeaderProps) {
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
            Kunde:{' '}
            <Link
              href={`/dashboard/contacts/crm/companies/${selectedCompanyId}`}
              className="hover:text-[#005fab] transition-colors"
            >
              {selectedCompanyName}
            </Link>
          </span>
        )}
        <span>
          Erstellt: {campaign.createdAt ? (() => {
            let date: Date;
            if (campaign.createdAt.toDate) {
              date = campaign.createdAt.toDate();
            } else if ((campaign.createdAt as any).seconds) {
              date = new Date((campaign.createdAt as any).seconds * 1000);
            } else if (campaign.createdAt instanceof Date) {
              date = campaign.createdAt;
            } else {
              return 'Unbekannt';
            }
            return date.toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
          })() : 'Unbekannt'}
        </span>
        <Badge color={(() => {
          switch (campaign.status) {
            case 'draft': return 'zinc';
            case 'in_review': return 'amber';
            case 'approved': return 'green';
            case 'sent': return 'blue';
            case 'changes_requested': return 'orange';
            default: return 'zinc';
          }
        })() as any}>
          {(() => {
            switch (campaign.status) {
              case 'draft': return 'Entwurf';
              case 'in_review': return 'In Prüfung';
              case 'approved': return 'Freigegeben';
              case 'sent': return 'Versendet';
              case 'changes_requested': return 'Änderungen Angefordert';
              default: return campaign.status;
            }
          })()}
        </Badge>
      </div>
    </div>
  );
}
