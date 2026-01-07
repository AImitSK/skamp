# Zod Schemas für AI-Generierung

Dieses Verzeichnis enthält alle Zod-Schemas für die KI-gestützte Generierung von Inhalten.

## Übersicht

### Pressemeldungs-Refactoring

#### `fakten-matrix-schemas.ts`
Schemas für die strukturierte Fakten-Matrix:
- `FaktenMatrixSchema` - Haupt-Schema für Tool-Call vom Project-Wizard
- `FaktenMatrixHookSchema` - W-Fragen (Was? Wo? Wann?)
- `FaktenMatrixDetailsSchema` - Substanz (Delta + Beweise)
- `FaktenMatrixQuoteSchema` - O-Ton (Speaker-Referenz + Kernaussage)

**Verwendung:**
```typescript
import { FaktenMatrixSchema } from '@/lib/ai/schemas';

const faktenMatrix = FaktenMatrixSchema.parse({
  hook: { event: '...', location: '...', date: '...' },
  details: { delta: '...', evidence: '...' },
  quote: { speakerId: '...', rawStatement: '...' }
});
```

#### `pm-vorlage-schemas.ts`
Schemas für die generierte PM-Vorlage:
- `PMVorlageSchema` - Haupt-Schema für PM-Vorlage
- `PMVorlageContentSchema` - Versionierbarer Content-Teil
- `PMVorlageQuoteSchema` - Zitat-Struktur
- `GeneratePMVorlageInputSchema` - Input für Generierungs-Flow

**Verwendung:**
```typescript
import { PMVorlageSchema } from '@/lib/ai/schemas';

const pmVorlage = PMVorlageSchema.parse({
  headline: '...',
  leadParagraph: '...',
  bodyParagraphs: ['...', '...', '...'],
  quote: { text: '...', person: '...', role: '...', company: '...' },
  cta: '...',
  hashtags: ['#...', '#...'],
  htmlContent: '...',
  targetGroup: 'ZG1',
  markenDNAHash: '...',
  faktenMatrixHash: '...'
});
```

### Bestehende Schemas

#### `press-release-structured-schemas.ts`
Legacy-Schemas für Standard-Modus Pressemeldungs-Generierung:
- `GeneratePressReleaseStructuredInputSchema` - Input für Standard-Modus
- `StructuredPressReleaseSchema` - Output-Schema
- `PressReleaseContextSchema` - Optionaler Kontext
- `DocumentContextSchema` - Dokument-Kontext (max. 3 Dokumente)

## Validierungsregeln

### Fakten-Matrix
- **event**: 10-500 Zeichen
- **location**: 2-200 Zeichen
- **date**: 4-100 Zeichen
- **delta**: 20-1000 Zeichen
- **evidence**: 10-1000 Zeichen
- **speakerId**: Mindestens 1 Zeichen
- **rawStatement**: 20-500 Zeichen

### PM-Vorlage
- **headline**: 10-75 Zeichen (SEO-optimiert)
- **leadParagraph**: 80-200 Zeichen
- **bodyParagraphs**: 3-4 Absätze, je 150-400 Zeichen
- **quote.text**: 20-500 Zeichen
- **quote.person**: 2-100 Zeichen
- **quote.role**: 2-100 Zeichen
- **quote.company**: 2-100 Zeichen
- **cta**: 20-300 Zeichen
- **hashtags**: 2-3 Hashtags, je 2-50 Zeichen
- **history**: Maximal 3 Einträge

## Best Practices

1. **Immer validieren vor Firestore-Speicherung**
   ```typescript
   const validated = FaktenMatrixSchema.parse(data);
   await firestore.collection('...').doc('...').set(validated);
   ```

2. **Fehlerbehandlung**
   ```typescript
   try {
     const validated = PMVorlageSchema.parse(data);
   } catch (error) {
     if (error instanceof z.ZodError) {
       console.error('Validierungsfehler:', error.errors);
     }
   }
   ```

3. **Type-Safety mit infer**
   ```typescript
   import { z } from 'genkit';
   import { FaktenMatrixSchema } from '@/lib/ai/schemas';

   type FaktenMatrix = z.infer<typeof FaktenMatrixSchema>;
   ```

## Siehe auch

- [TypeScript-Typen](../../types/README.md)
- [Planungsdokumentation](../../../../docs/planning/Press-Release-Refactoring/)
