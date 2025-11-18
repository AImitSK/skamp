'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { AVESettings } from '@/types/monitoring';

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
  const [aveSettings, setAVESettings] = useState<AVESettings | null>(null);

  useEffect(() => {
    if (currentOrganization?.id && user?.uid) {
      aveSettingsService.getOrCreate(currentOrganization.id, user.uid)
        .then(setAVESettings)
        .catch(console.error);
    }
  }, [currentOrganization?.id, user?.uid]);

  const calculateAVE = (clipping: MediaClipping): number => {
    if (clipping.ave) return clipping.ave;
    if (!aveSettings) return 0;
    return aveSettingsService.calculateAVE(clipping, aveSettings);
  };

  const timelineData = useMemo(() => {
    const groupedByDate = clippings.reduce((acc, clipping) => {
      if (!clipping.publishedAt || !clipping.publishedAt.toDate) return acc;

      const date = clipping.publishedAt.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short'
      });

      if (!acc[date]) {
        acc[date] = { date, clippings: 0, reach: 0 };
      }

      acc[date].clippings += 1;
      acc[date].reach += clipping.reach || 0;

      return acc;
    }, {} as Record<string, { date: string; clippings: number; reach: number }>);

    return Object.values(groupedByDate).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [clippings]);

  const outletDistribution = useMemo(() => {
    const distribution = clippings.reduce((acc, clipping) => {
      const type = clipping.outletType || 'Unbekannt';
      if (!acc[type]) {
        acc[type] = { name: type, count: 0, reach: 0 };
      }
      acc[type].count += 1;
      acc[type].reach += clipping.reach || 0;
      return acc;
    }, {} as Record<string, { name: string; count: number; reach: number }>);

    return Object.values(distribution);
  }, [clippings]);

  const topOutlets = useMemo(() => {
    const outletStats = clippings.reduce((acc, clipping) => {
      const outlet = clipping.outletName || 'Unbekannt';
      if (!acc[outlet]) {
        acc[outlet] = { name: outlet, reach: 0, count: 0 };
      }
      acc[outlet].reach += clipping.reach || 0;
      acc[outlet].count += 1;
      return acc;
    }, {} as Record<string, { name: string; reach: number; count: number }>);

    return Object.values(outletStats)
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 5);
  }, [clippings]);

  const sentimentData = useMemo(() => {
    const counts = {
      positive: clippings.filter(c => c.sentiment === 'positive').length,
      neutral: clippings.filter(c => c.sentiment === 'neutral').length,
      negative: clippings.filter(c => c.sentiment === 'negative').length
    };

    return [
      { name: 'Positiv', value: counts.positive, color: BRAND_COLORS.success },
      { name: 'Neutral', value: counts.neutral, color: BRAND_COLORS.gray },
      { name: 'Negativ', value: counts.negative, color: BRAND_COLORS.danger }
    ].filter(item => item.value > 0);
  }, [clippings]);

  const emailStats = useMemo(() => {
    const total = sends.length;
    const opened = sends.filter(s => s.status === 'opened' || s.status === 'clicked').length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const withClippings = sends.filter(s => s.clippingId).length;

    return {
      total,
      opened,
      clicked,
      withClippings,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      conversionRate: opened > 0 ? Math.round((withClippings / opened) * 100) : 0
    };
  }, [sends]);

  const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
  const totalAVE = clippings.reduce((sum, c) => sum + calculateAVE(c), 0);

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
              {totalReach.toLocaleString('de-DE')}
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
              {emailStats.openRate}%
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
              {emailStats.conversionRate}%
            </div>
            <Text className="text-xs text-gray-500 mt-1">
              Öffnungen → Clippings
            </Text>
          </div>
        </div>
      </div>

      {timelineData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Veröffentlichungen über Zeit</Subheading>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
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
        {outletDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <NewspaperIcon className="h-5 w-5 text-[#005fab]" />
              <Subheading>Medium-Verteilung</Subheading>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={outletDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {outletDistribution.map((entry, index) => (
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
              {outletDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                  <Text className="text-sm text-gray-600">{item.name}: {item.count}</Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {sentimentData.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#005fab]" />
              <Subheading>Sentiment-Verteilung</Subheading>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {sentimentData.map((entry, index) => (
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
              {sentimentData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                  <Text className="text-sm text-gray-600">{item.name}: {item.value}</Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {topOutlets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Top 5 Medien nach Reichweite</Subheading>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topOutlets} layout="vertical">
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