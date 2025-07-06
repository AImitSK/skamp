# PR-Kampagnen Verbesserungen - Implementierungsplan

## Übersicht
Dieser Plan dokumentiert alle identifizierten Probleme in den PR-Kampagnen-Seiten (Neu erstellen & Bearbeiten) und definiert die Reihenfolge der Implementierung.

## Technische Grundlagen
- **UI Framework**: Catalyst UI Components
- **Referenz-Dateien für Style**: 
  - `src/app/dashboard/contacts/crm/page.tsx`
  - `src/app/dashboard/contacts/lists/page.tsx`
  - `src/app/dashboard/contacts/crm/ContactModal.tsx`
- **Wichtige Komponenten**:
  - Button & Badge (angepasst für Nicht-Umbrechen bei mehreren Worten)
  - InfoTooltip für Erläuterungen

## Identifizierte Probleme & Lösungsansätze

### 1. Verteiler-Box Suchfunktion
**Problem**: Bei vielen Listen wird die Auswahl unübersichtlich
**Lösung**: Suchfeld über der Liste implementieren
**Dateien**: 
- `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`

### 2. Pflichtfeld-Markierungen (*) ohne Erläuterung
**Problem**: Sternchen bei Pflichtfeldern ohne Erklärung
**Lösung**: InfoTooltip oder Hinweistext hinzufügen
**Felder**: Kunde, Verteiler, Pressemitteilung, Titel, Hauptinhalt

### 3. KI-Assistent Button Icon
**Problem**: SparklesIcon fehlt im Button
**Lösung**: Icon hinzufügen (bereits in anderen Komponenten verwendet)

### 4. Content-Reihenfolge anpassen
**Problem**: Hauptinhalt sollte vor Boilerplates kommen
**Lösung**: Komponenten-Reihenfolge im Layout ändern

### 5. InfoTooltip Integration
**Problem**: Erläuterungen fehlen bei verschiedenen Feldern
**Lösung**: InfoTooltip-Komponente bei allen relevanten Labels einsetzen

### 6. TiptapToolbar erweitern
**Problem**: Fehlende Funktionen für Überschriften, Links, Farben
**Lösung**: Toolbar um folgende Features erweitern:
- Überschriften-Hierarchie (H1-H3)
- Link-Editor
- Farbauswahl für Text

### 7. Strukturierte Pressemitteilung Integration
**Problem**: Lead, Hauptabsatz und Zitat sollten als verschiebbare Elemente im Boilerplate-Modul erscheinen
**Lösung**: 
- Neuer Elementtyp im Boilerplate-Modul
- Integration mit KI-generierten strukturierten Daten
- Drag & Drop für alle Elemente

### 8. KI-Assistent Boilerplate entfernen
**Problem**: KI generiert eigene Boilerplate, die entfernt werden soll
**Lösung**: Boilerplate-Generierung aus KI-Response entfernen

### 9. Strukturierte Daten Übergabe
**Problem**: KI-generierte Elemente müssen sauber ins Boilerplate-Modul übertragen werden
**Lösung**: Schnittstelle zwischen KI-Modal und Boilerplate-Modul implementieren

### 10. Lead-Absatz Generierung (Neue Kampagne)
**Problem**: Lead-Generierung funktioniert nicht bei neuen Kampagnen
**Lösung**: Funktionalität von Edit-Page übernehmen und anpassen

### 11. Modal-Schließung bei Interaktionen
**Problem**: Schloss-Symbol und Formatierungen schließen Modal ungewollt
**Lösung**: Event-Propagation stoppen (e.stopPropagation())

### 12. Vorschau Abstände
**Problem**: Text klebt zusammen in der Vorschau
**Lösung**: CSS-Abstände anpassen (48px über Strich, 12px unter Strich)

### 13. PDF-Export Feature
**Problem**: Fehlende PDF-Export-Funktion
**Lösung**: 
- PDF-Generation aus Vorschau
- Speicherort-Auswahl im Media Center
- Download-Link bereitstellen

## Implementierungsreihenfolge

### Phase 1: UI-Fixes (Quick Wins)
1. KI-Assistent Button Icon
2. Content-Reihenfolge
3. Modal-Schließung beheben
4. Vorschau Abstände

### Phase 2: Basis-Verbesserungen
5. Pflichtfeld-Markierungen mit Erläuterung
6. InfoTooltip Integration
7. Verteiler-Box Suchfunktion

### Phase 3: Editor-Erweiterungen
8. TiptapToolbar erweitern
9. Lead-Absatz Generierung fixen

### Phase 4: Strukturierte Inhalte
10. KI-Boilerplate entfernen
11. Strukturierte Pressemitteilung Integration
12. Strukturierte Daten Übergabe

### Phase 5: Neue Features
13. PDF-Export Funktion

## Nächste Schritte
1. Mit Phase 1, Problem 1 beginnen (KI-Assistent Button Icon)
2. Relevante Dateien identifizieren
3. Lösung implementieren
4. Testen
5. Zum nächsten Problem übergehen

## Testing-Checkliste
- [ ] Funktionalität in Neu-Seite testen
- [ ] Funktionalität in Edit-Seite testen
- [ ] Responsive Design prüfen
- [ ] Event-Handler Verhalten
- [ ] Datenfluss zwischen Komponenten
- [ ] Error Handling