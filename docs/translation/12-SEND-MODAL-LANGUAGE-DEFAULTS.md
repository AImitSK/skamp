# Versand-Modal Sprach-Defaults

**Status:** Konzept
**Priorität:** Mittel
**Zuletzt aktualisiert:** 2025-12-10

---

## Übersicht

Dieses Dokument beschreibt die Anpassungen am Versand-Modal für Pressemeldungen, um sprachspezifische Defaults zu setzen.

---

## Betroffene Bereiche

### 1. Übersetzungs-Tabs Default-Sprache

Bei Projekten mit Übersetzungen soll Deutsch die Default-Primärsprache sein.

### 2. Sprach-Auswahl im Versand-Modal

Im letzten Schritt des Versand-Modals sollen verfügbare Übersetzungen (inkl. Englisch) standardmäßig vorausgewählt sein.

### 3. Default E-Mail-Text

Der Default-E-Mail-Text im Versand-Modal soll auf Englisch sein, wenn Englisch als Zielsprache ausgewählt ist.

---

## Aktuelle Implementierung

### Versand-Modal Struktur

```
EmailSendModal
└── EmailComposer (3 Schritte)
    ├── Step1Content (Anschreiben)
    ├── Step2Details (Empfänger, Absender)
    └── Step3Preview (Vorschau + Sprachauswahl)
        └── TranslationLanguageSelector
```

### Betroffene Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/components/pr/email/EmailComposer.tsx` | Haupt-Email-Composer |
| `src/components/pr/email/Step1Content.tsx` | E-Mail-Text bearbeiten |
| `src/components/pr/email/Step3Preview.tsx` | Sprachauswahl + Versand |
| `src/components/pr/email/TranslationLanguageSelector.tsx` | Sprach-Checkbox-Auswahl |

---

## Änderung 1: Übersetzungs-Sprach-Defaults

### Aktueller Zustand

**Datei:** `src/components/pr/email/TranslationLanguageSelector.tsx`

```typescript
// Aktuell: Nur Original vorausgewählt
const [selectedLanguages, setSelectedLanguages] = useState<SelectedLanguages>({
  original: true,
  translations: []  // Keine Übersetzungen vorausgewählt
});
```

### Ziel-Zustand

```typescript
// NEU: Alle verfügbaren Übersetzungen vorausgewählt
const [selectedLanguages, setSelectedLanguages] = useState<SelectedLanguages>({
  original: true,
  translations: availableTranslations.map(t => t.language)  // Alle vorausgewählt
});
```

### Implementierung

**Datei:** `src/components/pr/email/TranslationLanguageSelector.tsx`

```typescript
// useEffect um Defaults zu setzen wenn Übersetzungen geladen werden
useEffect(() => {
  if (translations && translations.length > 0) {
    // Alle verfügbaren Übersetzungen als Default auswählen
    const defaultSelected: SelectedLanguages = {
      original: true,
      translations: translations.map(t => t.language)
    };
    onSelectedLanguagesChange(defaultSelected);
  }
}, [translations]);
```

**Datei:** `src/components/pr/email/Step3Preview.tsx`

```typescript
// Initial State mit allen Sprachen
const getInitialSelectedLanguages = (translations: ProjectTranslation[]): SelectedLanguages => {
  return {
    original: true,
    translations: translations
      .filter(t => !t.isOutdated)  // Optional: Veraltete ausschließen
      .map(t => t.language)
  };
};
```

---

## Änderung 2: Default E-Mail-Text internationalisieren

### Aktueller Zustand

**Datei:** `src/components/pr/email/EmailComposer.tsx` (Zeile 193-197)

```typescript
// Aktuell: Hardcodierter deutscher Text
const defaultEmailContent = `
<p>{{salutationFormal}} {{title}} {{firstName}} {{lastName}},</p>
<p>ich freue mich, Ihnen unsere aktuelle Pressemitteilung "${campaignTitle}" zukommen zu lassen.</p>
<p>Die Mitteilung dürfte für Ihre Leserschaft von besonderem Interesse sein, da sie wichtige Entwicklungen aufzeigt.</p>
<p>Gerne stehe ich Ihnen für Rückfragen, weitere Informationen oder ein persönliches Gespräch zur Verfügung. Bildmaterial sowie ergänzende Unterlagen finden Sie anbei.</p>
<p>Über eine Veröffentlichung würde ich mich sehr freuen.</p>
`;
```

### Ziel-Zustand

```typescript
// NEU: Sprachabhängiger Default-Text
const getDefaultEmailContent = (language: 'de' | 'en', campaignTitle: string) => {
  if (language === 'en') {
    return `
<p>{{salutationFormal}} {{title}} {{firstName}} {{lastName}},</p>
<p>I am pleased to share our latest press release "${campaignTitle}" with you.</p>
<p>This announcement should be of particular interest to your readership as it highlights important developments.</p>
<p>Please don't hesitate to contact me if you have any questions, need additional information, or would like to arrange an interview. Images and supplementary materials are attached.</p>
<p>I would be delighted if you could consider this for publication.</p>
`;
  }

  return `
<p>{{salutationFormal}} {{title}} {{firstName}} {{lastName}},</p>
<p>ich freue mich, Ihnen unsere aktuelle Pressemitteilung "${campaignTitle}" zukommen zu lassen.</p>
<p>Die Mitteilung dürfte für Ihre Leserschaft von besonderem Interesse sein, da sie wichtige Entwicklungen aufzeigt.</p>
<p>Gerne stehe ich Ihnen für Rückfragen, weitere Informationen oder ein persönliches Gespräch zur Verfügung. Bildmaterial sowie ergänzende Unterlagen finden Sie anbei.</p>
<p>Über eine Veröffentlichung würde ich mich sehr freuen.</p>
`;
};
```

### Default-Metadaten erweitern

```typescript
const getDefaultMetadata = (language: 'de' | 'en', campaignTitle: string) => {
  if (language === 'en') {
    return {
      subject: `Press Release: ${campaignTitle}`,
      preheader: 'Current press release for your coverage'
    };
  }

  return {
    subject: `Pressemitteilung: ${campaignTitle}`,
    preheader: 'Aktuelle Pressemitteilung für Ihre Berichterstattung'
  };
};
```

---

## Änderung 3: Sprach-Auswahl UI

### Sprach-Toggle Logik

**Datei:** `src/components/pr/email/Step3Preview.tsx`

```typescript
// Neue Sprach-Auswahl für E-Mail-Text
const [emailLanguage, setEmailLanguage] = useState<'de' | 'en'>('de');

// Bei Sprachwechsel: Default-Text aktualisieren
const handleEmailLanguageChange = (newLanguage: 'de' | 'en') => {
  setEmailLanguage(newLanguage);

  // Nur Default-Text ändern wenn noch nicht manuell bearbeitet
  if (!isEmailBodyModified) {
    setEmailContent(getDefaultEmailContent(newLanguage, campaignTitle));
    setMetadata(getDefaultMetadata(newLanguage, campaignTitle));
  }
};
```

### UI-Erweiterung

```tsx
// In Step1Content oder Step3Preview
<div className="mb-4">
  <label className="text-sm font-medium">E-Mail Sprache</label>
  <RadioGroup value={emailLanguage} onChange={handleEmailLanguageChange}>
    <RadioGroup.Option value="de">
      <span className="flex items-center gap-2">
        <LanguageFlagIcon language="de" size="sm" />
        Deutsch
      </span>
    </RadioGroup.Option>
    <RadioGroup.Option value="en">
      <span className="flex items-center gap-2">
        <LanguageFlagIcon language="en" size="sm" />
        English
      </span>
    </RadioGroup.Option>
  </RadioGroup>
</div>
```

---

## Implementierungsplan

### Phase 1: Sprach-Defaults für Übersetzungen

1. **TranslationLanguageSelector anpassen**
   - Default: Alle verfügbaren Übersetzungen ausgewählt
   - Optional: Veraltete Übersetzungen ausschließen

2. **Step3Preview Initial-State**
   - Beim Laden: Alle Sprachen vorauswählen

### Phase 2: E-Mail-Text Internationalisierung

1. **Default-Texte als Konstanten**
   - Deutsche Version (bestehend)
   - Englische Version (neu)

2. **Sprach-Selector in Step1Content**
   - Toggle für E-Mail-Sprache
   - Default basierend auf Kampagnen-Sprache

3. **Automatischer Default-Wechsel**
   - Wenn Kampagne englisch ist → Englischer Default
   - Wenn Kampagne deutsch ist → Deutscher Default

### Phase 3: Integration mit Kampagnen-Sprache

1. **Kampagnen-Sprache auslesen**
   - Aus `PRCampaign.language` (falls implementiert)
   - Fallback: 'de'

2. **Automatische Sprach-Erkennung**
   - E-Mail-Sprache = Kampagnen-Sprache

---

## Datenmodell-Erweiterungen

### EmailDraft erweitern

```typescript
interface EmailDraft {
  // ... bestehende Felder
  language?: 'de' | 'en';  // Sprache des Anschreibens
}
```

### SendEmailRequest erweitern

```typescript
interface SendEmailRequest {
  // ... bestehende Felder
  emailLanguage?: 'de' | 'en';  // Sprache des Anschreibens
}
```

---

## Test-Szenarien

### 1. Sprach-Defaults für Übersetzungen
- [ ] Bei Kampagne mit EN-Übersetzung: EN vorausgewählt
- [ ] Bei Kampagne ohne Übersetzungen: Nur Original ausgewählt
- [ ] Bei veralteten Übersetzungen: Warnung anzeigen

### 2. E-Mail-Text Defaults
- [ ] Deutsche Kampagne → Deutscher E-Mail-Text
- [ ] Englische Kampagne → Englischer E-Mail-Text
- [ ] Manueller Sprachwechsel funktioniert

### 3. Metadaten Defaults
- [ ] Betreff in korrekter Sprache
- [ ] Preheader in korrekter Sprache

---

## Betroffene API-Endpoints

| Endpoint | Änderung |
|----------|----------|
| `POST /api/pr/email/send` | `emailLanguage` Parameter hinzufügen |
| `POST /api/pr/email/test` | `emailLanguage` Parameter hinzufügen |

---

## Aufwandsschätzung

| Komponente | Aufwand |
|------------|---------|
| TranslationLanguageSelector Defaults | 1h |
| E-Mail Default-Texte (DE/EN) | 2h |
| Sprach-Selector UI | 2h |
| API-Anpassungen | 1h |
| Tests | 2h |
| **Gesamt** | **~8h** |

---

## Abhängigkeiten

- Bestehende Übersetzungs-Infrastruktur (Phase 2)
- LanguageFlagIcon Komponente
- PRCampaign.language Feld (aus KI-Assistent Erweiterung)

