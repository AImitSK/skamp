# Auto-Report Feature - Implementierungsplan

**Datum:** 03.12.2025
**Status:** Geplant

---

## Übersicht

Automatischer Versand von Monitoring-Reports (PDF) an bis zu 3 CRM-Kontakte - wöchentlich oder monatlich.

### User Flow

```
Monitoring-Detailseite (/dashboard/analytics/monitoring/[campaignId])
    └── Button "Report planen" (neben PDF-Report Button)
            └── Modal öffnet sich
                 ├── Frequenz: Wöchentlich | Monatlich
                 ├── Bei Wöchentlich: Tag auswählen (Mo-So)
                 ├── Bei Monatlich: Immer am 1. des Monats
                 └── Empfänger: Bis zu 3 Kontakte aus CRM auswählen
                        └── Speichern
                               └── Eintrag in Firestore Collection
                                      └── Sichtbar unter /dashboard/analytics/reporting

Analyse > Reporting (Neue Seite)
    └── Tabelle mit allen geplanten Reports
         ├── Projekt/Kampagne
         ├── Frequenz (Wöchentlich/Monatlich)
         ├── Nächster Versand
         ├── Empfänger
         ├── Status (Aktiv/Pausiert)
         └── Aktionen (Bearbeiten | Löschen)
```

---

## Phase 1: Datenmodell & Service

### 1.1 Firestore Collection: `scheduled_reports`

**Pfad:** `scheduled_reports/{reportId}`

```typescript
// src/types/scheduled-report.ts
interface ScheduledReport {
  id: string;

  // Referenzen
  campaignId: string;
  projectId?: string;
  organizationId: string;

  // Zeitplanung
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0=Sonntag, 1=Montag, ... (nur bei weekly)
  // Bei monthly: Immer am 1. des Monats

  // Empfänger (CRM Contact IDs)
  recipientIds: string[];  // max 3

  // Status
  isActive: boolean;

  // Tracking
  lastSentAt?: Timestamp;
  nextSendAt: Timestamp;
  sendCount: number;
  lastError?: string;

  // Meta
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.2 Service: `scheduled-report-service.ts`

**Pfad:** `src/lib/firebase/scheduled-report-service.ts`

```typescript
class ScheduledReportService {
  // CRUD Operations
  async create(data: CreateScheduledReportInput): Promise<string>;
  async update(reportId: string, data: UpdateScheduledReportInput): Promise<void>;
  async delete(reportId: string): Promise<void>;
  async getById(reportId: string): Promise<ScheduledReport | null>;

  // Queries
  async getByOrganization(organizationId: string): Promise<ScheduledReport[]>;
  async getByCampaign(campaignId: string): Promise<ScheduledReport | null>;
  async getDueReports(): Promise<ScheduledReport[]>;  // Für Cron-Job

  // Helpers
  calculateNextSendDate(frequency: 'weekly' | 'monthly', dayOfWeek?: number): Date;
  async checkMonitoringActive(campaignId: string): Promise<boolean>;

  // Nach Versand
  async markAsSent(reportId: string): Promise<void>;
  async markAsError(reportId: string, error: string): Promise<void>;
}
```

**Abhängigkeiten:**
- `campaign-monitoring-service.ts` - Prüfen ob Monitoring noch aktiv
- `monitoring-report-service.ts` - PDF generieren (wiederverwenden)

---

## Phase 2: UI Komponenten

### 2.1 Modal: `ScheduleReportModal.tsx`

**Pfad:** `src/components/monitoring/ScheduleReportModal.tsx`

```typescript
interface ScheduleReportModalProps {
  campaignId: string;
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
  existingSchedule?: ScheduledReport;  // Für Bearbeiten-Modus
}
```

**Komponenten-Struktur:**
```
<Dialog>
  <DialogTitle>Report planen</DialogTitle>
  <DialogBody>
    <!-- Frequenz Auswahl -->
    <RadioGroup value={frequency}>
      <Radio value="weekly">Wöchentlich</Radio>
      <Radio value="monthly">Monatlich (am 1.)</Radio>
    </RadioGroup>

    <!-- Tag-Auswahl (nur bei weekly) -->
    {frequency === 'weekly' && (
      <Select value={dayOfWeek}>
        <option value={1}>Montag</option>
        <option value={2}>Dienstag</option>
        ...
      </Select>
    )}

    <!-- Empfänger aus CRM -->
    <ContactSelector
      maxSelections={3}
      selectedIds={recipientIds}
      onChange={setRecipientIds}
    />

    <!-- Info: Nächster Versand -->
    <p>Nächster Versand: {formatDate(nextSendDate)}</p>
  </DialogBody>
  <DialogActions>
    <Button onClick={onClose}>Abbrechen</Button>
    <Button onClick={handleSave} color="blue">
      {existingSchedule ? 'Aktualisieren' : 'Planen'}
    </Button>
  </DialogActions>
</Dialog>
```

**Verwendete Komponenten:**
- `ContactSelectorModal` aus `src/app/dashboard/contacts/lists/ContactSelectorModal.tsx` (anpassen für max 3)
- Oder eigene vereinfachte Version mit Dropdown/Combobox

### 2.2 Button: Integration in PDFExportButton

**Pfad:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/PDFExportButton.tsx`

```typescript
// Erweitern um zweiten Button
export const PDFExportButton = memo(function PDFExportButton() {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { existingSchedule } = useScheduledReport(campaignId);

  return (
    <div className="flex gap-2">
      {/* Bestehender PDF-Button */}
      <Button onClick={handleClick} disabled={isPDFGenerating}>
        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
        {isPDFGenerating ? 'Generiere PDF...' : 'PDF-Report'}
      </Button>

      {/* Neuer Schedule-Button */}
      <Button
        onClick={() => setShowScheduleModal(true)}
        outline
      >
        <CalendarIcon className="h-4 w-4 mr-2" />
        {existingSchedule ? 'Report geplant' : 'Report planen'}
      </Button>

      <ScheduleReportModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        campaignId={campaignId}
        existingSchedule={existingSchedule}
      />
    </div>
  );
});
```

---

## Phase 3: Reporting-Übersichtsseite

### 3.1 Seite: `/dashboard/analytics/reporting`

**Pfad:** `src/app/dashboard/analytics/reporting/page.tsx`

```typescript
export default function ReportingPage() {
  const { organizationId } = useOrganization();
  const { data: scheduledReports, isLoading } = useScheduledReports(organizationId);

  return (
    <div>
      <Heading>Geplante Reports</Heading>
      <Text>Automatischer Versand von Monitoring-Reports</Text>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Kampagne/Projekt</TableHeader>
            <TableHeader>Frequenz</TableHeader>
            <TableHeader>Nächster Versand</TableHeader>
            <TableHeader>Empfänger</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Aktionen</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {scheduledReports.map(report => (
            <ScheduledReportRow
              key={report.id}
              report={report}
              onEdit={() => openEditModal(report)}
              onDelete={() => handleDelete(report.id)}
            />
          ))}
        </TableBody>
      </Table>

      {scheduledReports.length === 0 && (
        <EmptyState
          title="Keine geplanten Reports"
          description="Planen Sie einen Report über die Monitoring-Detailseite einer Kampagne."
        />
      )}
    </div>
  );
}
```

### 3.2 Navigation erweitern

**Pfad:** `src/app/dashboard/layout.tsx`

```typescript
// Im navigationItems Array unter "Analyse"
{
  name: "Analyse",
  icon: ChartBarIcon,
  current: pathname.startsWith('/dashboard/analytics'),
  children: [
    {
      name: "Monitoring",
      href: "/dashboard/analytics/monitoring",
      icon: ChartBarIcon,
      description: "E-Mail Tracking und Veröffentlichungs-Monitoring"
    },
    {
      name: "Reporting",  // NEU
      href: "/dashboard/analytics/reporting",
      icon: DocumentChartBarIcon,
      description: "Geplante automatische Reports"
    },
  ],
},
```

---

## Phase 4: Cron-Job & E-Mail Versand

### 4.1 API Route: `/api/cron/send-scheduled-reports`

**Pfad:** `src/app/api/cron/send-scheduled-reports/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { scheduledReportService } from '@/lib/firebase/scheduled-report-service';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { emailSenderService } from '@/lib/email/email-sender-service';

export async function GET(request: NextRequest) {
  // 1. Cron Secret verifizieren
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('📊 Starting scheduled report sender');

  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: 0
  };

  try {
    // 2. Alle fälligen Reports laden
    const dueReports = await scheduledReportService.getDueReports();
    results.processed = dueReports.length;

    for (const report of dueReports) {
      try {
        // 3. Prüfen ob Monitoring noch aktiv
        const isActive = await scheduledReportService.checkMonitoringActive(report.campaignId);
        if (!isActive) {
          // Monitoring ausgelaufen -> Report deaktivieren
          await scheduledReportService.update(report.id, { isActive: false });
          results.skipped++;
          continue;
        }

        // 4. PDF generieren
        const { pdfUrl } = await monitoringReportService.generatePDFReport(
          report.campaignId,
          report.organizationId,
          'system'  // System-User für automatische Reports
        );

        // 5. Empfänger-Emails laden
        const recipients = await loadRecipientEmails(report.recipientIds, report.organizationId);

        // 6. E-Mail versenden
        await sendReportEmail({
          recipients,
          pdfUrl,
          campaignTitle: await getCampaignTitle(report.campaignId),
          organizationId: report.organizationId
        });

        // 7. Als gesendet markieren
        await scheduledReportService.markAsSent(report.id);
        results.sent++;

      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        await scheduledReportService.markAsError(report.id, error.message);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Scheduled report sender failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### 4.2 Vercel Cron Konfiguration

**Pfad:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled-reports",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Schedule:** Täglich um 07:00 Uhr UTC (08:00 Uhr MEZ / 09:00 Uhr MESZ)

### 4.3 E-Mail Template

**Pfad:** `src/lib/email/templates/scheduled-report-email.ts`

```typescript
export function generateScheduledReportEmail(data: {
  campaignTitle: string;
  reportPeriod: string;
  pdfUrl: string;
  recipientName: string;
}): string {
  return `
    <h1>Monitoring-Report: ${data.campaignTitle}</h1>
    <p>Hallo ${data.recipientName},</p>
    <p>anbei erhalten Sie den aktuellen Monitoring-Report für "${data.campaignTitle}".</p>
    <p>Berichtszeitraum: ${data.reportPeriod}</p>
    <p>
      <a href="${data.pdfUrl}" style="...">PDF-Report herunterladen</a>
    </p>
    <p>Mit freundlichen Grüßen<br>Ihr CeleroPress Team</p>
  `;
}
```

---

## Phase 5: Hooks & Integration

### 5.1 Hook: `useScheduledReport`

**Pfad:** `src/lib/hooks/useScheduledReport.ts`

```typescript
export function useScheduledReport(campaignId: string) {
  const { organizationId } = useOrganization();

  const { data: existingSchedule, isLoading, refetch } = useQuery({
    queryKey: ['scheduled-report', campaignId],
    queryFn: () => scheduledReportService.getByCampaign(campaignId),
    enabled: !!campaignId && !!organizationId
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduledReportInput) =>
      scheduledReportService.create(data),
    onSuccess: () => refetch()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduledReportInput }) =>
      scheduledReportService.update(id, data),
    onSuccess: () => refetch()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduledReportService.delete(id),
    onSuccess: () => refetch()
  });

  return {
    existingSchedule,
    isLoading,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate
  };
}
```

### 5.2 Hook: `useScheduledReports` (für Übersichtsseite)

**Pfad:** `src/lib/hooks/useScheduledReports.ts`

```typescript
export function useScheduledReports(organizationId: string) {
  return useQuery({
    queryKey: ['scheduled-reports', organizationId],
    queryFn: () => scheduledReportService.getByOrganization(organizationId),
    enabled: !!organizationId
  });
}
```

---

## Dateien-Übersicht

### Neue Dateien

| Pfad | Beschreibung |
|------|--------------|
| `src/types/scheduled-report.ts` | TypeScript Interface |
| `src/lib/firebase/scheduled-report-service.ts` | Firestore CRUD Service |
| `src/components/monitoring/ScheduleReportModal.tsx` | Modal für Planung |
| `src/app/dashboard/analytics/reporting/page.tsx` | Übersichtsseite |
| `src/app/api/cron/send-scheduled-reports/route.ts` | Cron-Job |
| `src/lib/hooks/useScheduledReport.ts` | Hook für einzelnen Report |
| `src/lib/hooks/useScheduledReports.ts` | Hook für Übersicht |
| `src/lib/email/templates/scheduled-report-email.ts` | E-Mail Template |

### Zu ändernde Dateien

| Pfad | Änderung |
|------|----------|
| `src/app/dashboard/analytics/monitoring/[campaignId]/components/PDFExportButton.tsx` | "Report planen" Button hinzufügen |
| `src/app/dashboard/layout.tsx` | Navigation um "Reporting" erweitern |
| `vercel.json` | Cron-Job hinzufügen |

---

## Implementierungs-Reihenfolge

1. **Phase 1:** Types + Service (Grundlage)
2. **Phase 2:** Modal + Button-Integration (User kann planen)
3. **Phase 3:** Reporting-Seite + Navigation (User kann verwalten)
4. **Phase 4:** Cron-Job + E-Mail (Automatischer Versand)
5. **Phase 5:** Hooks + Feinschliff

---

## Offene Punkte / Entscheidungen

- [ ] E-Mail-Template Design abstimmen
- [ ] Soll PDF als Anhang oder nur als Link versendet werden?
- [ ] Benachrichtigung wenn Monitoring ausläuft und Report deaktiviert wird?
- [ ] Firestore Security Rules für `scheduled_reports` Collection
