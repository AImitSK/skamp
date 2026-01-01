# Taxonomie & Themenliste

## Übersicht

Hilfe-Kategorien basierend auf der tatsächlichen App-Struktur.

## App-Struktur (Navigation)

```
📱 CeleroPress
│
├── 👥 CRM
│   ├── Unternehmen
│   ├── Personen
│   └── Verteilerlisten
│
├── 📚 Bibliothek
│   ├── Publikationen
│   ├── Textbausteine
│   ├── Medien
│   ├── Marken-DNA
│   └── Datenbank (Premium)
│
├── 📁 Projekte ← Zentraler Arbeitsbereich
│   ├── Tasks
│   ├── Strategie
│   ├── Daten
│   ├── Verteiler
│   ├── Pressemeldung
│   │   ├── KI-Assistenten
│   │   ├── Freigabe
│   │   └── Versand
│   └── Monitoring
│
├── 📊 Analytics
│   ├── Monitoring
│   └── Reporting
│
├── 💬 Kommunikation
│   ├── Inbox
│   └── Benachrichtigungen
│
├── ⚙️ Einstellungen
│   ├── Subscription/Billing
│   ├── Benachrichtigungen
│   ├── Branding
│   ├── Templates (Premium)
│   ├── Domains
│   ├── E-Mail
│   ├── Import/Export
│   └── Team
│
└── 👤 Account
    ├── Profil
    ├── Billing
    ├── API Management (Premium)
    └── Developer Portal (Premium)
```

---

## Hilfe-Kategorien

### 1. 🚀 Erste Schritte (Onboarding)

> **Diese Schritte müssen erledigt werden, bevor die Software produktiv genutzt werden kann.**

```
┌─────────────────────────────────────────────────────────────┐
│  SCHRITT 1: GRUNDLAGEN                                      │
│  □ Profil ausfüllen                                         │
│  □ Domain registrieren                                      │
│  □ E-Mail-Absender einrichten                               │
│  □ Team einladen (optional)                                 │
├─────────────────────────────────────────────────────────────┤
│  SCHRITT 2: ERSTER KUNDE                                    │
│  □ Kunde anlegen (CRM → Unternehmen)                        │
│  □ Ansprechpartner beim Kunden anlegen                      │
│                                                             │
│  💡 Kein Agentur-Modell? → Lege dich selbst als Kunde an   │
└─────────────────────────────────────────────────────────────┘
```

| Thema | Beschreibung | Schritt | Priorität |
|-------|--------------|---------|-----------|
| Willkommen bei CeleroPress | Überblick und Navigation | Intro | 🔴 Hoch |
| Profil einrichten | Name, Bild, Kontaktdaten ausfüllen | 1.1 | 🔴 Hoch |
| Domain registrieren | Eigene Domain für E-Mail-Versand | 1.2 | 🔴 Hoch |
| E-Mail-Absender einrichten | Absender-Adresse konfigurieren | 1.3 | 🔴 Hoch |
| Team einladen | Kollegen hinzufügen & Rollen vergeben | 1.4 | 🟡 Optional |
| Ersten Kunden anlegen | Unternehmen im CRM erstellen | 2.1 | 🔴 Hoch |
| Ansprechpartner anlegen | Kontaktperson beim Kunden | 2.2 | 🔴 Hoch |

> **Danach:** Verteiler aufbauen, Marken-DNA pflegen, dann erst Projekte starten.

---

### 2. 👥 CRM (Verlage, Journalisten, Verteiler)

> **Der CRM-Bereich verwaltet deine Medienkontakte für den PR-Versand.**

```
WORKFLOW: So baust du deine Kontaktdatenbank auf

┌─────────────────────────────────────────────────────────────┐
│  1. VERLAG anlegen                                          │
│     z.B. "Axel Springer", "Burda", "Gruner + Jahr"         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. PUBLIKATIONEN anlegen (→ Bibliothek)                    │
│     z.B. "BILD", "WELT", "Focus", "Stern"                  │
│     → Publikation wird dem Verlag zugeordnet               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. JOURNALISTEN anlegen                                    │
│     → Journalist wird Verlag zugeordnet                    │
│     → Journalist wird Publikation(en) zugeordnet           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. VERTEILER erstellen                                     │
│     → Sinnvolle Auswahl an Journalisten für Versand        │
└─────────────────────────────────────────────────────────────┘
```

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| **Verlage** | | |
| Verlag anlegen | Neuen Verlag erstellen (z.B. Springer, Burda) | 🔴 Hoch |
| Verlag bearbeiten | Adresse, Kontaktdaten, Notizen | 🟡 Mittel |
| Verlage importieren | Massenimport aus CSV/Excel | 🟡 Mittel |
| **Journalisten** | | |
| Journalist anlegen | Neuen Medienkontakt erstellen | 🔴 Hoch |
| Journalist mit Verlag verknüpfen | Zuordnung zum Arbeitgeber | 🔴 Hoch |
| Journalist mit Publikation verknüpfen | Für welche Magazine/Zeitungen schreibt er? | 🔴 Hoch |
| Journalisten importieren | Massenimport | 🟡 Mittel |
| Journalisten exportieren | Export für andere Systeme | 🟢 Niedrig |
| **Verteilerlisten** | | |
| Verteiler erstellen | Neue Empfängerliste anlegen | 🔴 Hoch |
| Journalisten zum Verteiler hinzufügen | Passende Kontakte auswählen | 🔴 Hoch |
| Dynamische Filter | Automatische Listen nach Kriterien | 🟡 Mittel |
| Verteiler im Projekt nutzen | Liste für Versand auswählen | 🟡 Mittel |

---

### 3. 📚 Bibliothek

> **Hier verwaltest du Publikationen, Medien, Textbausteine und deine Marken-DNA.**

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| **Publikationen** (Zeitungen, Magazine) | | |
| Publikation anlegen | Neue Zeitung/Magazin erstellen | 🔴 Hoch |
| Publikation dem Verlag zuordnen | Welcher Verlag gibt sie heraus? | 🔴 Hoch |
| Publikation bearbeiten | Auflage, Erscheinungsweise, Themen | 🟡 Mittel |
| **Textbausteine** | | |
| Textbaustein erstellen | Wiederverwendbare Texte (Boilerplate) | 🟡 Mittel |
| Textbausteine in Projekten nutzen | Bausteine einfügen | 🟡 Mittel |
| **Medien** | | |
| Medien hochladen | Bilder, Dokumente, Videos | 🔴 Hoch |
| Medien organisieren | Ordner, Tags, Suche | 🟡 Mittel |
| Medien teilen | Share-Links für Journalisten erstellen | 🟡 Mittel |
| **Marken-DNA** | | |
| Marken-DNA verstehen | Was ist die Marken-DNA? | 🔴 Hoch |
| Marken-DNA pflegen | Markenwerte, Tonalität, Schreibstil | 🔴 Hoch |
| Marken-DNA für KI nutzen | So lernt die KI deinen Stil | 🟡 Mittel |
| **Datenbank** | | |
| Datenbank nutzen | Eigene Datenstrukturen (Premium) | 🟢 Niedrig |

---

### 4. 📁 Projekte (Zentraler Arbeitsbereich)

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| **Projekt-Grundlagen** | | |
| Projekt erstellen | Neues Projekt anlegen | 🔴 Hoch |
| Projekt-Übersicht | Dashboard und Navigation | 🔴 Hoch |
| Projekt-Einstellungen | Kunde, Deadline, Team | 🟡 Mittel |
| **Tasks** | | |
| Tasks verstehen | Aufgabenverwaltung im Projekt | 🔴 Hoch |
| Task erstellen | Neue Aufgabe anlegen | 🔴 Hoch |
| Task-Status | Workflow und Fortschritt | 🟡 Mittel |
| Kanban-Board | Visuelle Aufgabenverwaltung | 🟡 Mittel |
| **Strategie** | | |
| Strategie definieren | Ziele und Kernbotschaften | 🟡 Mittel |
| **Daten** | | |
| Projekt-Daten | Informationen zum Projekt | 🟡 Mittel |
| Dokumente verwalten | Dateien im Projekt | 🟡 Mittel |
| **Verteiler** | | |
| Verteiler auswählen | Liste fürs Projekt zuordnen | 🔴 Hoch |
| Verteiler bearbeiten | Empfänger anpassen | 🟡 Mittel |
| **Pressemeldung** | | |
| Pressemeldung erstellen | Neue Meldung schreiben | 🔴 Hoch |
| Pressemeldung bearbeiten | Text und Medien | 🔴 Hoch |
| Key Visual hochladen | Hauptbild der Meldung | 🟡 Mittel |
| Vorlagen nutzen | Templates für Meldungen | 🟡 Mittel |
| **→ KI-Assistenten** | | |
| KI-Assistent nutzen | Texte mit KI erstellen/optimieren | 🔴 Hoch |
| Marken-DNA für KI | Wie die KI den Stil lernt | 🟡 Mittel |
| Übersetzungen mit KI | Automatische Übersetzungen | 🟡 Mittel |
| **→ Freigabe** | | |
| Freigabe-Workflow | So funktioniert die Freigabe | 🔴 Hoch |
| Kundenfreigabe einrichten | Freigabe-Link erstellen | 🔴 Hoch |
| Feedback bearbeiten | Änderungswünsche umsetzen | 🟡 Mittel |
| Freigabe-Status | Übersicht aller Freigaben | 🟡 Mittel |
| **→ Versand** | | |
| Versand vorbereiten | Meldung für Versand fertigmachen | 🔴 Hoch |
| E-Mail-Versand | Meldung per E-Mail versenden | 🔴 Hoch |
| Versand planen | Zeitgesteuerten Versand einrichten | 🟡 Mittel |
| Versand-Tracking | Öffnungen und Klicks verfolgen | 🟡 Mittel |
| **Monitoring** | | |
| Projekt-Monitoring | Erfolg der Meldung messen | 🟡 Mittel |
| Clippings sammeln | Veröffentlichungen erfassen | 🟡 Mittel |
| AVE berechnen | Anzeigenäquivalenzwert | 🟢 Niedrig |

---

### 5. 📊 Analytics

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| Monitoring-Dashboard | Überblick über alle Projekte | 🟡 Mittel |
| Reporting erstellen | Berichte generieren | 🟡 Mittel |
| Kennzahlen verstehen | KPIs und Metriken erklärt | 🟢 Niedrig |

---

### 6. 💬 Kommunikation

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| Inbox verstehen | Zentrale Nachrichtenübersicht | 🟡 Mittel |
| Nachrichten beantworten | Auf Rückmeldungen reagieren | 🟡 Mittel |
| Benachrichtigungen | Einstellungen und Typen | 🟢 Niedrig |

---

### 7. ⚙️ Einstellungen

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| **Team** | | |
| Team-Mitglieder einladen | Neue Benutzer hinzufügen | 🔴 Hoch |
| Rollen & Berechtigungen | Wer darf was? | 🟡 Mittel |
| **Branding** | | |
| Logo hochladen | Firmenlogo einrichten | 🟡 Mittel |
| Farben anpassen | Corporate Design | 🟢 Niedrig |
| **E-Mail** | | |
| E-Mail-Konfiguration | Absender einrichten | 🔴 Hoch |
| E-Mail-Signatur | Standard-Signatur | 🟡 Mittel |
| **Domains** | | |
| Eigene Domain | Custom Domain einrichten | 🟡 Mittel |
| DNS-Einstellungen | Technische Konfiguration | 🟢 Niedrig |
| **Templates** | | |
| PDF-Templates | Vorlagen anpassen (Premium) | 🟢 Niedrig |
| **Import/Export** | | |
| Daten importieren | Massenimport | 🟡 Mittel |
| Daten exportieren | Backup und Export | 🟢 Niedrig |

---

### 8. 👤 Account

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| Profil bearbeiten | Name, Bild, Kontaktdaten | 🟡 Mittel |
| Passwort ändern | Sicherheitseinstellungen | 🟡 Mittel |
| Subscription/Billing | Abo und Rechnungen | 🟡 Mittel |
| API-Keys | API-Zugang verwalten (Premium) | 🟢 Niedrig |

---

## Seiten-Mapping (Route → Hilfe-Artikel)

| Route | Haupt-Artikel | Quick-Tipps |
|-------|---------------|-------------|
| `/dashboard` | Willkommen bei CeleroPress | 3 |
| `/dashboard/contacts/crm` | CRM-Übersicht | 3 |
| `/dashboard/contacts/crm?tab=companies` | Unternehmen anlegen | 2 |
| `/dashboard/contacts/crm?tab=contacts` | Person anlegen | 2 |
| `/dashboard/contacts/lists` | Verteilerliste erstellen | 3 |
| `/dashboard/library/publications` | Publikation erstellen | 2 |
| `/dashboard/library/boilerplates` | Textbaustein erstellen | 2 |
| `/dashboard/library/media` | Medien hochladen | 3 |
| `/dashboard/library/marken-dna` | Marken-DNA verstehen | 2 |
| `/dashboard/projects` | Projekt erstellen | 3 |
| `/dashboard/projects/[id]` | Projekt-Übersicht | 3 |
| `/dashboard/projects/[id]/tasks` | Tasks verstehen | 3 |
| `/dashboard/projects/[id]/strategy` | Strategie definieren | 2 |
| `/dashboard/projects/[id]/press-release` | Pressemeldung erstellen | 5 |
| `/dashboard/projects/[id]/approval` | Freigabe-Workflow | 3 |
| `/dashboard/projects/[id]/distribution` | Versand vorbereiten | 3 |
| `/dashboard/projects/[id]/monitoring` | Projekt-Monitoring | 2 |
| `/dashboard/analytics/monitoring` | Monitoring-Dashboard | 2 |
| `/dashboard/analytics/reporting` | Reporting erstellen | 2 |
| `/dashboard/communication/inbox` | Inbox verstehen | 2 |
| `/dashboard/communication/notifications` | Benachrichtigungen | 2 |
| `/dashboard/settings/team` | Team-Mitglieder einladen | 3 |
| `/dashboard/settings/email` | E-Mail-Konfiguration | 3 |
| `/dashboard/settings/branding` | Logo hochladen | 2 |
| `/dashboard/settings/domain` | Eigene Domain | 2 |
| `/dashboard/admin/profile` | Profil bearbeiten | 2 |
| `/dashboard/admin/billing` | Subscription/Billing | 2 |

---

## Video-Planung

| Kategorie | Video | Dauer | Priorität |
|-----------|-------|-------|-----------|
| Erste Schritte | Willkommens-Tour | 3 Min | 🔴 Hoch |
| Projekte | Erstes Projekt anlegen | 5 Min | 🔴 Hoch |
| Projekte | Pressemeldung erstellen | 5 Min | 🔴 Hoch |
| Projekte | KI-Assistent nutzen | 4 Min | 🔴 Hoch |
| Projekte | Freigabe-Workflow | 3 Min | 🔴 Hoch |
| Projekte | E-Mail-Versand | 4 Min | 🔴 Hoch |
| CRM | Kontakte importieren | 4 Min | 🟡 Mittel |
| Bibliothek | Medien verwalten | 3 Min | 🟡 Mittel |
| Einstellungen | E-Mail einrichten | 3 Min | 🟡 Mittel |
| Einstellungen | Team verwalten | 3 Min | 🟡 Mittel |

---

## Nächste Schritte

- [ ] Struktur mit Team abstimmen
- [ ] Routen prüfen (stimmen die Pfade?)
- [ ] Prioritäten festlegen
- [ ] Erste Artikel schreiben (Prio 🔴)
- [ ] Videos planen
