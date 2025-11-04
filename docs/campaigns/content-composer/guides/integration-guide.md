# Integration Guide - CampaignContentComposer

> **Guide**: Integration Guide
> **Zielgruppe**: Entwickler (Fortgeschritten)
> **Dauer**: 30-45 Minuten

## Überblick

Dieser Guide zeigt, wie der CampaignContentComposer in bestehende CeleroPress-Apps integriert wird.

## Campaign Edit Page Integration

### Schritt 1: Campaign laden

```tsx
import { useCampaign } from '@/hooks/useCampaign';

function EditCampaign({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading, error } = useCampaign(campaignId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorPage error={error} />;
  if (!campaign) return <NotFound />;

  return <CampaignEditor campaign={campaign} />;
}
```

### Schritt 2: State initialisieren

```tsx
function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const [title, setTitle] = useState(campaign.title);
  const [content, setContent] = useState(campaign.mainContent || '');
  const [fullContent, setFullContent] = useState(campaign.content || '');
  const [sections, setSections] = useState<BoilerplateSection[]>(
    campaign.boilerplateSections || []
  );

  // Sync mit Campaign-Updates
  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title);
      setContent(campaign.mainContent || '');
      setSections(campaign.boilerplateSections || []);
    }
  }, [campaign]);

  return (
    <CampaignContentComposer
      organizationId={campaign.organizationId}
      clientId={campaign.clientId}
      clientName={campaign.clientName}
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

### Schritt 3: Auto-Save implementieren

```tsx
import { useMemo, useEffect } from 'react';
import { debounce } from 'lodash';

function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const [title, setTitle] = useState(campaign.title);
  const [fullContent, setFullContent] = useState('');
  const [sections, setSections] = useState<BoilerplateSection[]>([]);

  // Debounced Save-Funktion
  const debouncedSave = useMemo(
    () => debounce(async (data: Partial<Campaign>) => {
      try {
        await campaignService.update(campaign.id, data);
        toastService.success('Automatisch gespeichert');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000),
    [campaign.id]
  );

  // Auto-Save bei Änderungen
  useEffect(() => {
    if (!title) return; // Nicht speichern ohne Titel

    debouncedSave({
      title,
      content: fullContent,
      boilerplateSections: sections,
    });

    return () => debouncedSave.cancel();
  }, [title, fullContent, sections, debouncedSave]);

  return <CampaignContentComposer {...props} />;
}
```

## Props-Konfiguration

### Client-spezifische Campaigns

```tsx
<CampaignContentComposer
  organizationId={organization.id}
  clientId={client.id}           // ← Client-Filter
  clientName={client.name}        // ← UI-Anzeige
  // ...
/>
```

**Effekt:**
- Boilerplates: Zeigt Client-Boilerplates + Org-Boilerplates
- Folders: Zeigt Client-Ordner + Shared-Ordner

### PR-SEO Integration

```tsx
function CampaignWithSEO({ campaign }: { campaign: Campaign }) {
  const [keywords, setKeywords] = useState<string[]>(campaign.keywords || []);
  const [seoScore, setSeoScore] = useState<any>(null);

  return (
    <>
      <CampaignContentComposer
        organizationId={campaign.organizationId}
        title={campaign.title}
        mainContent={campaign.mainContent}
        keywords={keywords}
        onKeywordsChange={setKeywords}
        onSeoScoreChange={setSeoScore}
        // ...
      />

      {/* SEO-Dashboard */}
      <SEODashboard
        score={seoScore}
        keywords={keywords}
      />
    </>
  );
}
```

### Conditional Rendering

```tsx
function CampaignView({ campaign, mode }: { campaign: Campaign; mode: 'edit' | 'preview' }) {
  return (
    <CampaignContentComposer
      organizationId={campaign.organizationId}
      title={campaign.title}
      mainContent={campaign.mainContent}
      onTitleChange={setTitle}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
      // Conditional Props basierend auf Mode
      readOnlyTitle={mode === 'preview'}
      hideMainContentField={mode === 'preview'}
      hideBoilerplates={mode === 'preview'}
      hidePreview={false}
    />
  );
}
```

## Event-Handling

### Custom Validation

```tsx
function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);

    // Custom Validation
    if (newTitle.length > 200) {
      setErrors({ title: 'Titel zu lang (max. 200 Zeichen)' });
    } else {
      setErrors({});
    }
  };

  return (
    <>
      <CampaignContentComposer
        title={title}
        onTitleChange={handleTitleChange}
        // ...
      />
      {errors.title && <ErrorText>{errors.title}</ErrorText>}
    </>
  );
}
```

### Before-Save Hooks

```tsx
function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const [fullContent, setFullContent] = useState('');

  const handleSave = async () => {
    // Before-Save Hook
    const processedContent = await processContent(fullContent);

    // Validation
    if (!validateContent(processedContent)) {
      toastService.error('Content ungültig');
      return;
    }

    // Save
    await campaignService.update(campaign.id, {
      content: processedContent,
    });

    toastService.success('Gespeichert');
  };

  return (
    <>
      <CampaignContentComposer
        onFullContentChange={setFullContent}
        // ...
      />
      <Button onClick={handleSave}>Speichern</Button>
    </>
  );
}
```

## Best Practices

### 1. Callback-Memoization

```tsx
// ✅ RICHTIG
const handleTitleChange = useCallback((title: string) => {
  setTitle(title);
  debouncedSave({ title });
}, [debouncedSave]);

// ❌ FALSCH
<CampaignContentComposer
  onTitleChange={(title) => {
    setTitle(title);
    debouncedSave({ title });
  }}
/>
```

### 2. Error-Boundaries

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function CampaignPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <CampaignContentComposer {...props} />
    </ErrorBoundary>
  );
}
```

### 3. Loading-States

```tsx
function EditCampaign({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return (
    <div>
      <CampaignContentComposer {...props} />
      {saving && <SavingIndicator />}
    </div>
  );
}
```

## Troubleshooting

### Problem: State nicht synchron

**Lösung:** useEffect für Campaign-Updates

```tsx
useEffect(() => {
  if (campaign) {
    setTitle(campaign.title);
    // ...
  }
}, [campaign]);
```

### Problem: Auto-Save zu häufig

**Lösung:** Debouncing mit useMemo

```tsx
const debouncedSave = useMemo(
  () => debounce(saveFunction, 2000),
  [dependencies]
);
```

---

**Guide erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)
