import React from 'react';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { NewspaperIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface OutletDistribution {
  name: string;
  count: number;
  reach: number;
}

interface MediaDistributionChartProps {
  data: OutletDistribution[];
}

const CHART_COLORS = ['#005fab', '#3397d7', '#add8f0', '#DEDC00', '#10b981'];

/**
 * Mappt outletType zu lesbarem Label mit Icon
 *
 * @param outletType - Der rohe outletType aus MediaClipping ('print', 'online', etc.)
 * @returns Formatiertes Label mit Icon (z.B. '📰 Print')
 */
function getOutletTypeLabel(outletType: string): string {
  switch (outletType.toLowerCase()) {
    case 'print':
      return '📰 Print';
    case 'online':
      return '💻 Online';
    case 'broadcast':
      return '📺 Broadcast';
    case 'audio':
      return '🎧 Podcast';
    case 'blog':
      // Temporär für Migration - blog-Clippings sollten zu 'online' migriert werden
      return '💻 Blog (veraltet)';
    default:
      // Fallback: Unbekannte Types anzeigen wie sie sind
      return outletType;
  }
}

export const MediaDistributionChart = React.memo(function MediaDistributionChart({
  data,
}: MediaDistributionChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <NewspaperIcon className="h-5 w-5 text-[#005fab]" />
        <Subheading>Medium-Verteilung</Subheading>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
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
              borderRadius: '8px',
            }}
            formatter={(value, name) => [value, getOutletTypeLabel(name as string)]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
            />
            <Text className="text-sm text-gray-600">
              {getOutletTypeLabel(item.name)}: {item.count}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
});
