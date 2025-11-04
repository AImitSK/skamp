# CampaignContentComposer - Guides

> **Modul**: Campaign Content Composer Guides
> **Version**: 2.0.0
> **Letzte Aktualisierung**: 04. November 2025

## Verfügbare Guides

| Guide | Beschreibung | Zielgruppe |
|-------|--------------|------------|
| [Getting Started](./getting-started.md) | Erste Schritte mit dem CampaignContentComposer | Entwickler (Einsteiger) |
| [Integration Guide](./integration-guide.md) | Integration in bestehende Apps | Entwickler (Fortgeschritten) |
| [Migration Guide](./migration-guide.md) | Upgrade von v1.x zu v2.0 | Entwickler (Migration) |
| [Testing Guide](./testing-guide.md) | Test-Patterns und Best Practices | Entwickler (Testing) |

## Quick Navigation

### Für Einsteiger
1. Start [Getting Started Guide](./getting-started.md)
2. Verstehe [Component Structure](../architecture/component-structure.md)
3. Lerne [API-Grundlagen](../api/README.md)

### Für Integration
1. Lies [Integration Guide](./integration-guide.md)
2. Verstehe [Data Flow](../architecture/data-flow.md)
3. Implementiere [Best Practices](../architecture/best-practices.md)

### Für Migration
1. Check [Migration Guide](./migration-guide.md)
2. Review [Breaking Changes](#breaking-changes)
3. Test mit [Testing Guide](./testing-guide.md)

### Für Testing
1. Folge [Testing Guide](./testing-guide.md)
2. Verstehe [ADR-003: Testing-Strategie](../adr/003-testing-strategie.md)
3. Review [Test-Dokumentation](../../__tests__/README.md)

## Breaking Changes

**Version 2.0.0:** ❌ KEINE Breaking Changes!

Der CampaignContentComposer v2.0 ist ein **Drop-in Replacement** für v1.x.

## Schnellreferenz

### Basic Setup

```tsx
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';

function MyComponent() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');

  return (
    <CampaignContentComposer
      organizationId={organizationId}
      title={title}
      onTitleChange={setTitle}
      mainContent={content}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
    />
  );
}
```

### Mit Boilerplate-Sections

```tsx
const [sections, setSections] = useState<BoilerplateSection[]>([]);

<CampaignContentComposer
  // ... andere Props
  initialBoilerplateSections={sections}
  onBoilerplateSectionsChange={setSections}
/>
```

### Mit Client-Kontext

```tsx
<CampaignContentComposer
  organizationId={org.id}
  clientId={client.id}
  clientName={client.name}
  // ... andere Props
/>
```

## Support

Bei Fragen oder Problemen:

1. **Dokumentation prüfen:**
   - [Haupt-README](../README.md)
   - [API-Dokumentation](../api/README.md)
   - [Troubleshooting](../README.md#troubleshooting)

2. **Tests ansehen:**
   - [Test-Dokumentation](../../__tests__/README.md)
   - [Test-Patterns](./testing-guide.md)

3. **ADRs lesen:**
   - [Architektur-Entscheidungen](../adr/README.md)

---

**Dokumentation erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)
