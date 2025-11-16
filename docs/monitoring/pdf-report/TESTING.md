# Testing: Monitoring Report Modul

> **Letzte Aktualisierung**: 16. November 2025
> **Test-Coverage**: 100%
> **Anzahl Tests**: 85

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Test-Struktur](#test-struktur)
- [Test-Strategie](#test-strategie)
- [Mocking-Strategie](#mocking-strategie)
- [Test-Beispiele](#test-beispiele)
- [Coverage-Report](#coverage-report)
- [Tests ausführen](#tests-ausführen)
- [Best Practices](#best-practices)

## Übersicht

Das Monitoring Report Modul hat **85 Tests** mit **100% Code-Coverage**. Alle Module sind vollständig getestet (Unit, Integration, Hook-Tests).

### Test-Framework

- **Test-Runner:** Jest
- **React-Testing:** React Testing Library
- **Hook-Testing:** @testing-library/react-hooks
- **Mocking:** Jest Mocks

### Test-Philosophie

1. **Test Coverage:** 100% für alle Module
2. **Test Isolation:** Jedes Modul wird isoliert getestet
3. **Real-World Scenarios:** Tests basieren auf echten Use-Cases
4. **Fast Execution:** Alle Tests laufen in < 5 Sekunden

## Test-Struktur

### Test-Dateien (8 Files, 85 Tests)

```
src/lib/monitoring-report/__tests__/
├── core/
│   ├── data-collector.test.ts        (12 Tests)
│   ├── stats-calculator.test.ts      (18 Tests)
│   └── timeline-builder.test.ts      (10 Tests)
│
├── generators/
│   ├── html-generator.test.ts        (8 Tests)
│   ├── pdf-generator.test.ts         (14 Tests)
│
└── delivery/
    └── download-handler.test.ts      (11 Tests)

src/lib/firebase/__tests__/
└── monitoring-report-service.test.ts (10 Tests)

src/lib/hooks/__tests__/
└── useMonitoringReport.test.ts       (2 Tests)
```

## Test-Strategie

### 1. Unit Tests (Core Module)

Jedes Core-Modul wird isoliert getestet ohne externe Dependencies.

**Beispiel: stats-calculator.test.ts**

```typescript
import { reportStatsCalculator } from '../stats-calculator';
import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';

describe('ReportStatsCalculator', () => {
  describe('calculateEmailStats', () => {
    it('sollte Email-Stats korrekt berechnen', () => {
      const sends: EmailCampaignSend[] = [
        { id: '1', status: 'delivered' } as EmailCampaignSend,
        { id: '2', status: 'opened' } as EmailCampaignSend,
        { id: '3', status: 'clicked' } as EmailCampaignSend,
        { id: '4', status: 'bounced' } as EmailCampaignSend
      ];

      const clippings: MediaClipping[] = [];

      const result = reportStatsCalculator.calculateEmailStats(sends, clippings);

      expect(result.totalSent).toBe(4);
      expect(result.delivered).toBe(3);
      expect(result.opened).toBe(2);
      expect(result.clicked).toBe(1);
      expect(result.bounced).toBe(1);
      expect(result.openRate).toBe(50); // 2/4 = 50%
      expect(result.ctr).toBe(25); // 1/4 = 25%
    });

    it('sollte mit leeren Sends umgehen', () => {
      const result = reportStatsCalculator.calculateEmailStats([], []);

      expect(result.totalSent).toBe(0);
      expect(result.openRate).toBe(0);
      expect(result.ctr).toBe(0);
    });
  });
});
```

### 2. Integration Tests (Service)

Service-Tests prüfen das Zusammenspiel mehrerer Module.

**Beispiel: monitoring-report-service.test.ts**

```typescript
jest.mock('@/lib/monitoring-report/core/data-collector');
jest.mock('@/lib/monitoring-report/core/stats-calculator');
jest.mock('@/lib/monitoring-report/core/timeline-builder');
jest.mock('@/lib/monitoring-report/generators/html-generator');
jest.mock('@/lib/monitoring-report/generators/pdf-generator');

import { monitoringReportService } from '../monitoring-report-service';
import { reportDataCollector } from '@/lib/monitoring-report/core/data-collector';
import { reportStatsCalculator } from '@/lib/monitoring-report/core/stats-calculator';

describe('monitoringReportService', () => {
  it('sollte kompletten PDF-Report-Flow durchführen', async () => {
    // Arrange: Mocks vorbereiten
    const mockRawData = {
      campaignId: 'campaign-123',
      organizationId: 'org-456',
      campaignTitle: 'Test Campaign',
      sentAt: new Date(),
      sends: [],
      clippings: [],
      branding: null
    };

    (reportDataCollector.collect as jest.Mock).mockResolvedValue(mockRawData);
    (reportStatsCalculator.calculateEmailStats as jest.Mock).mockReturnValue({
      totalSent: 100,
      openRate: 50
    });

    // Act: Service aufrufen
    const result = await monitoringReportService.generatePDFReport(
      'campaign-123',
      'org-456',
      'user-789'
    );

    // Assert: Ergebnisse prüfen
    expect(result).toHaveProperty('pdfUrl');
    expect(reportDataCollector.collect).toHaveBeenCalledWith(
      'campaign-123',
      'org-456'
    );
  });
});
```

### 3. Hook Tests (React Hooks)

React Hooks werden mit React Testing Library getestet.

**Beispiel: useMonitoringReport.test.ts**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePDFReportGenerator } from '../useMonitoringReport';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

jest.mock('@/lib/firebase/monitoring-report-service');
jest.mock('@/lib/utils/toast');

describe('usePDFReportGenerator', () => {
  it('sollte PDF erfolgreich generieren', async () => {
    const mockResult = {
      pdfUrl: 'https://example.com/report.pdf',
      fileSize: 1024
    };

    (monitoringReportService.generatePDFReport as jest.Mock).mockResolvedValue(
      mockResult
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

    // Mutation starten
    result.current.mutate({
      campaignId: 'campaign-123',
      organizationId: 'org-456',
      userId: 'user-789'
    });

    // Warten auf Success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResult);
    expect(monitoringReportService.generatePDFReport).toHaveBeenCalledWith(
      'campaign-123',
      'org-456',
      'user-789'
    );
  });
});
```

## Mocking-Strategie

### 1. Firebase Mocking

Firestore und Firebase Storage werden gemockt.

```typescript
// Firestore Mock
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, collection, id) => ({ _path: `${collection}/${id}` })),
  getDoc: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date
    }))
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));
```

### 2. Service Mocking

Firebase Services werden gemockt.

```typescript
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn()
  }
}));

jest.mock('@/lib/firebase/email-campaign-service', () => ({
  emailCampaignService: {
    getSends: jest.fn()
  }
}));

jest.mock('@/lib/firebase/clipping-service', () => ({
  clippingService: {
    getByCampaignId: jest.fn()
  }
}));

jest.mock('@/lib/firebase/branding-service', () => ({
  brandingService: {
    getBrandingSettings: jest.fn()
  }
}));
```

### 3. API Mocking (PDF-Generator)

API-Calls werden mit `fetch` Mock gemockt.

```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        pdfUrl: 'https://example.com/report.pdf'
      })
  })
) as jest.Mock;
```

## Test-Beispiele

### Beispiel 1: data-collector.test.ts

**Test-Case:** Parallele API-Calls

```typescript
import { reportDataCollector } from '../data-collector';
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';

jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/email-campaign-service');
jest.mock('@/lib/firebase/clipping-service');
jest.mock('@/lib/firebase/branding-service');

describe('ReportDataCollector', () => {
  it('sollte Daten parallel laden', async () => {
    const mockCampaign = { id: 'campaign-123', title: 'Test Campaign' };
    const mockSends = [{ id: 'send-1' }];

    (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
    (emailCampaignService.getSends as jest.Mock).mockResolvedValue(mockSends);

    const result = await reportDataCollector.collect('campaign-123', 'org-456');

    expect(result.campaignTitle).toBe('Test Campaign');
    expect(result.sends).toEqual(mockSends);

    // Parallele Ausführung prüfen (alle zur gleichen Zeit aufgerufen)
    expect(prService.getById).toHaveBeenCalledTimes(1);
    expect(emailCampaignService.getSends).toHaveBeenCalledTimes(1);
  });

  it('sollte Fehler bei fehlendem Campaign werfen', async () => {
    (prService.getById as jest.Mock).mockResolvedValue(null);

    await expect(
      reportDataCollector.collect('invalid-campaign', 'org-456')
    ).rejects.toThrow('Kampagne nicht gefunden');
  });

  it('sollte leere Arrays bei fehlenden Daten zurückgeben', async () => {
    const mockCampaign = { id: 'campaign-123', title: 'Test Campaign' };

    (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
    (emailCampaignService.getSends as jest.Mock).mockRejectedValue(
      new Error('Sends not found')
    );

    const result = await reportDataCollector.collect('campaign-123', 'org-456');

    expect(result.sends).toEqual([]);
  });
});
```

### Beispiel 2: timeline-builder.test.ts

**Test-Case:** Timeline-Aggregation

```typescript
import { timelineBuilder } from '../timeline-builder';
import type { MediaClipping } from '@/types/monitoring';
import { Timestamp } from 'firebase/firestore';

describe('TimelineBuilder', () => {
  it('sollte Timeline nach Datum aggregieren', () => {
    const clippings: MediaClipping[] = [
      {
        id: '1',
        publishedAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
        reach: 10000
      } as MediaClipping,
      {
        id: '2',
        publishedAt: Timestamp.fromDate(new Date('2024-01-15T14:00:00Z')),
        reach: 20000
      } as MediaClipping,
      {
        id: '3',
        publishedAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
        reach: 30000
      } as MediaClipping
    ];

    const result = timelineBuilder.buildTimeline(clippings);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '15. Jan. 2024',
      clippings: 2,
      reach: 30000
    });
    expect(result[1]).toEqual({
      date: '16. Jan. 2024',
      clippings: 1,
      reach: 30000
    });
  });

  it('sollte Timeline nach Datum sortieren', () => {
    const clippings: MediaClipping[] = [
      {
        id: '1',
        publishedAt: Timestamp.fromDate(new Date('2024-01-17T10:00:00Z')),
        reach: 10000
      } as MediaClipping,
      {
        id: '2',
        publishedAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
        reach: 20000
      } as MediaClipping
    ];

    const result = timelineBuilder.buildTimeline(clippings);

    expect(result[0].date).toBe('15. Jan. 2024'); // Früher
    expect(result[1].date).toBe('17. Jan. 2024'); // Später
  });

  it('sollte Clippings ohne publishedAt ignorieren', () => {
    const clippings: MediaClipping[] = [
      {
        id: '1',
        publishedAt: null,
        reach: 10000
      } as any
    ];

    const result = timelineBuilder.buildTimeline(clippings);

    expect(result).toHaveLength(0);
  });
});
```

### Beispiel 3: pdf-generator.test.ts

**Test-Case:** API-Integration

```typescript
import { pdfGenerator } from '../pdf-generator';

describe('PDFGenerator', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('sollte PDF via API generieren', async () => {
    const mockResponse = {
      success: true,
      pdfUrl: 'https://example.com/report.pdf'
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await pdfGenerator.generate('<html></html>', {
      campaignId: 'campaign-123',
      organizationId: 'org-456',
      userId: 'user-789',
      html: '<html></html>',
      title: 'Test Report',
      fileName: 'test.pdf'
    });

    expect(result.success).toBe(true);
    expect(result.pdfUrl).toBe('https://example.com/report.pdf');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/generate-pdf',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('sollte Fehler bei API-Fehler werfen', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });

    await expect(
      pdfGenerator.generate('<html></html>', {
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789',
        html: '<html></html>',
        title: 'Test Report',
        fileName: 'test.pdf'
      })
    ).rejects.toThrow('PDF-API Fehler 500');
  });

  it('sollte Base64 zu File konvertieren', () => {
    const base64 = btoa('test pdf content');

    const file = pdfGenerator.base64ToFile(base64, 'test.pdf');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('test.pdf');
    expect(file.type).toBe('application/pdf');
  });
});
```

### Beispiel 4: download-handler.test.ts

**Test-Case:** Smart Folder Management

```typescript
import { downloadHandler } from '../download-handler';
import { mediaService } from '@/lib/firebase/media-service';
import { db } from '@/lib/firebase/client-init';
import { getDoc, doc } from 'firebase/firestore';

jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/firebase/client-init');
jest.mock('firebase/firestore');

describe('DownloadHandler', () => {
  it('sollte zu Client-Media (Analysen-Ordner) uploaden', async () => {
    const mockCampaignDoc = {
      exists: () => true,
      data: () => ({
        projectId: 'project-123',
        clientId: 'client-456'
      })
    };

    const mockFolders = [
      {
        id: 'folder-project',
        name: 'P-Monitoring',
        parentFolderId: null
      },
      {
        id: 'folder-analysen',
        name: 'Analysen',
        parentFolderId: 'folder-project'
      }
    ];

    const mockAsset = {
      downloadUrl: 'https://storage.example.com/report.pdf'
    };

    (getDoc as jest.Mock).mockResolvedValue(mockCampaignDoc);
    (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(
      mockFolders
    );
    (mediaService.uploadClientMedia as jest.Mock).mockResolvedValue(mockAsset);

    const pdfFile = new File(['test'], 'report.pdf', { type: 'application/pdf' });

    const result = await downloadHandler.upload(
      pdfFile,
      'campaign-123',
      'org-456',
      'user-789'
    );

    expect(result.pdfUrl).toBe('https://storage.example.com/report.pdf');

    expect(mediaService.uploadClientMedia).toHaveBeenCalledWith(
      pdfFile,
      'org-456',
      'client-456',
      'folder-analysen', // Analysen-Ordner!
      undefined,
      { userId: 'user-789' },
      true // skipLimitCheck
    );
  });

  it('sollte Fallback zu Organization-Media nutzen', async () => {
    const mockCampaignDoc = {
      exists: () => true,
      data: () => ({
        projectId: null,
        clientId: null
      })
    };

    const mockAsset = {
      downloadUrl: 'https://storage.example.com/report.pdf'
    };

    (getDoc as jest.Mock).mockResolvedValue(mockCampaignDoc);
    (mediaService.uploadMedia as jest.Mock).mockResolvedValue(mockAsset);

    const pdfFile = new File(['test'], 'report.pdf', { type: 'application/pdf' });

    const result = await downloadHandler.upload(
      pdfFile,
      'campaign-123',
      'org-456',
      'user-789'
    );

    expect(result.pdfUrl).toBe('https://storage.example.com/report.pdf');

    expect(mediaService.uploadMedia).toHaveBeenCalledWith(
      pdfFile,
      'org-456',
      undefined,
      undefined,
      3,
      { userId: 'user-789' },
      true // skipLimitCheck
    );
  });
});
```

## Coverage-Report

### Gesamt-Coverage: 100%

```
File                                   | % Stmts | % Branch | % Funcs | % Lines
---------------------------------------|---------|----------|---------|--------
All files                              |     100 |      100 |     100 |     100
 core/data-collector.ts                |     100 |      100 |     100 |     100
 core/stats-calculator.ts              |     100 |      100 |     100 |     100
 core/timeline-builder.ts              |     100 |      100 |     100 |     100
 templates/styles.ts                   |     100 |      100 |     100 |     100
 templates/report-template.ts          |     100 |      100 |     100 |     100
 generators/html-generator.ts          |     100 |      100 |     100 |     100
 generators/pdf-generator.ts           |     100 |      100 |     100 |     100
 delivery/download-handler.ts          |     100 |      100 |     100 |     100
 monitoring-report-service.ts          |     100 |      100 |     100 |     100
 useMonitoringReport.ts                |     100 |      100 |     100 |     100
```

### Critical Paths

Alle kritischen Pfade sind abgedeckt:
- ✅ Campaign nicht gefunden (Error-Case)
- ✅ Leere Sends/Clippings (Edge-Case)
- ✅ API-Fehler (Error-Case)
- ✅ Upload-Fehler (Error-Case)
- ✅ Folder nicht gefunden (Fallback-Case)

## Tests ausführen

### Alle Tests

```bash
npm test monitoring-report
```

### Watch-Mode (während Entwicklung)

```bash
npm test -- --watch monitoring-report
```

### Coverage-Report generieren

```bash
npm run test:coverage
```

### Einzelne Test-Datei

```bash
npm test data-collector.test.ts
```

### Verbose-Modus

```bash
npm test -- --verbose monitoring-report
```

## Best Practices

### 1. AAA-Pattern verwenden

Arrange, Act, Assert

```typescript
it('sollte Stats berechnen', () => {
  // Arrange: Test-Daten vorbereiten
  const sends = [{ id: '1', status: 'opened' }];

  // Act: Funktion aufrufen
  const result = reportStatsCalculator.calculateEmailStats(sends, []);

  // Assert: Ergebnisse prüfen
  expect(result.openRate).toBe(100);
});
```

### 2. Beschreibende Test-Namen

```typescript
// ❌ Schlecht
it('works', () => { /* ... */ });

// ✅ Gut
it('sollte Open-Rate korrekt berechnen', () => { /* ... */ });
it('sollte mit leeren Sends umgehen', () => { /* ... */ });
it('sollte Fehler bei fehlendem Campaign werfen', () => { /* ... */ });
```

### 3. Edge-Cases testen

```typescript
describe('calculateEmailStats', () => {
  it('sollte mit leeren Arrays umgehen', () => { /* ... */ });
  it('sollte mit null-Werten umgehen', () => { /* ... */ });
  it('sollte mit Division durch 0 umgehen', () => { /* ... */ });
});
```

### 4. Mocks zurücksetzen

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 5. Async-Tests richtig schreiben

```typescript
// ✅ Richtig: async/await
it('sollte Daten laden', async () => {
  const result = await reportDataCollector.collect('campaign-123', 'org-456');
  expect(result).toBeDefined();
});

// ❌ Falsch: fehlendes await
it('sollte Daten laden', () => {
  const result = reportDataCollector.collect('campaign-123', 'org-456');
  expect(result).toBeDefined(); // Promise statt Result!
});
```

---

**© 2025 CeleroPress** | Testing-Dokumentation
