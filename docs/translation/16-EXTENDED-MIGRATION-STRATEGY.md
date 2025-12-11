# Erweiterte i18n-Migrations-Strategie

**Status:** In Planung
**Erstellt:** 2025-12-11

---

## Problem

Die bisherige Migration hat nur nach Umlauten (äöüß) gesucht. Viele deutsche Texte wurden übersehen:
- "Firmen", "Personen", "Kontakte" (keine Umlaute)
- Option-Labels in Select-Dropdowns
- Konstanten mit Labels
- Layout-Dateien mit Navigation

**Beispiele gefundener Probleme:**
- `/dashboard/contacts/crm/` → H1 "Kontakte" statt übersetzt
- `/dashboard/contacts/crm/companies` → CompanyModal komplett deutsch
- Viele Select-Optionen: "Kunde", "Lieferant", "Geschäftlich", etc.

---

## Analyse

### Kategorie 1: Dateien ohne useTranslations (mit deutschen Texten)

**Dashboard App:** ~61 Dateien
**Components:** ~227 Dateien (davon ~30 mit Umlauten)

### Kategorie 2: Dateien mit unvollständiger Migration

~30+ Dateien haben useTranslations, aber noch hardcodierte deutsche Texte.

---

## Suchstrategien

### 1. Dateien ohne useTranslations
```bash
grep -rL "useTranslations" src/app/dashboard --include="*.tsx" | grep -v ".test."
```

### 2. Hardcodierte Strings in JSX
```bash
grep -rn ">[A-ZÄÖÜ][a-zäöüß]+<" src/ --include="*.tsx"
```

### 3. Option-Labels
```bash
grep -rn "<option.*>[A-ZÄÖÜ]" src/ --include="*.tsx"
```

### 4. Labels in Konstanten
```bash
grep -rn "label.*['\"][A-ZÄÖÜ]" src/ --include="*.tsx"
```

### 5. Deutsche Wörter ohne Umlaute
```bash
# Häufige deutsche Wörter
grep -rn -E "(Firma|Firmen|Person|Personen|Kontakt|Status|Laden|Speichern|Abbrechen|Löschen|Bearbeiten|Hinzufügen|Entfernen)" src/ --include="*.tsx"
```

---

## Priorisierte Bereiche

### Priorität 1: Layouts (Navigation sichtbar überall)
| Datei | Problem |
|-------|---------|
| `src/app/dashboard/contacts/crm/layout.tsx` | "Kontakte", "Firmen", "Personen" |
| `src/app/dashboard/library/layout.tsx` | Navigation-Labels |
| `src/app/dashboard/communication/inbox/layout.tsx` | Tab-Labels |

### Priorität 2: Modals (häufig genutzt)
| Datei | Problem |
|-------|---------|
| `src/app/dashboard/contacts/crm/CompanyModal.tsx` | ~100+ Labels |
| `src/app/dashboard/contacts/crm/ContactModalEnhanced.tsx` | Viele Labels |
| `src/app/dashboard/contacts/crm/ImportModalEnhanced.tsx` | Import-Labels |
| `src/app/dashboard/contacts/lists/ListModal.tsx` | Listen-Labels |
| `src/app/dashboard/library/media/UploadModal.tsx` | Upload-Labels |
| `src/app/dashboard/library/publications/PublicationModal/*.tsx` | 6 Dateien |

### Priorität 3: Campaign Edit Tabs
| Datei | Problem |
|-------|---------|
| `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/*.tsx` | 5 Tab-Dateien |
| `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/*.tsx` | 6 Komponenten |

### Priorität 4: Project Details
| Datei | Problem |
|-------|---------|
| `src/app/dashboard/projects/[projectId]/components/tab-content/*.tsx` | 7 Tab-Dateien |
| `src/app/dashboard/projects/[projectId]/components/header/*.tsx` | Header |

### Priorität 5: Lists Components
| Datei | Problem |
|-------|---------|
| `src/app/dashboard/contacts/lists/components/sections/*.tsx` | 6 Section-Dateien |
| `src/app/dashboard/contacts/lists/ContactSelectorModal.tsx` | Modal |

### Priorität 6: Domain/Email Komponenten
| Datei | Problem |
|-------|---------|
| `src/components/domains/*.tsx` | 6 Dateien |
| `src/components/email/*.tsx` | 5 Dateien |

### Priorität 7: Freigabe Komponenten
| Datei | Problem |
|-------|---------|
| `src/components/freigabe/*.tsx` | 6 Dateien |

### Priorität 8: Unvollständige Migrationen (30+ Dateien)
Dateien mit useTranslations die noch hardcodierte Texte haben.

---

## Vorgehen

### Phase 1: Kritische Layouts
1. Alle layout.tsx migrieren (Navigation überall sichtbar)
2. Type-Check nach jeder Datei

### Phase 2: Große Modals
1. CompanyModal.tsx (~100+ Labels)
2. ContactModalEnhanced.tsx
3. Andere Modals

### Phase 3: Systematisch nach Bereichen
- Campaign Edit
- Project Details
- Lists
- Domain/Email
- Freigabe

### Phase 4: Unvollständige Migrationen
- Alle Dateien mit useTranslations durchgehen
- Verbliebene hardcodierte Texte migrieren

---

## Geschätzte Arbeit

| Bereich | Dateien | Geschätzte Keys |
|---------|---------|-----------------|
| Layouts | 5 | ~50 |
| Modals | 15 | ~500 |
| Campaign Edit | 11 | ~200 |
| Project Details | 8 | ~150 |
| Lists | 7 | ~100 |
| Domain/Email | 11 | ~200 |
| Freigabe | 6 | ~100 |
| Unvollständige | 30 | ~300 |
| **Gesamt** | **~93** | **~1600** |

---

## Empfehlung

1. **Neue Checklist erstellen:** `09.2-EXTENDED-MIGRATION-CHECKLIST.md`
2. **Layouts zuerst:** Höchste Sichtbarkeit
3. **Parallel arbeiten:** 5-10 Agenten gleichzeitig
4. **Strenger prüfen:** Nach Migration grep nach deutschen Wörtern
