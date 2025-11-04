# Getting Started - CampaignContentComposer

> **Guide**: Getting Started
> **Zielgruppe**: Entwickler (Einsteiger)
> **Dauer**: 15-20 Minuten

## Überblick

Dieser Guide führt dich durch die ersten Schritte mit dem CampaignContentComposer.

### Was du lernst

- ✅ Basic Setup
- ✅ Erforderliche Props
- ✅ Erste Integration
- ✅ Häufige Patterns

### Voraussetzungen

- React 18+
- TypeScript 5+
- Grundkenntnisse in React Hooks

## Schritt 1: Import

```tsx
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
```

## Schritt 2: State-Setup

Der CampaignContentComposer benötigt mindestens 3 State-Variables:

```tsx
function MyComponent() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');

  // ...
}
```

**Warum 3 States?**
- `title`: Titel der Pressemitteilung
- `content`: Hauptinhalt aus Editor
- `fullContent`: Vollständiger Content (Titel + Sections + Datum)

## Schritt 3: Basic Integration

```tsx
function CreateCampaign() {
  const { organization } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');

  return (
    <CampaignContentComposer
      organizationId={organization.id}
      title={title}
      onTitleChange={setTitle}
      mainContent={content}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
    />
  );
}
```

**Das war's!** Der CampaignContentComposer rendert jetzt:
- Titel-Input mit KI-Generator
- Rich-Text-Editor (Gmail-Style)
- Boilerplate-Section-Management
- Live-Vorschau mit PDF-Export

## Schritt 4: Content speichern

Nutze `fullContent` zum Speichern:

```tsx
const handleSave = async () => {
  await campaignService.create({
    organizationId: organization.id,
    title,
    content: fullContent, // ← Vollständiger Content
  });

  toastService.success('Campaign gespeichert');
};

return (
  <div>
    <CampaignContentComposer {...props} />
    <Button onClick={handleSave}>Speichern</Button>
  </div>
);
```

## Schritt 5: Boilerplate-Sections (Optional)

Für Boilerplate-Support:

```tsx
import { type BoilerplateSection } from '@/components/pr/campaign/IntelligentBoilerplateSection';

function CreateCampaignWithBoilerplates() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [sections, setSections] = useState<BoilerplateSection[]>([]);

  return (
    <CampaignContentComposer
      organizationId={organization.id}
      title={title}
      onTitleChange={setTitle}
      mainContent={content}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
      initialBoilerplateSections={sections}
      onBoilerplateSectionsChange={setSections}
    />
  );
}
```

## Häufige Patterns

### Pattern 1: Auto-Save

```tsx
import { useEffect } from 'react';
import { debounce } from 'lodash';

function EditCampaign({ campaignId }: { campaignId: string }) {
  const [title, setTitle] = useState('');
  const [fullContent, setFullContent] = useState('');

  // Auto-Save mit Debouncing
  useEffect(() => {
    const save = debounce(async () => {
      if (!title) return; // Nicht speichern ohne Titel

      await campaignService.update(campaignId, {
        title,
        content: fullContent,
      });
    }, 2000);

    save();

    return () => save.cancel();
  }, [title, fullContent, campaignId]);

  return <CampaignContentComposer {...props} />;
}
```

### Pattern 2: Loading-State

```tsx
function EditCampaign({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(campaignId);

  if (isLoading) {
    return <Spinner />;
  }

  if (!campaign) {
    return <NotFound />;
  }

  return (
    <CampaignContentComposer
      organizationId={campaign.organizationId}
      title={campaign.title}
      mainContent={campaign.mainContent || ''}
      // ...
    />
  );
}
```

### Pattern 3: Validation

```tsx
function CreateCampaign() {
  const [title, setTitle] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!fullContent.trim()) {
      newErrors.content = 'Content ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toastService.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    await campaignService.create({ title, content: fullContent });
    toastService.success('Gespeichert');
  };

  return (
    <div>
      <CampaignContentComposer {...props} />
      {errors.title && <ErrorText>{errors.title}</ErrorText>}
      <Button onClick={handleSave}>Speichern</Button>
    </div>
  );
}
```

## Troubleshooting

### Problem: Vorschau bleibt leer

**Ursache:** `onFullContentChange` fehlt oder falsch

**Lösung:**
```tsx
// ✅ RICHTIG
<CampaignContentComposer
  onFullContentChange={setFullContent}
  // ...
/>

// ❌ FALSCH
<CampaignContentComposer
  // onFullContentChange fehlt
/>
```

### Problem: TypeScript-Fehler bei Sections

**Ursache:** Type-Import fehlt

**Lösung:**
```tsx
// ✅ RICHTIG
import { type BoilerplateSection } from '@/components/pr/campaign/IntelligentBoilerplateSection';

const [sections, setSections] = useState<BoilerplateSection[]>([]);

// ❌ FALSCH
const [sections, setSections] = useState([]);
```

### Problem: Re-Renders zu häufig

**Ursache:** Inline-Callbacks

**Lösung:**
```tsx
// ✅ RICHTIG
const handleTitleChange = useCallback((title: string) => {
  setTitle(title);
}, []);

<CampaignContentComposer
  onTitleChange={handleTitleChange}
/>

// ❌ FALSCH
<CampaignContentComposer
  onTitleChange={(title) => setTitle(title)}
/>
```

## Nächste Schritte

1. **Erweiterte Features:**
   - [Integration Guide](./integration-guide.md)
   - [API-Dokumentation](../api/CampaignContentComposer.md)

2. **Best Practices:**
   - [Performance Guide](../architecture/performance.md)
   - [Best Practices](../architecture/best-practices.md)

3. **Testing:**
   - [Testing Guide](./testing-guide.md)
   - [Test-Patterns](../../__tests__/README.md)

---

**Guide erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)
