import React from 'react';
import { Subheading } from '@/components/ui/heading';
import { TrophyIcon } from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TopOutlet {
  name: string;
  reach: number;
  count: number;
}

interface TopOutletsChartProps {
  data: TopOutlet[];
}

const BRAND_COLORS = {
  primary: '#005fab',
};

export const TopOutletsChart = React.memo(function TopOutletsChart({
  data,
}: TopOutletsChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon className="h-5 w-5 text-[#005fab]" />
        <Subheading>Top 5 Medien nach Reichweite</Subheading>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
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
              borderRadius: '8px',
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
  );
});
