'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';

interface StrategieOverviewProps {
  // DNA Status
  dnaDocumentsCount: number; // 0-6
  hasDNASynthese: boolean;
  dnaTokens: number;

  // Kernbotschaft Status
  hasKernbotschaft: boolean;
  kernbotschaftStatus: 'draft' | 'completed' | null;
  kernbotschaftTokens: number;

  // PM-Vorlage Status
  hasPMVorlage: boolean;
  pmVorlageTokens: number;
}

export function StrategieOverview({
  dnaDocumentsCount,
  hasDNASynthese,
  dnaTokens,
  hasKernbotschaft,
  kernbotschaftStatus,
  kernbotschaftTokens,
  hasPMVorlage,
  pmVorlageTokens,
}: StrategieOverviewProps) {
  // Pipeline berechnen
  const pipelineSteps = [
    { name: 'DNA Synthese', completed: hasDNASynthese, color: '#9333ea' },
    { name: 'Kernbotschaft', completed: hasKernbotschaft, color: '#2563eb' },
    { name: 'PM-Vorlage', completed: hasPMVorlage, color: '#0891b2' },
  ];

  const completedSteps = pipelineSteps.filter(s => s.completed).length;
  const pipelinePercent = Math.round((completedSteps / 3) * 100);

  // Pipeline Ring Data
  const pipelineData = pipelineSteps.map(step => ({
    name: step.name,
    value: 1,
    color: step.completed ? step.color : '#e4e4e7', // zinc-200 für nicht fertig
  }));

  // Token-Verteilung
  const totalTokens = dnaTokens + kernbotschaftTokens + pmVorlageTokens;

  const tokenData = [
    { name: 'DNA Synthese', value: dnaTokens || 1, color: '#9333ea' },
    { name: 'Kernbotschaft', value: kernbotschaftTokens || 1, color: '#2563eb' },
    { name: 'PM-Vorlage', value: pmVorlageTokens || 1, color: '#0891b2' },
  ].filter(item => item.value > 0);

  // Status Text Helper
  const getKernbotschaftStatusText = () => {
    if (!hasKernbotschaft) return 'Ausstehend';
    return kernbotschaftStatus === 'completed' ? 'Fertig' : 'Entwurf';
  };

  // Legende-Daten (einmalig für beide Ringe)
  const legendItems = [
    { name: 'DNA Synthese', color: '#9333ea' },
    { name: 'Kernbotschaft', color: '#2563eb' },
    { name: 'PM-Vorlage', color: '#0891b2' },
  ];

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
      <Text className="text-lg font-semibold text-zinc-900 mb-4">Strategie-Übersicht</Text>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_auto_auto_1fr] gap-8 items-center">
        {/* Ring 1: Pipeline */}
        <div className="flex flex-col items-center">
          <Text className="text-sm font-medium text-zinc-600 mb-3">Pipeline</Text>
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-zinc-900">{pipelinePercent}%</span>
              <span className="text-base text-zinc-500">{completedSteps}/3</span>
            </div>
          </div>
        </div>

        {/* Ring 2: Token-Verteilung */}
        <div className="flex flex-col items-center">
          <Text className="text-sm font-medium text-zinc-600 mb-3">Token-Verteilung</Text>
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={tokenData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-zinc-900">~{totalTokens.toLocaleString('de-DE')}</span>
              <span className="text-base text-zinc-500">Tokens</span>
            </div>
          </div>
        </div>

        {/* Gemeinsame Legende (nur Farben + Namen) */}
        <div className="flex flex-col justify-center space-y-3 mr-8">
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <Text className="text-sm text-zinc-700 whitespace-nowrap">{item.name}</Text>
            </div>
          ))}
        </div>

        {/* Stats Liste */}
        <div className="flex flex-col justify-center">
          <Text className="text-sm font-medium text-zinc-600 mb-3">Status</Text>
          <div className="space-y-2">
            {/* DNA Status */}
            <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg border border-purple-100">
              <Text className="text-sm text-purple-700">DNA Synthese</Text>
              <div className="flex items-center gap-2">
                <Text className="text-sm font-semibold text-purple-900">
                  {dnaDocumentsCount}/6
                </Text>
                {hasDNASynthese && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
              </div>
            </div>

            {/* Kernbotschaft Status */}
            <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-blue-100">
              <Text className="text-sm text-blue-700">Kernbotschaft</Text>
              <div className="flex items-center gap-2">
                <Text className="text-sm font-semibold text-blue-900">
                  {getKernbotschaftStatusText()}
                </Text>
                {hasKernbotschaft && kernbotschaftStatus === 'completed' && (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>

            {/* PM-Vorlage Status */}
            <div className="flex items-center justify-between p-2.5 bg-cyan-50 rounded-lg border border-cyan-100">
              <Text className="text-sm text-cyan-700">PM-Vorlage</Text>
              <div className="flex items-center gap-2">
                <Text className="text-sm font-semibold text-cyan-900">
                  {hasPMVorlage ? 'Fertig' : 'Ausstehend'}
                </Text>
                {hasPMVorlage && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
              </div>
            </div>

            {/* Gesamt-Tokens */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 mt-1">
              <Text className="text-sm text-zinc-600">Gesamt-Tokens</Text>
              <Text className="text-sm font-bold text-zinc-900">
                ~{totalTokens.toLocaleString('de-DE')}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
