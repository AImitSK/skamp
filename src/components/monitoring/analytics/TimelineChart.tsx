import React from 'react';
import { Subheading } from '@/components/ui/heading';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TimelineDataPoint {
  date: string;
  clippings: number;
  reach: number;
}

interface TimelineChartProps {
  data: TimelineDataPoint[];
}

const BRAND_COLORS = {
  primary: '#005fab',
  secondary: '#DEDC00',
};

export const TimelineChart = React.memo(function TimelineChart({
  data,
}: TimelineChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ArrowTrendingUpIcon className="h-5 w-5 text-[#005fab]" />
        <Subheading>Veröffentlichungen über Zeit</Subheading>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{
              value: 'Anzahl',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{
              value: 'Reichweite',
              angle: 90,
              position: 'insideRight',
              fill: '#6b7280',
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
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
  );
});
