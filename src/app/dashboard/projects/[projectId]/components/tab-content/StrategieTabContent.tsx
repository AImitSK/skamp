'use client';

import React from 'react';
import { Project } from '@/types/project';

interface StrategieTabContentProps {
  project: Project;
  organizationId: string;
  userId?: string;
  dokumenteFolder: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function StrategieTabContent({
  project,
  organizationId,
  userId,
  dokumenteFolder,
  foldersLoading,
  onRefresh
}: StrategieTabContentProps) {
  const companyId = project.customer?.id;
  const companyName = project.customer?.name || '';

  return (
    <div className="space-y-6">
      {/* TODO Phase 4: Neue Strategie-Tab Komponenten */}
      {/* 1. DNA Synthese Section */}
      {/* 2. Kernbotschaft Chat */}
      {/* 3. AI Sequenz Button */}
      {/* 4. Text-Matrix Section */}

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-2">
          Strategie-Tab Umbau (Phase 4)
        </h3>
        <p className="text-sm text-zinc-600">
          Die CeleroPress Formel wird hier implementiert:
        </p>
        <ul className="mt-3 space-y-1 text-sm text-zinc-600 list-disc list-inside">
          <li>🧪 DNA Synthese (Token-optimierte Kurzform der Marken-DNA)</li>
          <li>💬 Kernbotschaft (Chat-basierte Erstellung für dieses Projekt)</li>
          <li>🧬 AI Sequenz (KI-Prozess kombiniert DNA + Kernbotschaft)</li>
          <li>📋 Text-Matrix (Strategisches Roh-Skelett)</li>
          <li>📰 Pressemeldung (nach Human Sign-off)</li>
        </ul>
      </div>
    </div>
  );
}
