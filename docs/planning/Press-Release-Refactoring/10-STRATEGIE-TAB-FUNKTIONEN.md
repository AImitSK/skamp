# Strategie-Tab: Funktionsübersicht

> Dokumentation aller Funktionen im Strategie-Tab für die Hilfe-Box

---

## Übersicht

Der Strategie-Tab führt den Benutzer durch die **CeleroPress Formel** - einen 3-Schritte-Workflow zur Erstellung professioneller Pressemeldungen:

```
DNA Synthese → Kernbotschaft → PM-Vorlage → PM Editor
```

---

## 1. Strategie-Übersicht (Metriken)

Die Übersichts-Komponente zeigt zwei Ring-Diagramme und eine Status-Liste.

### 1.1 Pipeline-Ring

| Metrik | Beschreibung |
|--------|--------------|
| **Anzeige** | Fortschritt 0-100% (0/3 bis 3/3) |
| **Segmente** | DNA Synthese (lila), Kernbotschaft (blau), PM-Vorlage (cyan) |
| **Farben** | Fertig = Segment-Farbe, Offen = Grau (zinc-200) |

### 1.2 Token-Verteilung Ring

| Metrik | Beschreibung |
|--------|--------------|
| **Anzeige** | Gesamt-Tokens (Summe aller Komponenten) |
| **Berechnung** | `~Zeichen / 4` für jede Komponente |
| **Segmente** | Proportional zur Token-Anzahl je Komponente |

### 1.3 Status-Liste

| Komponente | Status-Werte | Zusatz-Info |
|------------|--------------|-------------|
| **DNA Synthese** | X/6 Dokumente | ✓ wenn Synthese existiert |
| **Kernbotschaft** | Ausstehend / Entwurf / Fertig | ✓ wenn status=completed |
| **PM-Vorlage** | Ausstehend / Fertig | ✓ wenn vorhanden |
| **Gesamt-Tokens** | ~X.XXX Tokens | Summe aller Komponenten |

---

## 2. DNA Synthese Section

Fasst alle 6 Marken-DNA Dokumente in eine kompakte Synthese zusammen.

### 2.1 Voraussetzungen

- **Benötigt**: Alle 6 Marken-DNA Dokumente müssen fertig sein
- **Prüfung**: `markenDNAStatus.isComplete === true`

### 2.2 Zustände

| Zustand | UI-Anzeige | Aktionen |
|---------|------------|----------|
| **Nicht möglich** | "Marken-DNA vervollständigen" Button | → Navigiert zu `/dashboard/library/marken-dna/{companyId}` |
| **Bereit** | "Generieren" Button (lila) | → Startet KI-Synthese |
| **Vorhanden** | Kompakte Karte mit Toggle | → Aufklappen, Menü |

### 2.3 Funktionen (wenn vorhanden)

| Funktion | Beschreibung |
|----------|--------------|
| **Toggle** | Auf-/Zuklappen des Synthese-Texts |
| **Neu generieren** | Synthese erneut mit KI erstellen |
| **Bearbeiten** | Manuell bearbeiten (öffnet Editor-Modal) |
| **Löschen** | Synthese löschen (mit Bestätigung) |

### 2.4 Anzeige-Elemente

| Element | Beschreibung |
|---------|--------------|
| **Icon** | DNA-Helix (lila) |
| **Badge** | "Fertig" (lila) |
| **Datum** | "Erstellt: DD.MM.YYYY HH:MM" |
| **Token-Bubble** | "~X Tokens" oder "🔄 Generiere..." während Laden |

---

## 3. Kernbotschaft Section

Erarbeitet die projektspezifische Kernbotschaft im Dialog mit der KI.

### 3.1 Voraussetzungen

- **Benötigt**: DNA Synthese muss existieren
- **Prüfung**: `hasDNASynthese === true`

### 3.2 Zustände

| Zustand | UI-Anzeige | Aktionen |
|---------|------------|----------|
| **DNA fehlt** | "DNA Synthese erforderlich" (deaktiviert) | - |
| **Bereit** | "Generieren" Button (blau) | → Öffnet KI-Chat |
| **Vorhanden** | Kompakte Karte mit Toggle | → Aufklappen, Menü |

### 3.3 Funktionen (wenn vorhanden)

| Funktion | Beschreibung |
|----------|--------------|
| **Toggle** | Auf-/Zuklappen des Kernbotschaft-Texts |
| **KI-Chat** | Öffnet Fullscreen Chat-Modal |
| **Bearbeiten** | Manuell bearbeiten (öffnet Editor-Modal) |
| **Löschen** | Kernbotschaft löschen (mit Bestätigung) |

### 3.4 Anzeige-Elemente

| Element | Beschreibung |
|---------|--------------|
| **Icon** | Chat-Bubbles (blau) |
| **Badge** | "Entwurf" oder "Fertig" (blau) |
| **Datum** | "Erstellt: DD.MM.YYYY HH:MM" |
| **Token-Bubble** | "~X Tokens" |

### 3.5 Expandierter Inhalt

- **Anlass** (optional): Projektanlass wenn definiert
- **Ziel** (optional): Projektziel wenn definiert
- **Kernbotschaft-Text**: Mit Markdown-Formatierung gerendert

---

## 4. Kernbotschaft KI-Assistent (Chat Modal)

Fullscreen Chat-Interface zur dialogischen Erarbeitung der Kernbotschaft.

### 4.1 Features

| Feature | Beschreibung |
|---------|--------------|
| **Fullscreen** | Überlagert die gesamte Seite |
| **DNA-Kontext** | Zeigt Banner "DNA Synthese wird als Kontext verwendet" |
| **Chat-Verlauf** | Wird mit der Kernbotschaft gespeichert |
| **Dokument-Sidebar** | Öffnet automatisch bei Fertigstellung |

### 4.2 Chat-Workflow (Project Wizard)

Der KI-Assistent führt durch folgende Phasen:

1. **Briefing sammeln** - Anlass, Ziel, Kontext erfragen
2. **Zielgruppen analysieren** - Primäre und sekundäre Zielgruppen
3. **Kernbotschaft formulieren** - Basierend auf DNA + Briefing
4. **Finalisierung** - Prüfen und bestätigen

### 4.3 Aktionen im Chat

| Aktion | Beschreibung |
|--------|--------------|
| **Nachricht senden** | Freitext-Eingabe an KI |
| **Dokument anzeigen** | Öffnet/schließt Sidebar |
| **Neu starten** | Chat zurücksetzen (mit Bestätigung) |
| **Speichern** | Kernbotschaft + Chat-Historie speichern |

### 4.4 Keyboard-Shortcuts

| Taste | Aktion |
|-------|--------|
| **ESC** | Modal schließen (mit Warnung bei ungespeicherten Änderungen) |

### 4.5 Bestätigungs-Dialoge

| Dialog | Trigger |
|--------|---------|
| **"Änderungen verwerfen?"** | ESC oder X-Button wenn ungespeichert |
| **"Chat neu starten?"** | "Neu starten" Button |

---

## 5. PM-Vorlage Section

Generiert eine vollständige Pressemeldungs-Vorlage basierend auf allen vorherigen Schritten.

### 5.1 Voraussetzungen

- **Benötigt**: DNA Synthese UND Fakten-Matrix
- **Prüfung**: `hasDNASynthese && hasFaktenMatrix`

### 5.2 Zustände

| Zustand | UI-Anzeige | Aktionen |
|---------|------------|----------|
| **Voraussetzungen fehlen** | Amber-Hinweis mit Liste | - |
| **Bereit** | Zielgruppen-Dropdown + "Generieren" Button | → Startet KI-Generierung |
| **Vorhanden** | Kompakte Karte mit Toggle | → Aufklappen, Menü |

### 5.3 Zielgruppen-Auswahl

| Wert | Beschreibung |
|------|--------------|
| **ZG1 - B2B** | Business-to-Business Zielgruppe |
| **ZG2 - Consumer** | Endverbraucher Zielgruppe |
| **ZG3 - Media** | Journalisten und Medienvertreter |

### 5.4 Funktionen (wenn vorhanden)

| Funktion | Beschreibung |
|----------|--------------|
| **Toggle** | Auf-/Zuklappen der PM-Vorlage Preview |
| **Neu generieren** | Vorlage erneut mit KI erstellen |
| **Übernehmen** | In Pressemeldung übertragen (→ PM Editor) |
| **Ältere Version** | Aus History wiederherstellen (wenn vorhanden) |
| **Löschen** | Vorlage + History löschen (mit Bestätigung) |

### 5.5 Anzeige-Elemente

| Element | Beschreibung |
|---------|--------------|
| **Icon** | Dokument-Duplikat (cyan) |
| **Badge** | Zielgruppe (z.B. "ZG1") |
| **Badge** | "Veraltet" (amber) wenn DNA/Matrix geändert |
| **Datum** | "Erstellt: DD.MM.YYYY HH:MM" |
| **Token-Bubble** | "~X Tokens" oder "🔄 Generiere..." während Laden |

### 5.6 PM-Vorlage Preview (expandiert)

Die Preview zeigt die generierte Vorlage mit allen Elementen:

- **Headline** - Haupt-Überschrift
- **Subheadline** - Unter-Überschrift
- **Lead** - Einleitungsabsatz
- **Body** - Haupttext (HTML formatiert)
- **Boilerplate** - Über das Unternehmen
- **Kontakt** - Ansprechpartner-Informationen

### 5.7 History-Funktion

| Feature | Beschreibung |
|---------|--------------|
| **Speicherung** | Letzte 5 Versionen automatisch gespeichert |
| **Anzeige** | Dialog mit Liste aller älteren Versionen |
| **Wiederherstellung** | Klick auf Version → Wird aktuelle Version |

---

## 6. In Pressemeldung übernehmen (→ PM Editor)

Die Funktion überträgt die PM-Vorlage in den Editor einer Pressemeldung.

### 6.1 Ablauf

1. User klickt "Übernehmen" (im Menü oder als Button)
2. Bestätigungs-Dialog erscheint
3. User wählt Optionen
4. System erstellt/aktualisiert Campaign
5. Navigation zum Campaign Editor

### 6.2 Bestätigungs-Dialog

| Element | Beschreibung |
|---------|--------------|
| **Warnung** | "Bestehende Inhalte werden überschrieben!" |
| **Checkbox** | "Headline als Titel übernehmen" (default: aktiv) |
| **Preview** | Zeigt die Headline wenn Checkbox aktiv |

### 6.3 Optionen

| Option | Auswirkung |
|--------|------------|
| **Mit Headline** | Campaign-Titel = PM-Vorlage Headline |
| **Ohne Headline** | Nur Body-Content wird übertragen |

### 6.4 Nach Übertragung

- **Toast**: "PM-Vorlage in Pressemeldung übertragen!"
- **Navigation**: `/dashboard/pr-tools/campaigns/campaigns/edit/{campaignId}`
- **Im Editor**: HTML-Content ist im Editor eingefügt

---

## 7. Video Tutorial Card

Optionale Info-Karte am Seitenanfang mit erklärendem Video.

### 7.1 Features

| Feature | Beschreibung |
|---------|--------------|
| **Video** | YouTube-Embed (ID: yTfquGkL4cg) |
| **Titel** | "Die CeleroPress Formel" |
| **Beschreibung** | Erklärt den Workflow |
| **Feature-Liste** | DNA Synthese, Kernbotschaft, PM-Vorlage, Workflow |

### 7.2 Verhalten

| Aktion | Beschreibung |
|--------|--------------|
| **Schließen (X)** | Karte wird ausgeblendet |
| **Persistenz** | Einstellung in localStorage gespeichert |
| **Key** | `strategieTab_videoCard_hidden = 'true'` |

---

## 8. Technische Details

### 8.1 Hooks verwendet

| Hook | Zweck |
|------|-------|
| `useMarkenDNAStatus` | Status der 6 DNA-Dokumente |
| `useDNASynthese` | DNA Synthese laden/speichern |
| `useKernbotschaft` | Kernbotschaft laden/speichern |
| `usePMVorlage` | PM-Vorlage laden/speichern |
| `useFaktenMatrix` | Fakten-Matrix prüfen |
| `useAgenticChat` | Chat mit KI (project_wizard) |

### 8.2 Daten-Abhängigkeiten

```
Marken-DNA (6 Dokumente)
        ↓
   DNA Synthese
        ↓
   Kernbotschaft ←── KI-Chat (project_wizard)
        ↓
   PM-Vorlage ←── Fakten-Matrix (aus Project Wizard)
        ↓
   Campaign Editor
```

### 8.3 Farb-Schema

| Komponente | Primär-Farbe | Hex |
|------------|--------------|-----|
| DNA Synthese | Lila | #9333ea |
| Kernbotschaft | Blau | #2563eb |
| PM-Vorlage | Cyan | #0891b2 |

---

## 9. Hilfe-Texte Vorschläge

### 9.1 Strategie-Übersicht

> Die Strategie-Übersicht zeigt deinen Fortschritt in der CeleroPress Formel. Die zwei Ringe visualisieren den Pipeline-Status (welche Schritte sind fertig) und die Token-Verteilung (wie viel Kontext jede Komponente liefert).

### 9.2 DNA Synthese

> Die DNA Synthese fasst alle 6 Marken-DNA Dokumente in einen kompakten Text zusammen. Sie dient als Grundlage für die Kernbotschaft und PM-Vorlage. Vervollständige zuerst alle Marken-DNA Dokumente in der Bibliothek.

### 9.3 Kernbotschaft

> Die Kernbotschaft ist das Herzstück deiner Pressemeldung. Im Dialog mit der KI erarbeitest du eine prägnante Botschaft, die auf der DNA Synthese basiert und zum Anlass deines Projekts passt.

### 9.4 PM-Vorlage

> Die PM-Vorlage generiert eine vollständige Pressemeldung basierend auf DNA Synthese, Kernbotschaft und Fakten-Matrix. Wähle die passende Zielgruppe (B2B, Consumer oder Media) für den optimalen Ton.

### 9.5 Übernehmen

> Mit "Übernehmen" überträgst du die PM-Vorlage direkt in den Pressemeldungs-Editor. Der bestehende Inhalt wird dabei ersetzt. Du kannst wählen, ob die Headline als Titel übernommen werden soll.
