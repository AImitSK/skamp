# SKAMP - Die Online Suite für Pressemeldungen

<!-- Deployment Trigger: 2025-09-25 - Stable Masterplan -->

SKAMP ist eine moderne und leistungsstarke Online-Suite, die speziell für PR-Agenturen und Marketingabteilungen entwickelt wurde, um den gesamten Prozess der Erstellung und Verteilung von Pressemeldungen zu optimieren. Die Plattform bietet ein integriertes CRM-System, eine intelligente Verwaltung von Verteilerlisten und eine fortschrittliche Mediathek, um deine PR-Arbeit effizienter und erfolgreicher zu gestalten.

## 🎯 Projekt-Fokus

Im Gegensatz zur ursprünglichen Idee einer kompletten Marketing-Suite konzentriert sich SKAMP nun vollständig auf die Bedürfnisse der Public Relations:

* **Effiziente Erstellung:** Verfasse und formatiere Pressemitteilungen direkt in der App.
* **Intelligente Verteilung:** Nutze dynamische und statische Verteilerlisten für eine zielgenaue Kommunikation.
* **Zentrales Management:** Verwalte all deine Kontakte, Medien und Kampagnen an einem Ort.
* **KI-Unterstützung:** Nutze die Power von Google Gemini, um Inhalte zu generieren und zu verbessern.

## 🛠️ Technologie-Stack

* **Framework:** Next.js 14 (App Router)
* **Sprache:** TypeScript
* **Backend & Datenbank:** Firebase (Firestore, Auth, Storage)
* **Styling:** Tailwind CSS
* **UI-Komponenten:** Headless UI
* **Text-Editor:** TipTap
* **E-Mail-Versand:** SendGrid
* **KI-Integration:** Google Gemini

## 🚀 Hauptfunktionen

### 1. Kontakte & CRM (`/contacts`)
Ein voll funktionsfähiges CRM zur Verwaltung von Journalisten, Medienhäusern und Unternehmen.
* **Personen- & Firmen-Management:** Detaillierte Profile für alle deine Kontakte.
* **Verteilerlisten:**
    * **Dynamische Listen:** Aktualisieren sich automatisch basierend auf von dir definierten Filtern (z.B. "Alle Tech-Journalisten in Berlin").
    * **Statische Listen:** Manuell zusammengestellte Listen für spezielle Anlässe.
* **Tagging-System:** Kategorisiere deine Kontakte mit farbcodierten Tags für eine bessere Übersicht.

### 2. PR-Tools (`/pr-tools`)
Das Herzstück von SKAMP für deine tägliche PR-Arbeit.
* **Kampagnen-Management:** Erstelle, verwalte und versende deine Pressekampagnen.
* **Freigabe-Workflow:** Ein optionaler Freigabeprozess, bei dem Kunden eine Vorschau der Kampagne erhalten und Feedback geben oder sie direkt freigeben können.
* **Mediathek (DAM):** Ein Digital Asset Management System zur zentralen Verwaltung deiner Medien. Lade Bilder, Videos und Dokumente hoch, organisiere sie in Ordnern und hänge sie an deine Kampagnen an.
* **Textbausteine (Boilerplates):** Speichere wiederverwendbare Textblöcke (z.B. "Über das Unternehmen"), um sie schnell in deine Pressemitteilungen einzufügen.

### 3. KI-Assistent (`/api/ai`)
Integrierte künstliche Intelligenz zur Unterstützung bei der Content-Erstellung.
* **Strukturierte Generierung:** Erhalte professionell formatierte Pressemitteilungen mit Headline, Lead-Absatz, Hauptteil und Zitat.
* **Kontext-Verständnis:** Definiere Branche, Tonalität und Zielgruppe für passgenaue Ergebnisse.
* **Template-basiertes Arbeiten:** Nutze bewährte Vorlagen für verschiedene Anlässe (z.B. Produkteinführung, Finanzierungsrunde).

---

## 📁 Detaillierte Projektstruktur (Endgültiger Stand)

Dieser Baum repräsentiert eine robuste und gut organisierte Struktur für den finalen Stand deines Projekts.

```plaintext
skamp/
├── .vscode/                          # Editor-Einstellungen (z.B. für Formatierung)
│   └── settings.json
├── public/                           # Statische Assets (Bilder, Favicons, etc.)
│   ├── fonts/
│   └── images/
└── src/
    ├── app/                          # Next.js 14 App Router
    │   ├── (auth)/                   # Route-Gruppe für Authentifizierung (Login, Registrierung)
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   ├── register/
    │   │   │   └── page.tsx
    │   │   └── layout.tsx            # Eigenes Layout für die Auth-Seiten
    │   ├── (dashboard)/              # Route-Gruppe für das geschützte Haupt-Dashboard
    │   │   ├── dashboard/            # Einstiegsseite nach dem Login
    │   │   │   └── page.tsx
    │   │   ├── contacts/             # =========== KONTAKTE & CRM ===========
    │   │   │   ├── crm/              # Verwaltung von Personen & Firmen
    │   │   │   │   └── page.tsx
    │   │   │   ├── lists/            # Verwaltung von Verteilern
    │   │   │   │   └── page.tsx
    │   │   │   └── layout.tsx        # Gemeinsames Layout für den Kontakte-Bereich
    │   │   ├── pr-tools/             # =========== PR-TOOLS ===========
    │   │   │   ├── campaigns/
    │   │   │   │   ├── edit/
    │   │   │   │   │   └── [campaignId]/ # Dynamische Route für die Bearbeitung einer Kampagne
    │   │   │   │   │       ├── page.tsx
    │   │   │   │   │       └── loading.tsx
    │   │   │   │   └── page.tsx      # Übersicht aller Kampagnen
    │   │   │   ├── approvals/        # Übersicht der Freigaben
    │   │   │   │   └── page.tsx
    │   │   │   ├── media-library/    # Mediathek (DAM)
    │   │   │   │   └── page.tsx
    │   │   │   ├── boilerplates/     # Verwaltung der Textbausteine
    │   │   │   │   └── page.tsx
    │   │   │   └── layout.tsx        # Gemeinsames Layout für die PR-Tools
    │   │   ├── admin/                # =========== ADMIN & EINSTELLUNGEN ===========
    │   │   │   ├── team/             # Team-Verwaltung
    │   │   │   │   └── page.tsx
    │   │   │   ├── billing/          # Abrechnung & Abonnements
    │   │   │   │   └── page.tsx
    │   │   │   └── layout.tsx
    │   │   └── layout.tsx            # Hauptlayout des Dashboards (mit Sidebar, Navbar, etc.)
    │   ├── api/                      # =========== BACKEND API-ROUTEN ===========
    │   │   ├── ai/                   # API für den KI-Assistenten
    │   │   │   └── generate/
    │   │   │       └── route.ts
    │   │   ├── auth/                 # Auth-Endpunkte (z.B. für NextAuth)
    │   │   │   └── [...nextauth]/
    │   │   │       └── route.ts
    │   │   └── webhooks/             # Webhooks (z.B. für SendGrid-Events)
    │   │       └── sendgrid/
    │   │           └── route.ts
    │   ├── share/                    # Öffentliche Freigabe-Seiten (ohne Login)
    │   │   └── campaign/
    │   │       └── [shareId]/        # Seite zur Ansicht & Freigabe einer Kampagne
    │   │           └── page.tsx
    │   ├── global-error.tsx          # Fehlerseite für die gesamte App
    │   ├── layout.tsx                # Root-Layout (definiert <html> und <body>)
    │   └── page.tsx                  # Startseite / Landing Page
    ├── components/                   # =========== UI & FUNKTIONS-KOMPONENTEN ===========
    │   ├── features/                 # Komponenten mit Business-Logik
    │   │   ├── campaigns/
    │   │   │   ├── CampaignEditor.tsx
    │   │   │   └── CampaignList.tsx
    │   │   ├── contacts/
    │   │   │   ├── ContactForm.tsx
    │   │   │   └── ContactTable.tsx
    │   │   └── media/
    │   │       └── MediaUploader.tsx
    │   └── ui/                       # Wiederverwendbare, "dumme" UI-Elemente
    │       ├── Button.tsx
    │       ├── Input.tsx
    │       ├── Modal.tsx
    │       ├── DataTable.tsx
    │       └── TextEditor.tsx        # Wrapper für den TipTap-Editor
    ├── context/                      # =========== REACT CONTEXT PROVIDER ===========
    │   ├── AppContext.tsx            # Globaler Kontext (z.B. für Notifications)
    │   └── AuthProvider.tsx          # Wrapper für den Auth-Status
    ├── lib/                          # =========== SERVICES & LOGIK ===========
    │   ├── firebase/                 # Firebase-Services (Abstraktion der DB-Logik)
    │   │   ├── client-init.ts        # Initialisierung für den Client
    │   │   ├── admin-init.ts         # Initialisierung für das Backend (Admin SDK)
    │   │   ├── crm-service.ts
    │   │   ├── pr-service.ts
    │   │   └── ...                   # Weitere Services
    │   ├── mail/                     # E-Mail Service (Abstraktion von SendGrid)
    │   │   └── sendgrid.ts
    │   ├── validators/               # Validierungs-Schemas (z.B. mit Zod)
    │   │   ├── auth.schema.ts
    │   │   └── campaign.schema.ts
    │   └── helpers.ts                # Allgemeine Hilfsfunktionen
    ├── styles/                       # Globale Styles
    │   └── globals.css
    ├── types/                        # =========== TYPESCRIPT-DEFINITIONEN ===========
    │   ├── db.ts                     # Typen für Firestore-Dokumente
    │   ├── api.ts                    # Typen für API-Request/Response
    │   └── index.ts                  # Allgemeine Typen
    └── hooks/                        # =========== REACT HOOKS ===========
        ├── use-auth.ts               # Hook für den Auth-Status
        └── use-firestore-query.ts    # Eigener Hook für Firestore-Abfragen
├── .env.local                        # Lokale Umgebungsvariablen (NIEMALS einchecken!)
├── .eslintrc.json                    # ESLint-Konfiguration
├── .gitignore                        # Git Ignore-Datei
├── next.config.mjs                   # Next.js-Konfiguration
├── package.json
├── postcss.config.js                 # PostCSS-Konfiguration (für Tailwind)
├── README.md                         # Deine Haupt-Dokumentation
└── tailwind.config.ts                # Tailwind CSS-Konfiguration
```

⚙️ Setup & Installation
Repository klonen:
```bash
git clone [https://github.com/skamp/skamp.git](https://github.com/skamp/skamp.git)
cd skamp
```

Abhängigkeiten installieren:
```bash 
npm install
```
.env.local erstellen:
Erstelle eine .env.local-Datei im Hauptverzeichnis und füge deine Firebase- und SendGrid-Konfigurationen hinzu.

Firebase konfigurieren:

Richte ein neues Firebase-Projekt ein.

Aktiviere Firestore, Firebase Authentication und Firebase Storage.

Passe die Sicherheitsregeln für Firestore und Storage an, um die Daten deiner Nutzer zu schützen.

Entwicklungsserver starten:

```bash
npm run dev
```

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

<!-- Deploy Trigger: 2025-08-23 -->