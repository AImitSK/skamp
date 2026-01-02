# CeleroPress - Software-Übersicht

## Was ist CeleroPress?

CeleroPress ist eine **PR-Management-Software** für Agenturen und Unternehmen. Sie digitalisiert den gesamten PR-Workflow von der Kontaktverwaltung über die Pressemeldungserstellung bis zum Versand und Monitoring.

## Zielgruppe

- **PR-Agenturen**: Verwalten mehrere Kunden, brauchen effiziente Workflows
- **Unternehmens-PR**: Interne PR-Abteilungen mit eigenen Marken
- **Marketing-Teams**: Kombinieren PR mit anderen Marketing-Aktivitäten

## Architektur

### Multi-Tenant-System
- Jede Organisation hat isolierte Daten
- Benutzer gehören zu einer Organisation
- Rollen: Owner, Admin, Member

### Tech-Stack
- Frontend: Next.js 14+ mit App Router
- Backend: Firebase (Firestore, Storage, Auth)
- Styling: Tailwind CSS
- CMS: Sanity (für Blog & Hilfe-Content)

---

## Kernbereiche der Software

### 1. CRM (Kontaktverwaltung)
**Pfad:** `/dashboard/contacts/crm`

Verwaltet Medienkontakte für den PR-Versand:

- **Unternehmen (Companies)**: Verlage wie Springer, Burda, Gruner+Jahr
- **Personen (Contacts)**: Journalisten mit E-Mail, Telefon, Ressort
- **Verteilerlisten**: Gruppierungen von Kontakten für gezielten Versand

**Workflow:**
```
Verlag anlegen → Publikationen zuordnen → Journalisten anlegen → Verteiler erstellen
```

### 2. Bibliothek
**Pfad:** `/dashboard/library/*`

Zentrale Medienverwaltung:

- **Publikationen**: Zeitungen, Magazine, Online-Portale (mit Auflage, Reichweite)
- **Textbausteine (Boilerplates)**: Wiederverwendbare Texte (Über uns, Kontakt)
- **Medien**: Bilder, PDFs, Videos für Pressemeldungen
- **Marken-DNA**: Markenwerte, Tonalität, Schreibstil - trainiert die KI

### 3. Projekte (Zentraler Arbeitsbereich)
**Pfad:** `/dashboard/projects/*`

Ein Projekt = Eine PR-Kampagne für einen Kunden:

- **Tasks**: Aufgabenverwaltung mit Kanban-Board
- **Strategie**: Ziele, Kernbotschaften, Zielgruppen
- **Daten**: Projektspezifische Informationen
- **Verteiler**: Ausgewählte Empfänger für dieses Projekt
- **Pressemeldung**: Der eigentliche Content
  - KI-Assistenten für Texterstellung
  - Freigabe-Workflow mit Kunden
  - E-Mail-Versand an Verteiler
- **Monitoring**: Erfolg messen, Clippings sammeln

### 4. Analytics
**Pfad:** `/dashboard/analytics/*`

- **Monitoring**: Überblick über alle Projekte
- **Reporting**: Automatische Berichte generieren

### 5. Kommunikation
**Pfad:** `/dashboard/communication/*`

- **Inbox**: Zentrale Nachrichtenübersicht (Antworten von Journalisten)
- **Benachrichtigungen**: System-Notifications

### 6. Einstellungen
**Pfad:** `/dashboard/settings/*`

- **Team**: Benutzer einladen, Rollen vergeben
- **Branding**: Logo, Farben
- **E-Mail**: Absender konfigurieren, Signatur
- **Domains**: Custom Domain einrichten
- **Templates**: PDF-Vorlagen anpassen
- **Import/Export**: Daten migrieren

### 7. Account
**Pfad:** `/dashboard/admin/*`

- **Profil**: Persönliche Daten
- **Billing**: Subscription, Rechnungen
- **API**: Entwickler-Zugang (Premium)

---

## Typischer PR-Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. VORBEREITUNG                                                     │
│    • Kunde im CRM anlegen (oder existierenden auswählen)            │
│    • Verteiler mit passenden Journalisten erstellen                 │
│    • Marken-DNA pflegen (für KI-Unterstützung)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. PROJEKT ERSTELLEN                                                │
│    • Neues Projekt anlegen, Kunde zuordnen                          │
│    • Strategie definieren (Ziele, Kernbotschaften)                  │
│    • Verteiler auswählen                                            │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. PRESSEMELDUNG ERSTELLEN                                          │
│    • Text schreiben (mit KI-Unterstützung)                          │
│    • Medien hinzufügen (Bilder, Dokumente)                          │
│    • Vorschau prüfen                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. FREIGABE                                                         │
│    • Freigabe-Link an Kunden senden                                 │
│    • Feedback einarbeiten                                           │
│    • Finale Freigabe erhalten                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. VERSAND                                                          │
│    • E-Mail an Verteiler senden                                     │
│    • Optional: Zeitgesteuerten Versand planen                       │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. MONITORING                                                       │
│    • Öffnungen und Klicks tracken                                   │
│    • Veröffentlichungen (Clippings) erfassen                        │
│    • Erfolg messen und reporten                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Wichtige Konzepte

### Kunden vs. Kontakte
- **Kunden (Companies im CRM)**: Können Verlage ODER eigene Kunden sein
- **Kontakte (Persons)**: Journalisten die angeschrieben werden

### Publikationen
- Gehören zu einem Verlag
- Journalisten schreiben für Publikationen
- Wichtig für Verteiler-Erstellung

### Marken-DNA
- Definiert Markenwerte, Tonalität, Schreibstil
- Wird von KI-Assistenten genutzt
- Pro Kunde/Marke individuell

### Freigabe-Workflow
- Externe Freigabe-Links für Kunden
- Kunden können kommentieren und freigeben
- Keine CeleroPress-Anmeldung nötig

---

## UI-Patterns

### Navigation
- Sidebar links mit Hauptbereichen
- Breadcrumbs für Tiefennavigation
- Tabs innerhalb von Bereichen (z.B. CRM: Unternehmen | Personen)

### Formulare
- Validierung mit Fehlermeldungen
- Autosave bei längeren Eingaben
- Modals für Quick-Actions

### Listen
- Suche und Filter
- Sortierung
- Pagination bei großen Datenmengen

### Dark Mode
- Vollständige Dark Mode Unterstützung
- System-Präferenz wird respektiert
