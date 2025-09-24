'use client';

import { EmailCampaignSend } from '@/types/email';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

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
    bounced: sends.filter(s => s.status === 'bounced').length,
    notOpened: 0
  };

  stats.notOpened = stats.delivered - stats.opened;

  const openRate = stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0;
  const clickRate = stats.total > 0 ? Math.round((stats.clicked / stats.total) * 100) : 0;

  const pieData = [
    { name: 'Geklickt', value: stats.clicked, color: '#005fab' },
    { name: 'Geöffnet', value: stats.opened - stats.clicked, color: '#3397d7' },
    { name: 'Zugestellt', value: stats.notOpened, color: '#add8f0' },
    { name: 'Bounced', value: stats.bounced, color: '#DEDC00' }
  ].filter(item => item.value > 0);

  const funnelData = [
    { label: 'Versendet', value: stats.sent, width: 100 },
    { label: 'Zugestellt', value: stats.delivered, width: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0 },
    { label: 'Geöffnet', value: stats.opened, width: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0 },
    { label: 'Geklickt', value: stats.clicked, width: stats.sent > 0 ? (stats.clicked / stats.sent) * 100 : 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Subheading className="mb-4">Status-Verteilung</Subheading>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                <Text className="text-sm text-gray-600">{item.name}: {item.value}</Text>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Subheading className="mb-4">E-Mail Funnel</Subheading>
          <div className="space-y-3 mt-8">
            {funnelData.map((item, idx) => {
              const percentage = Math.round(item.width);
              const isHighPercentage = percentage > 90;

              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <Text className="text-sm text-gray-600">{item.label}</Text>
                    <Text className="text-sm font-semibold text-gray-900">{item.value}</Text>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-8 flex items-center relative">
                    <div
                      className="h-8 rounded-full flex items-center justify-end"
                      style={{ width: `${item.width}%`, backgroundColor: '#005fab' }}
                    >
                      {isHighPercentage && (
                        <span className="text-xs font-medium text-white mr-2">
                          {percentage}%
                        </span>
                      )}
                    </div>
                    {!isHighPercentage && (
                      <span className="text-xs font-medium text-gray-700 absolute right-2">
                        {percentage}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Öffnungsrate</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {openRate}%
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Klickrate</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {clickRate}%
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Engagement</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.opened + stats.clicked}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-sm text-gray-600">Bounce-Rate</Text>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {stats.total > 0 ? Math.round((stats.bounced / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}