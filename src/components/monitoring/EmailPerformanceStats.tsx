'use client';

import { EmailCampaignSend } from '@/types/email';
import { Text } from '@/components/ui/text';

interface EmailPerformanceStatsProps {
  sends: EmailCampaignSend[];
}

export function EmailPerformanceStats({ sends }: EmailPerformanceStatsProps) {
  const stats = {
    total: sends.length,
    sent: sends.filter(s => s.status === 'sent' || s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
    delivered: sends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
    opened: sends.filter(s => s.status === 'opened' || s.status === 'clicked').length,
    clicked: sends.filter(s => s.status === 'clicked').length,
    bounced: sends.filter(s => s.status === 'bounced').length
  };

  const openRate = stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0;
  const clickRate = stats.total > 0 ? Math.round((stats.clicked / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Versendet</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.sent}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Zugestellt</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.delivered}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Geöffnet</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.opened}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Geklickt</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.clicked}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Bounced</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.bounced}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 flex gap-8">
        <div>
          <Text className="text-sm text-gray-600">Öffnungsrate</Text>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {openRate}%
          </div>
        </div>

        <div>
          <Text className="text-sm text-gray-600">Klickrate</Text>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {clickRate}%
          </div>
        </div>
      </div>
    </div>
  );
}