# Fachbegriff-Glossar

**Status:** Konzept
**Priorität:** 1.5 (Teil der Foundation, kritisch für KI-Qualität)

---

## Ziel

Fachbegriffe und **kundenspezifische** Terminologie werden zentral gepflegt. Die KI-Übersetzung respektiert diese Vorgaben, um konsistente und korrekte Übersetzungen zu gewährleisten.

---

## Problemstellung

Ohne Glossar:
```
DE: "Die neue Spannwelle ermöglicht höhere Drehzahlen."
KI: "The new tension shaft enables higher speeds."  ❌ Falsch!

Korrekt:
KI: "The new air shaft enables higher speeds."  ✅
```

**Fachbegriffe können nicht erraten werden** - sie müssen definiert sein.

**Zusätzlich:** Verschiedene Kunden verwenden unterschiedliche Terminologie für gleiche Konzepte!

```
Kunde KBA:    "Druckmaschine" → "Printing Press"
Kunde Heidelberg: "Druckmaschine" → "Press" (kürzer!)
```

---

## Design-Entscheidung: Glossar pro Kunde

**Wichtig:** Das Glossar ist **KUNDEN-spezifisch**, nicht organisations-weit.

### Warum pro Kunde?
- Verschiedene Kunden haben unterschiedliche Terminologie
- Gleicher Begriff kann unterschiedlich übersetzt werden müssen
- Kunden-spezifische Produktnamen und Marken
- Branchenspezifische Variationen

### UI-Darstellung

Das Glossar wird in `/settings/language` angezeigt mit einer **Kunde-Spalte**:

```
┌───────────┬───────────────┬───────────┬────────────────┐
│ Kunde     │ Deutsch       │ Englisch  │ Französisch    │
├───────────┼───────────────┼───────────┼────────────────┤
│ KBA       │ Spannwelle    │ Air Shaft │ Arbre expansi. │
│ KBA       │ Druckmaschine │ Press     │ Presse         │
│ Bosch     │ Steuergerät   │ ECU       │ Calculateur    │
└───────────┴───────────────┴───────────┴────────────────┘
```

---

## Datenmodell

### CustomerGlossaryEntry Collection (NEU)
```typescript
interface CustomerGlossaryEntry {
  id: string;
  organizationId: string;
  customerId: string;                // ⬅️ KUNDEN-REFERENZ (Company ID)

  // Übersetzungen - dynamisch basierend auf contentLanguages
  translations: {
    de: string;                      // Pflicht (Primärsprache)
    en?: string;
    fr?: string;
    es?: string;
    [key: string]: string | undefined;
  };

  // Kontext
  context?: string;                  // "Im Bereich Druckmaschinen"
  notes?: string;                    // Interne Notizen
  domain?: string;                   // "Drucktechnik"

  // Status
  isApproved: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### Firestore Structure
```
organizations/{orgId}/customer_glossary/{entryId}
```

**Index:** `customerId` + `organizationId` für effiziente Abfragen

---

## UI: Glossar-Eintrag Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Neuer Glossar-Eintrag                                          │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  Kunde:                                                         │
│  [▼ Kunde auswählen...                          ]               │
│     ├─ KBA                                                      │
│     ├─ Bosch                                                    │
│     └─ Heidelberg                                               │
│                                                                 │
│  ───────────────────────────────────────────────────────────────│
│                                                                 │
│  Deutsch (Primärsprache):                                       │
│  [Spannwelle                                    ]               │
│                                                                 │
│  Englisch:                     (basierend auf contentLanguages) │
│  [Air Shaft                                     ]               │
│                                                                 │
│  Französisch:                  (basierend auf contentLanguages) │
│  [Arbre expansible                              ]               │
│                                                                 │
│  Kontext (optional):                                            │
│  [Drucktechnik, Rollenoffset                    ]               │
│                                                                 │
│  [Abbrechen]                              [Speichern]           │
└─────────────────────────────────────────────────────────────────┘
```

**Hinweis:** Die Sprach-Spalten im Modal werden dynamisch basierend auf den
konfigurierten `contentLanguages` der Organisation generiert.

---

## UI: Glossar in Settings

**Ort:** `/settings/language` (integriert in die Sprach-Einstellungen)

Die Glossar-Tabelle zeigt alle kundenspezifischen Einträge mit Filter- und Suchmöglichkeiten:

```
┌─────────────────────────────────────────────────────────────────┐
│  Glossar                                                        │
│  ───────────────────────────────────────────────────────────────│
│                                                                 │
│  ℹ️ Definieren Sie kundenspezifische Fachbegriffe, die bei      │
│     KI-Übersetzungen exakt so übersetzt werden sollen.          │
│                                                                 │
│  [+ Neuer Eintrag]    [▼ Alle Kunden]           🔍 Suchen...   │
│                                                                 │
│  ┌───────────┬───────────────┬───────────┬────────────┬──────┐ │
│  │ Kunde     │ Deutsch       │ Englisch  │ Franz.     │      │ │
│  ├───────────┼───────────────┼───────────┼────────────┼──────┤ │
│  │ KBA       │ Spannwelle    │ Air Shaft │ Arbre exp. │ ✏️🗑️ │ │
│  │ KBA       │ Druckmaschine │ Press     │ Presse     │ ✏️🗑️ │ │
│  │ Bosch     │ Steuergerät   │ ECU       │ Calculat.  │ ✏️🗑️ │ │
│  │ Heidelberg│ Farbwerk      │ Ink Unit  │ Encrier    │ ✏️🗑️ │ │
│  └───────────┴───────────────┴───────────┴────────────┴──────┘ │
│                                                                 │
│  Zeige 1-4 von 47 Einträgen                     [← 1 2 3 →]    │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter nach Kunde (Dropdown)
- Suche über alle Begriffe
- Sprach-Spalten dynamisch basierend auf `contentLanguages`
- Inline-Aktionen: Bearbeiten, Löschen

---

## Integration in KI-Übersetzung

### Glossar-Abruf für Kundenspezifische Übersetzung
```typescript
async function getGlossaryForTranslation(
  organizationId: string,
  customerId: string,        // ⬅️ NEU: Kunde für den übersetzt wird
  targetLanguage: LanguageCode
): Promise<CustomerGlossaryEntry[]> {
  // Nur Einträge für diesen spezifischen Kunden laden
  const entries = await glossaryService.getByCustomer(organizationId, customerId);
  return entries.filter(e =>
    e.translations[targetLanguage] &&
    e.isApproved
  );
}
```

### Genkit Flow mit Kunden-Glossar
```typescript
const translateWithGlossary = ai.defineFlow(
  {
    name: 'translatePressRelease',
    inputSchema: z.object({
      content: z.string(),
      targetLanguage: z.string(),
      customerId: z.string(),     // ⬅️ NEU: Kunde-ID
      organizationId: z.string(),
    })
  },
  async (input) => {
    // Kunden-spezifisches Glossar laden
    const glossaryEntries = await getGlossaryForTranslation(
      input.organizationId,
      input.customerId,
      input.targetLanguage
    );

    const glossaryPrompt = glossaryEntries
      .map(e => `"${e.translations.de}" → "${e.translations[input.targetLanguage]}"${e.context ? ` (${e.context})` : ''}`)
      .join('\n');

    const prompt = `
      Du bist ein professioneller Übersetzer.

      FACHBEGRIFFE FÜR DIESEN KUNDEN - MÜSSEN exakt so übersetzt werden:
      ${glossaryPrompt || '(Keine speziellen Fachbegriffe definiert)'}

      Übersetze folgenden Text ins ${input.targetLanguage}:
      ${input.content}
    `;

    // ...
  }
);
```

---

## Import/Export

### CSV-Import
```
Deutsch;Englisch;Französisch;Kontext
Spannwelle;Air Shaft;Arbre expansible;Drucktechnik
Druckmaschine;Printing Press;Presse à imprimer;Drucktechnik
```

### CSV-Export
- Für Backup
- Für Review durch Übersetzer
- Für Verwendung in anderen Tools

---

## Best Practices

### Was ins Glossar gehört:
- ✅ Fachbegriffe der Branche
- ✅ Produktnamen (die NICHT übersetzt werden sollen)
- ✅ Firmenspezifische Terminologie
- ✅ Branchenspezifische Abkürzungen

### Was NICHT ins Glossar gehört:
- ❌ Allgemeine Wörter ("Unternehmen", "Produkt")
- ❌ Vollständige Sätze
- ❌ Floskeln

---

## Implementierungs-Schritte

1. [ ] Datenmodell: `TranslationGlossary` + `GlossaryEntry` Collections
2. [ ] Service: CRUD für Glossar-Einträge
3. [ ] UI: Glossar-Verwaltung in Settings
4. [ ] UI: Eintrag hinzufügen/bearbeiten Modal
5. [ ] Integration: Glossar in Genkit Flow einbinden
6. [ ] Feature: CSV Import/Export
7. [ ] Feature: Suche in Glossar

---

## Erweiterungsideen (Zukunft)

- **Auto-Suggest:** KI schlägt neue Glossar-Einträge vor basierend auf Übersetzungen
- **Konflikt-Erkennung:** Warnung wenn gleicher Begriff unterschiedlich übersetzt wird
- **Glossar-Sharing:** Branchenspezifische Glossare zwischen Organisationen teilen
