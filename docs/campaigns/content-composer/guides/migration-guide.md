# Migration Guide - CampaignContentComposer v1.x → v2.0

> **Guide**: Migration Guide
> **Zielgruppe**: Entwickler (Migration)
> **Dauer**: 10-15 Minuten

## Überblick

Der CampaignContentComposer v2.0 ist ein **Drop-in Replacement** für v1.x.

## Breaking Changes

❌ **KEINE Breaking Changes!**

Alle bestehenden Props werden unterstützt.

## Was ist neu?

### Version 2.0.0

**Added:**
- Custom Hooks: `usePDFGeneration`, `useBoilerplateProcessing`
- Shared Component: `FolderSelectorDialog`
- Performance-Optimierungen (useCallback, useMemo, React.memo)
- 97 Tests mit 100% Coverage
- Vollständige Dokumentation

**Changed:**
- Interne Code-Struktur (45.5% Code-Reduktion)
- Performance: 60-70% weniger Re-Renders

**Deprecated:**
- Keine

**Removed:**
- Keine

## Migration-Schritte

### Schritt 1: Keine Änderungen nötig

```tsx
// v1.x Code funktioniert unverändert
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';

<CampaignContentComposer
  organizationId={orgId}
  title={title}
  onTitleChange={setTitle}
  mainContent={content}
  onMainContentChange={setContent}
  onFullContentChange={setFullContent}
/>
```

### Schritt 2: (Optional) Performance-Optimierungen

Nutze neue Performance-Features:

```tsx
// Callbacks memoizen
const handleTitleChange = useCallback((title: string) => {
  setTitle(title);
}, []);

const handleContentChange = useCallback((content: string) => {
  setContent(content);
}, []);

<CampaignContentComposer
  onTitleChange={handleTitleChange}
  onMainContentChange={handleContentChange}
  // ...
/>
```

### Schritt 3: (Optional) Hooks nutzen

Nutze extrahierte Hooks in eigenen Components:

```tsx
import { usePDFGeneration } from '@/components/pr/campaign/hooks/usePDFGeneration';

function MyComponent() {
  const { handlePdfExport } = usePDFGeneration();

  return (
    <Button onClick={() => handlePdfExport(title)}>
      PDF exportieren
    </Button>
  );
}
```

## Legacy-Support

### position → order

v2.0 konvertiert automatisch Legacy-Sections:

```tsx
// Legacy-Format (v1.x)
const legacySections = [
  {
    id: '1',
    type: 'boilerplate',
    position: 0, // ← Legacy-Property
    // ...
  }
];

// Automatische Konvertierung zu:
{
  id: '1',
  type: 'boilerplate',
  order: 0, // ← Neue Property
  // ...
}

// Verwendung (keine Änderung nötig!)
<CampaignContentComposer
  initialBoilerplateSections={legacySections} // ✅ Funktioniert!
/>
```

## Testing

### Schritt 1: Bestehende Tests prüfen

```bash
npm test -- CampaignContentComposer
```

### Schritt 2: (Optional) Neue Test-Patterns nutzen

```tsx
// Siehe Testing Guide für Patterns
import { renderCampaignContentComposer } from '@/test-utils';

it('should render correctly', () => {
  const { getByDisplayValue } = renderCampaignContentComposer({
    title: 'Test',
  });

  expect(getByDisplayValue('Test')).toBeInTheDocument();
});
```

## Checkliste

- [ ] Code unverändert verwenden (Drop-in Replacement)
- [ ] Tests ausführen (`npm test`)
- [ ] (Optional) Performance-Optimierungen hinzufügen
- [ ] (Optional) Neue Hooks nutzen
- [ ] Dokumentation gelesen

## Support

Bei Fragen oder Problemen:
- [Haupt-README](../README.md)
- [API-Dokumentation](../api/README.md)
- [Troubleshooting](../README.md#troubleshooting)

---

**Guide erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)
