# Refactoring-Plan 03: Projekt-Monitoring-Steuerung

**Datum:** 25.11.2025
**Status:** Geplant
**Priorität:** Hoch
**Abhängigkeit:** Nach 02-automatische-keywords.md

---

## Zusammenfassung

Neue Monitoring-Steuerungs-Box im Projekt-Tab "Monitoring":
- **Default ON** mit 30 Tagen nach Kampagnen-Versand
- Einfache Verlängerung (+30, +60, +90 Tage)
- Ein/Aus-Schalter
- Info "Endet in X Tagen"

**Vorteil:** Erscheint erst nach Versand, User bekommt Minimal-Monitoring ohne Einstellungen.

---

## Konzept

### Ansicht: Monitoring aktiv

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Monitoring                                          [Aktiv ●]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Läuft noch 23 Tage        [+30 Tage] [+60 Tage] [+90 Tage]        │
│  ████████████░░░░░░░░░░                                            │
│  Gestartet: 15.11.2025 · Endet: 15.12.2025                         │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  12 Auto-Funde · 3 bestätigt · 0 abgelehnt                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Ansicht: Monitoring deaktiviert

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Monitoring                                     [Deaktiviert ○] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Monitoring wurde am 10.12.2025 deaktiviert.                       │
│                                                                     │
│  Gefunden: 15 Artikel · Bestätigt: 8 · Abgelehnt: 2                │
│                                                                     │
│                              [Wieder aktivieren (+30 Tage)]        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Ansicht: Monitoring abgelaufen

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Monitoring                                      [Abgelaufen ○] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Monitoring-Zeitraum endete am 15.12.2025.                         │
│                                                                     │
│  Gefunden: 15 Artikel · Bestätigt: 8 · Abgelehnt: 2                │
│                                                                     │
│                                    [Verlängern (+30 Tage)]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Ablauf

```
Kampagne erstellt (Draft)
       │
       ▼
Kampagne versendet
       │
       ▼
┌──────────────────────────────────────────┐
│ AUTOMATISCH beim Versand:                │
│                                          │
│ 1. CampaignMonitoringTracker erstellen   │
│    • isActive = true                     │
│    • startDate = jetzt                   │
│    • endDate = jetzt + 30 Tage           │
│                                          │
│ 2. Keywords aus Company extrahieren      │
│    (siehe Refactoring-Plan 02)           │
│                                          │
│ 3. Channels aus Empfänger-Publikationen  │
│    • RSS-Feeds der Publikationen         │
│    • Optional: Google News Channel       │
│                                          │
└──────────────────────────────────────────┘
       │
       ▼
Projekt → Tab "Monitoring"
       │
       ▼
┌──────────────────────────────────────────┐
│ Monitoring-Steuerungs-Box (NEU)          │
│ + ProjectMonitoringOverview (existiert)  │
└──────────────────────────────────────────┘
```

---

## Betroffene Dateien

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/components/projects/monitoring/MonitoringControlBox.tsx` | Neue Steuerungs-Komponente |

### Zu ändern

| Datei | Änderung |
|-------|----------|
| `src/components/projects/ProjectMonitoringTab.tsx` | MonitoringControlBox einbinden |
| `src/lib/firebase/campaign-monitoring-service.ts` | Neue Funktionen für Verlängerung |
| `src/lib/hooks/useMonitoringData.ts` | Hook für Tracker-Status erweitern |

### Bestehend (keine Änderung)

| Datei | Beschreibung |
|-------|--------------|
| `src/types/monitoring.ts` | CampaignMonitoringTracker (passt bereits) |
| `src/components/projects/monitoring/ProjectMonitoringOverview.tsx` | Bleibt unverändert |

---

## Implementierung

### 1. Neue Komponente: MonitoringControlBox.tsx

```typescript
// src/components/projects/monitoring/MonitoringControlBox.tsx
'use client';

import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CampaignMonitoringTracker } from '@/types/monitoring';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface MonitoringControlBoxProps {
  tracker: CampaignMonitoringTracker | null;
  isLoading: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  onExtend: (days: 30 | 60 | 90) => Promise<void>;
}

export function MonitoringControlBox({
  tracker,
  isLoading,
  onToggle,
  onExtend
}: MonitoringControlBoxProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // Kein Tracker = Noch keine Kampagne versendet
  if (!tracker) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
          <div>
            <Text className="font-medium text-gray-700">Monitoring</Text>
            <Text className="text-sm text-gray-500">
              Wird automatisch aktiviert, sobald eine Kampagne versendet wird.
            </Text>
          </div>
        </div>
      </div>
    );
  }

  // Status berechnen
  const now = new Date();
  const endDate = tracker.endDate.toDate();
  const startDate = tracker.startDate.toDate();
  const daysRemaining = differenceInDays(endDate, now);
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(now, startDate);
  const progressPercent = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const isExpired = daysRemaining <= 0;
  const isActive = tracker.isActive && !isExpired;

  // Status Badge
  const getStatusBadge = () => {
    if (!tracker.isActive) {
      return <Badge color="zinc">Deaktiviert</Badge>;
    }
    if (isExpired) {
      return <Badge color="amber">Abgelaufen</Badge>;
    }
    return <Badge color="green">Aktiv</Badge>;
  };

  // Toggle Handler
  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(!tracker.isActive);
    } finally {
      setIsToggling(false);
    }
  };

  // Extend Handler
  const handleExtend = async (days: 30 | 60 | 90) => {
    setIsExtending(true);
    try {
      await onExtend(days);
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-[#005fab]" />
          <Text className="font-semibold text-gray-900 text-lg">Monitoring</Text>
          {getStatusBadge()}
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          <Text className="text-sm text-gray-600">
            {tracker.isActive ? 'Aktiv' : 'Inaktiv'}
          </Text>
          <Switch
            checked={tracker.isActive}
            onChange={handleToggle}
            disabled={isToggling || isLoading}
            className={`${
              tracker.isActive ? 'bg-[#005fab]' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span
              className={`${
                tracker.isActive ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>
      </div>

      {/* Content - Aktiv */}
      {isActive && (
        <>
          {/* Zeit-Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-500" />
                <Text className="text-sm text-gray-600">
                  Läuft noch <span className="font-semibold text-gray-900">{daysRemaining} Tage</span>
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  plain
                  onClick={() => handleExtend(30)}
                  disabled={isExtending}
                  className="!text-[#005fab] hover:!bg-blue-50"
                >
                  +30 Tage
                </Button>
                <Button
                  size="sm"
                  plain
                  onClick={() => handleExtend(60)}
                  disabled={isExtending}
                  className="!text-[#005fab] hover:!bg-blue-50"
                >
                  +60 Tage
                </Button>
                <Button
                  size="sm"
                  plain
                  onClick={() => handleExtend(90)}
                  disabled={isExtending}
                  className="!text-[#005fab] hover:!bg-blue-50"
                >
                  +90 Tage
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[#005fab] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between mt-1">
              <Text className="text-xs text-gray-500">
                Gestartet: {format(startDate, 'dd.MM.yyyy', { locale: de })}
              </Text>
              <Text className="text-xs text-gray-500">
                Endet: {format(endDate, 'dd.MM.yyyy', { locale: de })}
              </Text>
            </div>
          </div>

          {/* Statistiken */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">{tracker.totalArticlesFound}</span>
                <span className="text-gray-600">Auto-Funde</span>
              </div>
              <span className="text-gray-300">·</span>
              <div className="flex items-center gap-1">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-gray-900">{tracker.totalAutoConfirmed}</span>
                <span className="text-gray-600">bestätigt</span>
              </div>
              <span className="text-gray-300">·</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">{tracker.totalManuallyAdded}</span>
                <span className="text-gray-600">manuell</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content - Deaktiviert */}
      {!tracker.isActive && !isExpired && (
        <div className="text-center py-4">
          <Text className="text-gray-600 mb-3">
            Monitoring wurde deaktiviert.
          </Text>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-4">
            <span>{tracker.totalArticlesFound} gefunden</span>
            <span>·</span>
            <span>{tracker.totalAutoConfirmed} bestätigt</span>
          </div>
          <Button
            onClick={handleToggle}
            disabled={isToggling}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            Wieder aktivieren
          </Button>
        </div>
      )}

      {/* Content - Abgelaufen */}
      {isExpired && (
        <div className="text-center py-4">
          <Text className="text-gray-600 mb-1">
            Monitoring-Zeitraum endete am {format(endDate, 'dd.MM.yyyy', { locale: de })}.
          </Text>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-4">
            <span>{tracker.totalArticlesFound} gefunden</span>
            <span>·</span>
            <span>{tracker.totalAutoConfirmed} bestätigt</span>
          </div>
          <Button
            onClick={() => handleExtend(30)}
            disabled={isExtending}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Verlängern (+30 Tage)
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 2. Service-Erweiterung: campaign-monitoring-service.ts

```typescript
// Neue Funktionen hinzufügen zu src/lib/firebase/campaign-monitoring-service.ts

/**
 * Verlängert den Monitoring-Zeitraum um X Tage
 */
export async function extendMonitoringPeriod(
  trackerId: string,
  additionalDays: 30 | 60 | 90,
  organizationId: string
): Promise<void> {
  const trackerRef = doc(db, 'organizations', organizationId, 'monitoring_trackers', trackerId);
  const trackerDoc = await getDoc(trackerRef);

  if (!trackerDoc.exists()) {
    throw new Error('Tracker nicht gefunden');
  }

  const tracker = trackerDoc.data() as CampaignMonitoringTracker;
  const currentEndDate = tracker.endDate.toDate();
  const now = new Date();

  // Wenn abgelaufen, von jetzt an rechnen, sonst von aktuellem Ende
  const baseDate = currentEndDate < now ? now : currentEndDate;
  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + additionalDays);

  await updateDoc(trackerRef, {
    endDate: Timestamp.fromDate(newEndDate),
    isActive: true, // Reaktivieren falls deaktiviert
    updatedAt: serverTimestamp()
  });
}

/**
 * Aktiviert/Deaktiviert das Monitoring
 */
export async function toggleMonitoring(
  trackerId: string,
  isActive: boolean,
  organizationId: string
): Promise<void> {
  const trackerRef = doc(db, 'organizations', organizationId, 'monitoring_trackers', trackerId);

  await updateDoc(trackerRef, {
    isActive,
    updatedAt: serverTimestamp()
  });
}

/**
 * Lädt den Tracker für ein Projekt (über verknüpfte Kampagnen)
 */
export async function getTrackerForProject(
  projectId: string,
  organizationId: string
): Promise<CampaignMonitoringTracker | null> {
  // Lade verknüpfte Kampagnen des Projekts
  const projectRef = doc(db, 'organizations', organizationId, 'projects', projectId);
  const projectDoc = await getDoc(projectRef);

  if (!projectDoc.exists()) {
    return null;
  }

  const project = projectDoc.data();
  const campaignIds = project.linkedCampaigns || [];

  if (campaignIds.length === 0) {
    return null;
  }

  // Suche aktiven Tracker für eine der Kampagnen
  const trackersRef = collection(db, 'organizations', organizationId, 'monitoring_trackers');

  for (const campaignId of campaignIds) {
    const q = query(trackersRef, where('campaignId', '==', campaignId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as CampaignMonitoringTracker;
    }
  }

  return null;
}
```

### 3. Hook-Erweiterung: useMonitoringData.ts

```typescript
// Neue Hook hinzufügen zu src/lib/hooks/useMonitoringData.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignMonitoringService } from '@/lib/firebase/campaign-monitoring-service';

/**
 * Hook für Projekt-Monitoring-Tracker
 */
export function useProjectMonitoringTracker(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['project-monitoring-tracker', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) return null;
      return campaignMonitoringService.getTrackerForProject(projectId, organizationId);
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 30 * 1000, // 30 Sekunden
  });
}

/**
 * Mutation: Monitoring verlängern
 */
export function useExtendMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackerId,
      days,
      organizationId
    }: {
      trackerId: string;
      days: 30 | 60 | 90;
      organizationId: string;
    }) => {
      return campaignMonitoringService.extendMonitoringPeriod(trackerId, days, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-monitoring-tracker'] });
    }
  });
}

/**
 * Mutation: Monitoring ein/ausschalten
 */
export function useToggleMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackerId,
      isActive,
      organizationId
    }: {
      trackerId: string;
      isActive: boolean;
      organizationId: string;
    }) => {
      return campaignMonitoringService.toggleMonitoring(trackerId, isActive, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-monitoring-tracker'] });
    }
  });
}
```

### 4. Integration in ProjectMonitoringTab.tsx

```typescript
// src/components/projects/ProjectMonitoringTab.tsx
// Änderungen markiert mit // 🆕 NEU

'use client';

import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';
import {
  useProjectMonitoringData,
  useProjectMonitoringTracker,  // 🆕 NEU
  useExtendMonitoring,          // 🆕 NEU
  useToggleMonitoring,          // 🆕 NEU
  useConfirmSuggestion,
  useRejectSuggestion
} from '@/lib/hooks/useMonitoringData';
import { MonitoringControlBox } from '@/components/projects/monitoring/MonitoringControlBox'; // 🆕 NEU
import { ProjectMonitoringOverview } from '@/components/projects/monitoring/ProjectMonitoringOverview';
// ... restliche imports

export function ProjectMonitoringTab({ projectId }: ProjectMonitoringTabProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // 🆕 NEU: Tracker-Status laden
  const {
    data: tracker,
    isLoading: trackerLoading
  } = useProjectMonitoringTracker(projectId, currentOrganization?.id);

  // 🆕 NEU: Mutations
  const extendMonitoring = useExtendMonitoring();
  const toggleMonitoring = useToggleMonitoring();

  // Bestehende Hooks...
  const { data, isLoading, error, refetch } = useProjectMonitoringData(/*...*/);

  // 🆕 NEU: Handler für Steuerungs-Box
  const handleToggle = async (enabled: boolean) => {
    if (!tracker?.id || !currentOrganization) return;

    try {
      await toggleMonitoring.mutateAsync({
        trackerId: tracker.id,
        isActive: enabled,
        organizationId: currentOrganization.id
      });
      toastService.success(enabled ? 'Monitoring aktiviert' : 'Monitoring deaktiviert');
    } catch (error) {
      toastService.error('Fehler beim Ändern des Monitoring-Status');
    }
  };

  const handleExtend = async (days: 30 | 60 | 90) => {
    if (!tracker?.id || !currentOrganization) return;

    try {
      await extendMonitoring.mutateAsync({
        trackerId: tracker.id,
        days,
        organizationId: currentOrganization.id
      });
      toastService.success(`Monitoring um ${days} Tage verlängert`);
    } catch (error) {
      toastService.error('Fehler beim Verlängern des Monitorings');
    }
  };

  // ... restlicher Code

  return (
    <div className="space-y-6">
      {/* 🆕 NEU: Monitoring-Steuerungs-Box OBEN */}
      <MonitoringControlBox
        tracker={tracker}
        isLoading={trackerLoading}
        onToggle={handleToggle}
        onExtend={handleExtend}
      />

      {/* Bestehende Inhalte... */}
      {activeView === 'overview' && (
        <ProjectMonitoringOverview /* ... */ />
      )}
      {/* ... */}
    </div>
  );
}
```

---

## Automatische Aktivierung bei Kampagnen-Versand

Der Tracker wird bereits beim Versand erstellt (existierender Code in `prService`).
Wir müssen nur sicherstellen, dass die Default-Werte stimmen:

```typescript
// In createTrackerForCampaign() - bereits vorhanden, Default-Werte prüfen:

const tracker: CampaignMonitoringTracker = {
  organizationId,
  campaignId,
  startDate: Timestamp.now(),
  endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 Tage
  isActive: true, // DEFAULT: ON
  channels: [],
  totalArticlesFound: 0,
  totalAutoConfirmed: 0,
  totalManuallyAdded: 0,
  totalSpamMarked: 0,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};
```

---

## Checkliste

- [ ] `MonitoringControlBox.tsx` erstellen
- [ ] Service-Funktionen in `campaign-monitoring-service.ts` hinzufügen
- [ ] Hooks in `useMonitoringData.ts` hinzufügen
- [ ] `ProjectMonitoringTab.tsx` anpassen
- [ ] Default-Werte bei Tracker-Erstellung prüfen (30 Tage, isActive=true)
- [ ] Styling mit Design-System abstimmen
- [ ] Unit-Tests schreiben
- [ ] Manueller Test: Kampagne versenden → Tab prüfen → Verlängern testen

---

## Risiko-Bewertung

| Risiko | Bewertung | Grund |
|--------|-----------|-------|
| Breaking Changes | Niedrig | Neue Komponente, bestehende bleiben |
| UX-Verbesserung | Hoch | Klare Steuerung, einfache Bedienung |
| Performance | Niedrig | Ein zusätzlicher Query |

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| Keine Monitoring-Steuerung in UI | Klare Box mit Status |
| Unklar ob Monitoring läuft | "Läuft noch X Tage" |
| Keine Verlängerung möglich | +30/+60/+90 Tage Buttons |
| Einstellungen vor Versand nötig | Automatisch ON nach Versand |

---

*Erstellt am 25.11.2025*
