# Super Admin Monitoring & Control Center - Implementierungsplan

## 🎯 Ziel
Ein zentrales Dashboard für Super-Admins zur Überwachung und Steuerung des automatischen Monitoring-Systems über alle Organisationen hinweg.

## ✅ IMPLEMENTIERUNGS-CHECKLISTE

### Phase 1: Backend Services & APIs
- [ ] 1.1 Monitoring Statistics Service erstellen
- [ ] 1.2 Crawler Control Service erstellen
- [ ] 1.3 Error Logging Service erstellen
- [ ] 1.4 API Routes für Control Actions

### Phase 2: Control Features
- [ ] 2.1 Cron Job Pause/Resume Mechanismus
- [ ] 2.2 Manual Trigger API (alle Orgs)
- [ ] 2.3 Manual Trigger API (einzelne Org)
- [ ] 2.4 Manual Trigger API (einzelne Kampagne)

### Phase 3: UI Komponenten
- [ ] 3.1 System Overview Dashboard
- [ ] 3.2 Organization Breakdown Table
- [ ] 3.3 Control Panel Component
- [ ] 3.4 Error Log Table

### Phase 4: Main Page Integration
- [ ] 4.1 Monitoring Control Center Page
- [ ] 4.2 Navigation Integration
- [ ] 4.3 Real-time Updates (optional)

### Phase 5: Testing & Rollout
- [ ] 5.1 Testing durchführen
- [ ] 5.2 Produktiv-Rollout

---

## 📋 Phase 1: Backend Services & APIs

### 1.1 Monitoring Statistics Service

**Datei:** `src/lib/firebase/monitoring-stats-service.ts` (NEU)

**Funktionen:**
```typescript
class MonitoringStatsService {
  /**
   * Lädt aggregierte System-Statistiken
   */
  async getSystemStats(): Promise<{
    totalActiveTrackers: number;
    totalArticlesFoundToday: number;
    totalArticlesFoundTotal: number;
    totalAutoConfirmed: number;
    totalPending: number;
    lastCrawlRun?: {
      timestamp: Timestamp;
      duration: number;
      trackersProcessed: number;
      articlesFound: number;
      status: 'success' | 'failed';
      errorMessage?: string;
    };
  }>;

  /**
   * Lädt Statistiken pro Organization
   */
  async getOrganizationStats(): Promise<Array<{
    organizationId: string;
    organizationName: string;
    activeTrackers: number;
    articlesFound: number;
    autoConfirmedRate: number;
    lastActivity?: Timestamp;
  }>>;

  /**
   * Lädt Channel Health Status
   */
  async getChannelHealth(): Promise<Array<{
    channelId: string;
    type: 'rss_feed' | 'google_news';
    url: string;
    publicationName: string;
    errorCount: number;
    lastError?: string;
    lastSuccess?: Timestamp;
    organizationId: string;
  }>>;
}
```

**Implementierung:**
- Query über alle `campaign_monitoring_trackers`
- Aggregation mit Firestore Queries
- Caching für Performance (5 Minuten)

---

### 1.2 Crawler Control Service

**Datei:** `src/lib/firebase/crawler-control-service.ts` (NEU)

**Funktionen:**
```typescript
class CrawlerControlService {
  /**
   * Cron Job Status (Feature Flag)
   */
  async getCronJobStatus(): Promise<{
    isEnabled: boolean;
    pausedAt?: Timestamp;
    pausedBy?: string;
    reason?: string;
  }>;

  /**
   * Cron Job pausieren
   */
  async pauseCronJob(
    userId: string,
    reason: string
  ): Promise<void>;

  /**
   * Cron Job aktivieren
   */
  async resumeCronJob(userId: string): Promise<void>;

  /**
   * Manueller Crawler-Run (alle Orgs)
   */
  async triggerManualCrawl(): Promise<{
    jobId: string;
    status: 'started';
  }>;

  /**
   * Manueller Crawler-Run (einzelne Org)
   */
  async triggerOrgCrawl(organizationId: string): Promise<{
    jobId: string;
    status: 'started';
  }>;

  /**
   * Manueller Crawler-Run (einzelne Kampagne)
   */
  async triggerCampaignCrawl(campaignId: string): Promise<{
    jobId: string;
    status: 'started';
  }>;
}
```

**Feature Flag Collection:**
```typescript
// Firestore: /system_config/crawler_config
{
  isEnabled: boolean;
  pausedAt?: Timestamp;
  pausedBy?: string;
  pausedReason?: string;
  updatedAt: Timestamp;
}
```

---

### 1.3 Error Logging Service

**Datei:** `src/lib/firebase/crawler-error-log-service.ts` (NEU)

**Funktionen:**
```typescript
class CrawlerErrorLogService {
  /**
   * Lädt Error Logs
   */
  async getErrorLogs(
    options?: {
      organizationId?: string;
      limit?: number;
      startAfter?: Timestamp;
    }
  ): Promise<Array<{
    id: string;
    timestamp: Timestamp;
    type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
    organizationId?: string;
    campaignId?: string;
    channelId?: string;
    errorMessage: string;
    stackTrace?: string;
    metadata?: any;
  }>>;

  /**
   * Erstellt Error Log Entry
   */
  async logError(errorData: {
    type: string;
    organizationId?: string;
    campaignId?: string;
    channelId?: string;
    errorMessage: string;
    stackTrace?: string;
    metadata?: any;
  }): Promise<void>;

  /**
   * Bereinigt alte Logs (> 30 Tage)
   */
  async cleanupOldLogs(): Promise<number>;
}
```

**Error Log Collection:**
```typescript
// Firestore: /crawler_error_logs/{logId}
{
  timestamp: Timestamp;
  type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
  organizationId?: string;
  campaignId?: string;
  channelId?: string;
  errorMessage: string;
  stackTrace?: string;
  metadata?: any;
  createdAt: Timestamp;
}
```

---

### 1.4 API Routes für Control Actions

**Datei:** `src/app/api/admin/crawler-control/route.ts` (NEU)

```typescript
// POST /api/admin/crawler-control
export async function POST(request: NextRequest) {
  // Super Admin Check
  const user = await verifyAuth(request);
  if (!isSuperAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { action, payload } = body;

  switch (action) {
    case 'pause':
      await crawlerControlService.pauseCronJob(user.uid, payload.reason);
      return NextResponse.json({ success: true });

    case 'resume':
      await crawlerControlService.resumeCronJob(user.uid);
      return NextResponse.json({ success: true });

    case 'trigger_all':
      const result = await crawlerControlService.triggerManualCrawl();
      return NextResponse.json(result);

    case 'trigger_org':
      const orgResult = await crawlerControlService.triggerOrgCrawl(payload.organizationId);
      return NextResponse.json(orgResult);

    case 'trigger_campaign':
      const campaignResult = await crawlerControlService.triggerCampaignCrawl(payload.campaignId);
      return NextResponse.json(campaignResult);

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
```

**Datei:** `src/app/api/admin/monitoring-stats/route.ts` (NEU)

```typescript
// GET /api/admin/monitoring-stats
export async function GET(request: NextRequest) {
  // Super Admin Check
  const user = await verifyAuth(request);
  if (!isSuperAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const stats = await monitoringStatsService.getSystemStats();
  const orgStats = await monitoringStatsService.getOrganizationStats();
  const channelHealth = await monitoringStatsService.getChannelHealth();

  return NextResponse.json({
    system: stats,
    organizations: orgStats,
    channelHealth
  });
}
```

---

## 📋 Phase 2: Control Features

### 2.1 Cron Job Pause/Resume Mechanismus

**Crawler Route Update:**

```typescript
// src/app/api/cron/monitoring-crawler/route.ts

export async function GET(request: NextRequest) {
  // Auth Check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 🆕 FEATURE FLAG CHECK
  const crawlerConfig = await getCrawlerConfig();
  if (!crawlerConfig.isEnabled) {
    console.log('⏸️ Crawler is paused. Skipping run.');
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: crawlerConfig.pausedReason || 'Crawler paused by admin'
    });
  }

  // Rest des Crawlers...
}
```

---

### 2.2 Manual Trigger API (alle Orgs)

**Implementierung:**
- Ruft die gleiche Crawler-Logik auf
- Läuft außerhalb des Cron-Schedules
- Tracked als "manual_run" im Log

```typescript
async triggerManualCrawl(): Promise<{ jobId: string; status: 'started' }> {
  const jobId = `manual_${Date.now()}`;

  // Start Crawler in Background
  fetch('/api/cron/monitoring-crawler', {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${process.env.CRON_SECRET}`,
      'x-manual-trigger': 'true',
      'x-job-id': jobId
    }
  });

  return { jobId, status: 'started' };
}
```

---

### 2.3 Manual Trigger API (einzelne Org)

**Implementierung:**
- Filter nur Tracker einer Organization
- Gleiche Logik wie Full Crawler

```typescript
async triggerOrgCrawl(organizationId: string): Promise<{ jobId: string }> {
  const jobId = `org_${organizationId}_${Date.now()}`;

  // Lade nur Tracker dieser Org
  const trackersQuery = query(
    collection(db, 'campaign_monitoring_trackers'),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true)
  );

  // Crawle diese Tracker
  // ...
}
```

---

### 2.4 Manual Trigger API (einzelne Kampagne)

**Implementierung:**
- Crawle nur einen spezifischen Tracker

```typescript
async triggerCampaignCrawl(campaignId: string): Promise<{ jobId: string }> {
  const tracker = await getTrackerByCampaignId(campaignId);

  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Crawle nur diesen Tracker
  await crawlTracker(tracker);
}
```

---

## 📋 Phase 3: UI Komponenten

### 3.1 System Overview Dashboard

**Component:** `src/components/monitoring/SystemOverview.tsx`

```tsx
interface SystemOverviewProps {
  stats: {
    totalActiveTrackers: number;
    totalArticlesFoundToday: number;
    totalArticlesFoundTotal: number;
    totalAutoConfirmed: number;
    totalPending: number;
    lastCrawlRun?: {
      timestamp: Timestamp;
      duration: number;
      trackersProcessed: number;
      articlesFound: number;
      status: 'success' | 'failed';
    };
  };
}

export function SystemOverview({ stats }: SystemOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Stat Cards */}
      <StatCard
        title="Aktive Tracker"
        value={stats.totalActiveTrackers}
        icon={ChartBarIcon}
        trend={...}
      />

      <StatCard
        title="Artikel heute"
        value={stats.totalArticlesFoundToday}
        icon={NewspaperIcon}
      />

      <StatCard
        title="Auto-Confirmed"
        value={stats.totalAutoConfirmed}
        icon={CheckCircleIcon}
        color="green"
      />

      <StatCard
        title="Pending Review"
        value={stats.totalPending}
        icon={ClockIcon}
        color="yellow"
      />
    </div>
  );
}
```

---

### 3.2 Organization Breakdown Table

**Component:** `src/components/monitoring/OrganizationStatsTable.tsx`

```tsx
interface OrganizationStatsTableProps {
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    activeTrackers: number;
    articlesFound: number;
    autoConfirmedRate: number;
    lastActivity?: Timestamp;
  }>;
  onTriggerOrgCrawl: (orgId: string) => void;
}

export function OrganizationStatsTable({
  organizations,
  onTriggerOrgCrawl
}: OrganizationStatsTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Organization</TableHeader>
          <TableHeader>Aktive Tracker</TableHeader>
          <TableHeader>Artikel gefunden</TableHeader>
          <TableHeader>Auto-Confirm Rate</TableHeader>
          <TableHeader>Letzte Aktivität</TableHeader>
          <TableHeader>Aktionen</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {organizations.map((org) => (
          <TableRow key={org.organizationId}>
            <TableCell>{org.organizationName}</TableCell>
            <TableCell>{org.activeTrackers}</TableCell>
            <TableCell>{org.articlesFound}</TableCell>
            <TableCell>
              <Badge color={org.autoConfirmedRate > 70 ? 'green' : 'yellow'}>
                {org.autoConfirmedRate}%
              </Badge>
            </TableCell>
            <TableCell>
              {org.lastActivity ? formatDistanceToNow(org.lastActivity.toDate()) : '-'}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                onClick={() => onTriggerOrgCrawl(org.organizationId)}
              >
                <PlayIcon className="h-4 w-4" />
                Crawl starten
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### 3.3 Control Panel Component

**Component:** `src/components/monitoring/CrawlerControlPanel.tsx`

```tsx
interface CrawlerControlPanelProps {
  cronJobStatus: {
    isEnabled: boolean;
    pausedAt?: Timestamp;
    pausedBy?: string;
    reason?: string;
  };
  onPause: (reason: string) => void;
  onResume: () => void;
  onTriggerAll: () => void;
}

export function CrawlerControlPanel({
  cronJobStatus,
  onPause,
  onResume,
  onTriggerAll
}: CrawlerControlPanelProps) {
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseDialog, setShowPauseDialog] = useState(false);

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Crawler Control</h3>

      {/* Status Badge */}
      <div className="mb-4">
        <Badge color={cronJobStatus.isEnabled ? 'green' : 'red'} size="lg">
          {cronJobStatus.isEnabled ? '✅ Aktiv' : '⏸️ Pausiert'}
        </Badge>

        {!cronJobStatus.isEnabled && cronJobStatus.pausedBy && (
          <Text className="text-sm text-gray-500 mt-2">
            Pausiert von {cronJobStatus.pausedBy}
            {cronJobStatus.reason && ` - ${cronJobStatus.reason}`}
          </Text>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {cronJobStatus.isEnabled ? (
          <Button
            color="red"
            onClick={() => setShowPauseDialog(true)}
          >
            <PauseIcon className="h-4 w-4" />
            Cron Job pausieren
          </Button>
        ) : (
          <Button
            color="green"
            onClick={onResume}
          >
            <PlayIcon className="h-4 w-4" />
            Cron Job aktivieren
          </Button>
        )}

        <Button
          onClick={onTriggerAll}
          disabled={!cronJobStatus.isEnabled}
        >
          <BoltIcon className="h-4 w-4" />
          Manuell starten (alle Orgs)
        </Button>
      </div>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onClose={() => setShowPauseDialog(false)}>
        <DialogTitle>Cron Job pausieren</DialogTitle>
        <DialogBody>
          <Field>
            <Label>Grund für Pause</Label>
            <Textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="z.B. Wartungsarbeiten, Performance-Probleme..."
            />
          </Field>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowPauseDialog(false)}>
            Abbrechen
          </Button>
          <Button
            color="red"
            onClick={() => {
              onPause(pauseReason);
              setShowPauseDialog(false);
            }}
          >
            Pausieren
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
```

---

### 3.4 Error Log Table

**Component:** `src/components/monitoring/ErrorLogTable.tsx`

```tsx
interface ErrorLogTableProps {
  logs: Array<{
    id: string;
    timestamp: Timestamp;
    type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
    organizationId?: string;
    campaignId?: string;
    channelId?: string;
    errorMessage: string;
    stackTrace?: string;
  }>;
}

export function ErrorLogTable({ logs }: ErrorLogTableProps) {
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Zeit</TableHeader>
            <TableHeader>Typ</TableHeader>
            <TableHeader>Organization</TableHeader>
            <TableHeader>Fehler</TableHeader>
            <TableHeader>Details</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Badge color="red">{log.type}</Badge>
              </TableCell>
              <TableCell>{log.organizationId || '-'}</TableCell>
              <TableCell className="max-w-md truncate">
                {log.errorMessage}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  plain
                  onClick={() => setSelectedLog(log.id)}
                >
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Error Detail Modal */}
      {selectedLog && (
        <ErrorDetailModal
          log={logs.find(l => l.id === selectedLog)!}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
```

---

## 📋 Phase 4: Main Page Integration

### 4.1 Monitoring Control Center Page

**Datei:** `src/app/dashboard/super-admin/monitoring/page.tsx` (NEU)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Heading } from '@/components/ui/heading';
import { SystemOverview } from '@/components/monitoring/SystemOverview';
import { OrganizationStatsTable } from '@/components/monitoring/OrganizationStatsTable';
import { CrawlerControlPanel } from '@/components/monitoring/CrawlerControlPanel';
import { ErrorLogTable } from '@/components/monitoring/ErrorLogTable';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui/tabs';

export default function MonitoringControlCenterPage() {
  const [stats, setStats] = useState(null);
  const [cronJobStatus, setCronJobStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/admin/monitoring-stats');
      const data = await response.json();
      setStats(data);

      const statusResponse = await fetch('/api/admin/crawler-status');
      const statusData = await statusResponse.json();
      setCronJobStatus(statusData);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseCronJob = async (reason: string) => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', payload: { reason } })
    });
    loadData();
  };

  const handleResumeCronJob = async () => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' })
    });
    loadData();
  };

  const handleTriggerAll = async () => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trigger_all' })
    });
    alert('Crawler gestartet! Ergebnisse erscheinen in wenigen Minuten.');
  };

  const handleTriggerOrg = async (organizationId: string) => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'trigger_org',
        payload: { organizationId }
      })
    });
    alert('Org-Crawler gestartet!');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Heading>Monitoring & Control Center</Heading>

      {/* System Overview */}
      <div className="mt-6">
        <SystemOverview stats={stats.system} />
      </div>

      {/* Control Panel */}
      <div className="mt-6">
        <CrawlerControlPanel
          cronJobStatus={cronJobStatus}
          onPause={handlePauseCronJob}
          onResume={handleResumeCronJob}
          onTriggerAll={handleTriggerAll}
        />
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <Tabs>
          <TabList>
            <Tab>Organizations</Tab>
            <Tab>Channel Health</Tab>
            <Tab>Error Logs</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <OrganizationStatsTable
                organizations={stats.organizations}
                onTriggerOrgCrawl={handleTriggerOrg}
              />
            </TabPanel>

            <TabPanel>
              <ChannelHealthTable channels={stats.channelHealth} />
            </TabPanel>

            <TabPanel>
              <ErrorLogTable logs={stats.errorLogs} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
```

---

### 4.2 Navigation Integration

**Datei:** Navigation erweitern (wo auch immer Super-Admin Nav ist)

```tsx
// Super Admin Navigation
{
  name: 'Monitoring',
  href: '/dashboard/super-admin/monitoring',
  icon: ChartBarSquareIcon
}
```

---

## 📋 Phase 5: Testing & Rollout

### 5.1 Testing Checklist

- [ ] System Stats korrekt aggregiert
- [ ] Cron Job Pause/Resume funktioniert
- [ ] Manual Trigger (alle Orgs) funktioniert
- [ ] Manual Trigger (einzelne Org) funktioniert
- [ ] Manual Trigger (einzelne Kampagne) funktioniert
- [ ] Error Logs werden korrekt erfasst
- [ ] Organization Breakdown zeigt korrekte Daten
- [ ] Channel Health zeigt problematische Feeds
- [ ] UI responsiv und performant
- [ ] Super Admin Security Check funktioniert

### 5.2 Rollout Plan

**Stufe 1: Backend Services**
- Deploy Services & APIs
- Test mit Postman/curl

**Stufe 2: UI Komponenten**
- Deploy UI Components
- Test im Super Admin Center

**Stufe 3: Integration**
- Vollständige Integration
- End-to-End Tests

**Stufe 4: Produktiv**
- Rollout für Super Admins
- Monitoring & Feedback

---

## 🗄️ Neue Firestore Collections

### `system_config/crawler_config`
```typescript
{
  isEnabled: boolean;
  pausedAt?: Timestamp;
  pausedBy?: string;
  pausedReason?: string;
  updatedAt: Timestamp;
}
```

### `crawler_error_logs/{logId}`
```typescript
{
  timestamp: Timestamp;
  type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
  organizationId?: string;
  campaignId?: string;
  channelId?: string;
  errorMessage: string;
  stackTrace?: string;
  metadata?: any;
  createdAt: Timestamp;
}
```

### `crawler_run_logs/{runId}`
```typescript
{
  timestamp: Timestamp;
  type: 'scheduled' | 'manual' | 'org_specific' | 'campaign_specific';
  triggeredBy?: string; // User ID bei manual runs
  duration: number;
  trackersProcessed: number;
  articlesFound: number;
  autoConfirmed: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: Timestamp;
}
```

---

## 📋 Firestore Security Rules

```javascript
// Crawler Config (nur Super Admin)
match /system_config/crawler_config {
  allow read, write: if isSuperAdmin();
}

// Crawler Error Logs (nur Super Admin)
match /crawler_error_logs/{logId} {
  allow read, write: if isSuperAdmin();
}

// Crawler Run Logs (nur Super Admin)
match /crawler_run_logs/{runId} {
  allow read, write: if isSuperAdmin();
}
```

---

## 🎯 Erfolgs-Kriterien

✅ **Funktional:**
- System-weite Statistiken korrekt aggregiert
- Cron Job kann pausiert/aktiviert werden
- Manual Triggers funktionieren (all/org/campaign)
- Error Logs werden erfasst und angezeigt
- Organization Breakdown zeigt relevante Metriken
- Channel Health identifiziert Probleme

✅ **Performance:**
- Stats laden in <2 Sekunden
- Aggregation optimiert
- Keine Performance-Einbußen für normale User

✅ **Security:**
- Nur Super Admins haben Zugriff
- Alle Actions werden geloggt
- Feature Flags funktionieren korrekt

✅ **UX:**
- Übersichtliches Dashboard
- Klare Control Actions
- Hilfreiche Error Details
- Real-time Updates (optional)

---

## 📝 Nächste Schritte

1. Phase 1: Backend Services implementieren
2. Phase 2: Control Features implementieren
3. Phase 3: UI Komponenten erstellen
4. Phase 4: Main Page Integration
5. Phase 5: Testing & Rollout
