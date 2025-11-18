'use client';

import { useMemo } from 'react';
import { MediaClipping } from '@/types/monitoring';
import { EmailCampaignSend } from '@/types/email';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ChartBarIcon,
  EyeIcon,
  NewspaperIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useAVECalculation } from '@/lib/hooks/useAVECalculation';
import { useClippingStats } from '@/lib/hooks/useClippingStats';

interface MonitoringDashboardProps {
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}

const BRAND_COLORS = {
  primary: '#005fab',
  secondary: '#DEDC00',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280'
};

const CHART_COLORS = [
  BRAND_COLORS.primary,
  '#3397d7',
  '#add8f0',
  BRAND_COLORS.secondary,
  BRAND_COLORS.success
];

export function MonitoringDashboard({ clippings, sends }: MonitoringDashboardProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // React Query Hook für AVE-Berechnung
  const { calculateAVE } = useAVECalculation(
    currentOrganization?.id,
    user?.uid
  );

  // Hook für Stats-Aggregation
  const stats = useClippingStats(clippings, sends);

  // Gesamt-AVE mit Memoization
  const totalAVE = useMemo(
    () => clippings.reduce((sum, c) => sum + calculateAVE(c), 0),
    [clippings, calculateAVE]
  );

  if (clippings.length === 0 && sends.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <Text className="text-gray-500">Noch keine Daten für Analytics verfügbar</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBarIcon className="h-5 w-5 text-[#005fab]" />
          <Subheading>Performance-Übersicht</Subheading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <NewspaperIcon className="h-5 w-5 text-gray-600" />
              <Text className="text-sm text-gray-600">Veröffentlichungen</Text>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {clippings.length}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <EyeIcon className="h-5 w-5 text-gray-600" />
              <Text className="text-sm text-gray-600">Gesamtreichweite</Text>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.totalReach.toLocaleString('de-DE')}
            </div>
          </div>

          {totalAVE > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyEuroIcon className="h-5 w-5 text-gray-600" />
                <Text className="text-sm text-gray-600">Gesamt-AVE</Text>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {totalAVE.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <Text className="text-sm text-gray-600">Öffnungsrate</Text>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.emailStats.openRate}%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <FaceSmileIcon className="h-5 w-5 text-green-600" />
                <FaceFrownIcon className="h-5 w-5 text-red-600" />
              </div>
              <Text className="text-sm text-gray-600">Conversion</Text>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.emailStats.conversionRate}%
            </div>
            <Text className="text-xs text-gray-500 mt-1">
              Öffnungen → Clippings
            </Text>
          </div>
        </div>
      </div>

      {stats.timelineData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Veröffentlichungen über Zeit</Subheading>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={{ value: 'Anzahl', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={{ value: 'Reichweite', angle: 90, position: 'insideRight', fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clippings"
                stroke={BRAND_COLORS.primary}
                strokeWidth={2}
                name="Artikel"
                dot={{ fill: BRAND_COLORS.primary, r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="reach"
                stroke={BRAND_COLORS.secondary}
                strokeWidth={2}
                name="Reichweite"
                dot={{ fill: BRAND_COLORS.secondary, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.outletDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <NewspaperIcon className="h-5 w-5 text-[#005fab]" />
              <Subheading>Medium-Verteilung</Subheading>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.outletDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {stats.outletDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stats.outletDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                  <Text className="text-sm text-gray-600">{item.name}: {item.count}</Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.sentimentData.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#005fab]" />
              <Subheading>Sentiment-Verteilung</Subheading>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.sentimentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {stats.sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stats.sentimentData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                  <Text className="text-sm text-gray-600">{item.name}: {item.value}</Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {stats.topOutlets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Top 5 Medien nach Reichweite</Subheading>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topOutlets} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => value.toLocaleString('de-DE')}
              />
              <Bar
                dataKey="reach"
                fill={BRAND_COLORS.primary}
                name="Reichweite"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}