# Native Mehrsprachigkeit

**Status:** Konzept
**Priorität:** 3 (Langfristig)
**Sprachen:** Max. 4, konfigurierbar pro Organisation

---

## Ziel

Boilerplates, Signaturen und andere wiederverwendbare Inhalte können in mehreren Sprachen gepflegt werden. KI generiert Vorschläge, User editiert und gibt frei.

---

## Unterschied zu KI-Übersetzung (Säule 2)

| Aspekt | KI-Übersetzung | Native Mehrsprachigkeit |
|--------|----------------|-------------------------|
| **Anwendung** | Einmalig pro Kampagne | Wiederverwendbare Bausteine |
| **Bearbeitung** | Optional Review | Manuelles Editieren erwartet |
| **Qualität** | "Good enough" | Perfekt/Freigegeben |
| **Beispiele** | Pressemitteilung | Boilerplate, Signatur |

---

## Betroffene Entitäten

| Entität | Übersetzung | Status |
|---------|-------------|--------|
| Boilerplates | ✅ Datenmodell existiert | UI fehlt |
| Signaturen | ❌ Modell erweitern | - |
| Email-Templates | ❌ Neu konzipieren | - |

---

## Globale Sprach-Konfiguration

### Organization Settings
```typescript
interface OrganizationSettings {
  // ... existing

  // Internationalisierung
  contentLanguages: LanguageCode[];    // Max 4: ['de', 'en', 'fr', 'es']
  primaryLanguage: LanguageCode;       // 'de' - Fallback/Default
}
```

### Settings UI
```
┌─────────────────────────────────────────────────────────────────┐
│  Einstellungen → Sprachen                                       │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  Primäre Sprache:                                               │
│  [Deutsch                    ▼]                                 │
│                                                                 │
│  Zusätzliche Sprachen für Inhalte (max. 3):                    │
│  ☑ Englisch                                                     │
│  ☐ Französisch                                                  │
│  ☐ Spanisch                                                     │
│  ☐ Italienisch                                                  │
│  ☐ Niederländisch                                               │
│                                                                 │
│  ℹ️ Diese Sprachen stehen für Boilerplates, Signaturen          │
│     und andere Inhalte zur Verfügung.                           │
│                                                                 │
│  [Speichern]                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Boilerplate-Übersetzungen

### Datenmodell (bereits vorbereitet!)
```typescript
interface BoilerplateEnhanced {
  // ... existing

  language?: LanguageCode;           // Primärsprache
  translations?: {
    [key in LanguageCode]?: {
      name: string;
      content: string;
      description?: string;
      status: 'draft' | 'approved';
      lastEditedBy?: string;
      lastEditedAt?: Timestamp;
    };
  };
}
```

### UI: Boilerplate Editor mit Tabs
```
┌─────────────────────────────────────────────────────────────────┐
│  Boilerplate bearbeiten                                         │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  Name: [Über uns - Unternehmensbeschreibung    ]               │
│                                                                 │
│  ┌─────┬─────┬─────┬─────────────────────────────┐             │
│  │ 🇩🇪  │ 🇬🇧  │ 🇫🇷  │                              │ Sprach-Tabs│
│  │ DE  │ EN  │ FR  │  [+ Sprache]                │             │
│  └─────┴─────┴─────┴─────────────────────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Die Muster GmbH ist ein führender Anbieter...         │   │
│  │                                                         │   │
│  │  (Rich Text Editor)                                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Status: ○ Entwurf  ● Freigegeben                              │
│                                                                 │
│  [🤖 KI-Vorschlag generieren]                                  │
│                                                                 │
│  [Abbrechen]                              [Speichern]          │
└─────────────────────────────────────────────────────────────────┘
```

### KI-Vorschlag Workflow
1. User klickt "KI-Vorschlag generieren"
2. Modal öffnet sich mit generiertem Text
3. User kann Vorschlag übernehmen, editieren oder verwerfen
4. Übernommener Text wird in Editor eingefügt
5. User muss manuell speichern

---

## Signatur-Übersetzungen

### Datenmodell erweitern
```typescript
interface EmailSignature {
  // ... existing

  language?: LanguageCode;
  translations?: {
    [key in LanguageCode]?: {
      content: string;              // HTML
      status: 'draft' | 'approved';
    };
  };
}
```

### UI: Analog zu Boilerplates

---

## Kampagnen-Integration

### Sprachauswahl bei Boilerplate-Einfügung
```
┌─────────────────────────────────────────────────────────────────┐
│  Boilerplate einfügen                                           │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  Boilerplate: [Über uns               ▼]                       │
│                                                                 │
│  Verfügbare Sprachen:                                          │
│  ○ 🇩🇪 Deutsch (Original)                                       │
│  ● 🇬🇧 Englisch (Freigegeben)                                   │
│  ○ 🇫🇷 Französisch (Entwurf) ⚠️                                 │
│                                                                 │
│  Vorschau:                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Muster GmbH is a leading provider of...                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Abbrechen]                              [Einfügen]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Automatische Spracherkennung

Wenn eine Kampagne in einer bestimmten Sprache erstellt wird:
1. System schlägt passende Boilerplate-Sprache vor
2. System schlägt passende Signatur-Sprache vor
3. User kann überschreiben

---

## Implementierungs-Schritte

### Phase 1: Settings
1. [ ] Organization Settings um `contentLanguages` erweitern
2. [ ] Settings UI für Sprachkonfiguration
3. [ ] Validierung: Max 4 Sprachen

### Phase 2: Boilerplates
4. [ ] UI: Tab-basierter Editor
5. [ ] KI-Vorschlag Integration
6. [ ] Status-Tracking pro Sprache
7. [ ] Glossar-Anwendung bei KI-Vorschlag

### Phase 3: Signaturen
8. [ ] Datenmodell erweitern
9. [ ] UI analog zu Boilerplates

### Phase 4: Kampagnen-Integration
10. [ ] Sprachauswahl bei Boilerplate-Einfügung
11. [ ] Automatische Spracherkennung/Vorschläge

---

## Abgrenzung zu Säule 2 (KI-Übersetzung)

**Säule 2 (KI-Übersetzung):**
- Für einmalige Kampagnen-Inhalte
- Schnell, "good enough"
- Keine manuelle Pflege erwartet

**Säule 4 (Native Mehrsprachigkeit):**
- Für wiederverwendbare Bausteine
- Qualitätsanspruch: Perfekt
- Manuelle Pflege mit KI-Unterstützung
- Freigabe-Workflow
