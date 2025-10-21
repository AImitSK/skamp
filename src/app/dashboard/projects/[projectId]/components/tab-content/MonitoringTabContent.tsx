'use client';

import React from 'react';
import { ProjectMonitoringTab } from '@/components/projects/ProjectMonitoringTab';

interface MonitoringTabContentProps {
  projectId: string;
}

export function MonitoringTabContent({
  projectId
}: MonitoringTabContentProps) {
  return (
    <ProjectMonitoringTab projectId={projectId} />
  );
}
