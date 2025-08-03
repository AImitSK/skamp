# Feature-Dokumentation: PR-Kampagnen Management

## 🎯 Anwendungskontext

**celeroPress** ist eine PR-Management-Plattform für den deutschsprachigen Raum, die PR-Agenturen und Kommunikationsabteilungen bei der Digitalisierung und Optimierung ihrer Medienarbeit unterstützt.

**Kernfunktionen der Plattform:**
- E-Mail-Management für Pressemitteilungen und Journalistenkommunikation
- Kontaktverwaltung mit Mediendatenbank
- Team-Kollaboration mit Multi-Tenancy
- KI-gestützte Textoptimierung und Vorschläge
- Workflow-Automatisierung für PR-Prozesse
- Analytics und Erfolgsmessung

**Dieses Feature im Kontext:**
Das Kampagnen-Modul ist das zentrale Werkzeug für die Erstellung, Verwaltung und den Versand von Pressemeldungen. Es integriert KI-Unterstützung, Freigabe-Workflows und E-Mail-Versand in einem nahtlosen Prozess für professionelle PR-Kommunikation.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > PR-Tools > Kampagnen
- **Route:** /dashboard/pr-tools/campaigns
- **Berechtigungen:** Alle Team-Mitglieder können Kampagnen erstellen, Admin-Freigabe erforderlich für Versand

## 🧹 Clean-Code-Checkliste (Realistisch)
- [ ] Alle console.log(), console.error() etc. entfernt
- [ ] Offensichtliche Debug-Kommentare entfernt (TODO, FIXME)
- [ ] Tote Importe entfernt (von TypeScript erkannt)
- [ ] Ungenutzte Variablen gelöscht (von Linter markiert)
- [ ] **Dokumentation:**
  - [ ] Komplexe Business-Logik kommentiert (KI-Integration, Freigabe-Workflow)
  - [ ] Veraltete Kommentare im aktuellen Feature entfernt
- [ ] **Dateien im Feature-Ordner geprüft:**
  - [ ] Offensichtlich ungenutzte Dateien identifiziert
  - [ ] [MANUELL PRÜFEN]: Vorschläge für zu löschende Dateien

## 🏗️ Code-Struktur (Realistisch)
- [ ] **Typen-Organisation:**
  - [x] Lokale Interface/Type Definitionen gefunden (Campaign-Types verstreut)
  - [x] VORSCHLAG: Wo diese hingehören könnten (@/types/pr.ts, @/types/campaigns.ts)
  - [ ] [NUR MIT BESTÄTIGUNG]: Typen verschieben
- [ ] **Offensichtliche Verbesserungen:**
  - [ ] Duplizierter Code identifiziert (Verschiedene Campaign-Komponenten)
  - [ ] Magic Numbers/Strings markiert (Status-Werte, KI-Parameter)
  - [ ] [VORSCHLAG]: Mögliche Extraktion in Konstanten
- [x] **Datei-Organisation:**
  - [x] Aktuelle Struktur dokumentiert
  - [x] [EMPFEHLUNG]: Bessere Organisation vorgeschlagen
  - [ ] [MANUELL]: Entscheidung über Umstrukturierung

## 📋 Feature-Beschreibung
### Zweck
Professionelle Pressemeldungen mit KI-Unterstützung erstellen, durch Freigabe-Workflows leiten und an ausgewählte Medienkontakte versenden.

### Hauptfunktionen
1. **Kampagnen-Erstellung** - Rich-Text Editor mit KI-Unterstützung für professionelle Pressemeldungen
2. **KI-Integration** - Google Gemini für automatische Textgenerierung und Optimierung
3. **Freigabe-Workflow** - Mehrstufiger Approval-Prozess mit Status-Management
4. **E-Mail-Versand** - Integration mit SendGrid für professionellen Versand
5. **Anhang-Management** - Integration mit Mediathek für Bilder und Dokumente
6. **Analytics** - Tracking von Öffnungsraten und Engagement

### Workflow
1. User erstellt neue Kampagne über "Neue Kampagne"
2. Inhalte mit Rich-Text Editor oder KI-Assistent erstellen
3. Metadaten (Betreff, Zielgruppe, Branche) definieren
4. Anhänge aus Mediathek hinzufügen
5. Zur Freigabe senden (Status: "In Freigabe")
6. Nach Freigabe: Empfänger-Listen auswählen
7. Kampagne versenden und Analytics verfolgen

## 🔧 Technische Details
### Komponenten-Struktur
```
- CampaignsPage (/dashboard/pr-tools/campaigns/page.tsx)
  - CampaignContentComposer
  - IntelligentBoilerplateSection
  - EmailComposer
    - EmailEditor
    - RecipientManager
    - SenderSelector
  - AiAssistantModal
  - StructuredGenerationModal
```

### State Management
- **Lokaler State:** Editor-Inhalt, Modal-Zustände, Kampagnen-Metadaten
- **Global State:** Campaign State über React Context
- **Server State:** Firebase für Kampagnen-Persistierung, SendGrid für E-Mail-Status

### API-Endpunkte
| Methode | Endpoint | Zweck | Response |
|---------|----------|-------|----------|
| GET | /api/campaigns | Kampagnen abrufen | Campaign[] |
| POST | /api/campaigns | Kampagne erstellen | Campaign |
| PUT | /api/campaigns/[id] | Kampagne aktualisieren | Campaign |
| POST | /api/campaigns/[id]/send | Kampagne versenden | SendResult |
| POST | /api/ai/generate | KI-Text generieren | GeneratedContent |
| POST | /api/sendgrid/send-pr-campaign | E-Mail versenden | SendGridResponse |

### Datenmodelle
```typescript
// Haupttypen die verwendet werden
interface Campaign {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'in_approval' | 'approved' | 'sent';
  metadata: CampaignMetadata;
  recipients: ContactList[];
  attachments: MediaFile[];
  analytics: CampaignAnalytics;
}

interface CampaignMetadata {
  subject: string;
  industry: string;
  tone: string;
  targetAudience: string[];
}
```

### Externe Abhängigkeiten
- **Libraries:** TipTap Editor, React DnD, React Query
- **Services:** Google Gemini AI, SendGrid, Firebase Firestore
- **Assets:** Editor-Icons, Campaign-Templates

## 🔄 Datenfluss
```
User Action → Campaign Component → AI Service / PR Service → Firebase/SendGrid → Analytics Update → UI Update
```
1. User-Interaktion im Editor oder KI-Assistent
2. Service-Aufruf an pr-service.ts oder AI-Service
3. Firebase für Persistierung, SendGrid für E-Mail-Versand
4. Analytics-Update für Tracking
5. UI-Update mit neuen Status-Informationen

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** CRM-Kontakte, Mediathek, Freigabe-System, E-Mail-Service
- **Wird genutzt von:** Analytics-Dashboard, Reporting
- **Gemeinsame Komponenten:** RichTextEditor, Button, Dialog, Badge

## ⚠️ Bekannte Probleme & TODOs
- [ ] KI-Rate-Limiting implementieren
- [ ] Erweiterte Analytics für Campaign-Performance
- [ ] Template-System für wiederkehrende Kampagnen
- [ ] A/B-Testing für verschiedene Betreffzeilen

## 🎨 UI/UX Hinweise
- **Design-Patterns:** Wizard-Pattern für Kampagnen-Erstellung, Tabs für verschiedene Bereiche
- **Responsive:** Ja, mobile Ansicht mit angepasstem Editor
- **Accessibility:** TipTap Editor mit Tastatur-Navigation, ARIA-Labels für Status

## 📊 Performance (Wenn erkennbar)
- **Potenzielle Probleme:** Große Rich-Text-Inhalte, KI-API-Latenz, E-Mail-Versand bei großen Listen
- **Vorhandene Optimierungen:** Debounced Auto-Save, Lazy Loading für Anhänge

## 🧪 Tests (Realistisch)
- **Tests gefunden:** Nein (im __tests__ Ordner gesucht)
- **Kritische Test-Szenarien:**
  - Kampagnen-CRUD-Operationen
  - KI-Integration und Fehlerbehandlung
  - E-Mail-Versand-Workflow
  - Freigabe-Prozess
  - Multi-Tenancy Isolation
- **Test-Priorität:** Hoch [Kernfunktion für E-Mail-Marketing, kritisch für Business]
- **User-Test-Anleitung:**
  1. Als User einloggen und zu Dashboard > PR-Tools > Kampagnen navigieren
  2. "Neue Kampagne" erstellen mit Titel und Inhalt
  3. KI-Assistent für Textgenerierung testen
  4. Metadaten (Betreff, Branche, Zielgruppe) ausfüllen
  5. Anhang aus Mediathek hinzufügen
  6. Zur Freigabe senden und Status-Änderung prüfen
  7. Als Admin freigeben und Versand testen
  8. Analytics-Daten nach Versand überprüfen

---
**Bearbeitet am:** 2025-08-03
**Status:** ✅ Fertig