# 🐛 CeleroPress Bugfix-Liste
**Erstellt:** 2025-09-26
**Status:** 🔴 Critical Bugs identifiziert
**Neue Organisation Test:** Vollständiges Fehlerprotokoll

---

## 🔥 **CRITICAL (Sofort beheben)**
*Blockieren grundlegende Funktionalität*

### 1. **Projekt-Workflow komplett defekt**
- [x] **Nach Pressemeldung Save: Falsche Weiterleitung**
  - ✅ **BEHOBEN:** Campaign Save/Cancel redirects jetzt zu Projekten
  - ✅ **BEHOBEN:** Alte pr-tools Übersichts-/Detailseiten gelöscht
  - ✅ **BEHOBEN:** Media Library Links auf neue Route umgestellt
  - ✅ **BEHOBEN:** freigabe-nicht-mehr-verfuegbar Seite updated

### 2. **Versand-Funktionalität defekt**
- [x] **Versenden Button: Falsche Anzeige-Logik**
  - ✅ **BEHOBEN:** Campaign-Status wird jetzt bei Kundenfreigabe auf 'approved' gesetzt
  - ✅ **Root Cause:** `submitDecisionPublic` aktualisierte nur Approval-, nicht Campaign-Status
  - ✅ **Fix:** Campaign-Status Update nach Approval hinzugefügt
- [x] **Versende Modal: Absender nicht gefunden**
  - ✅ **BEHOBEN:** SenderSelector findet jetzt Kontakte der Firma
  - ✅ **Root Cause 1:** Falsche Collection ('contacts' statt 'contacts_enhanced')
  - ✅ **Root Cause 2:** Firestore Index für orderBy nicht bereit
  - ✅ **Root Cause 3:** Undefined phone Werte → Firestore setDoc() Fehler
  - ✅ **Fixes:** Collection geändert, orderBy entfernt, undefined Fallbacks hinzugefügt

### 3. **CRM-Integration defekt**
- [x] **Kontaktzuordnung funktioniert nicht**
  - ✅ **BEHOBEN:** findByEmail Collection auf contacts_enhanced korrigiert
  - ✅ **BEHOBEN:** Clipping-Archiv projectId-Problem behoben
  - ✅ **Root Cause 1:** findByEmail suchte in 'contacts' statt 'contacts_enhanced'
  - ✅ **Root Cause 2:** MarkPublishedModal setzte keine projectId beim Clipping
  - ✅ **Fixes:** Collection-Konsistenz und projectId-Zuordnung implementiert

---

## ⚠️ **HIGH PRIORITY (Diese Woche)**
*Beeinträchtigen User Experience erheblich*

### 4. **UI/UX Defekte**
- [x] **Personen Modal: Tag-Fenster defekt**
  - ✅ **BEHOBEN:** Tag-Dropdown z-index Problem behoben
  - ✅ **Root Cause:** TagInput-Komponente hatte Overflow-Probleme
- [x] **Personen Modal: Telefonnummer-Feld defekt**
  - ✅ **BEHOBEN:** PhoneInput Grid-Layout repariert und reusable Lösung erstellt
  - ✅ **BEHOBEN:** Verbesserte Validierung - nur bei Blur, weniger aggressiv
  - ✅ **Root Cause:** Grid-Layout Konflikte zwischen col-span Definitionen
  - ✅ **Fix:** Einheitliches Grid-System und automatische Format-Normalisierung
- [x] **Publikationen Modal: ISSN-Feld defekt**
  - ✅ **BEHOBEN:** Grid-Layout Problem behoben - Input-Feld funktioniert wieder
  - ✅ **Root Cause:** Flex-Layout Konflikte machten Input-Feld nur 1 Zeichen breit
  - ✅ **Fix:** Grid-System implementiert (col-span-3 + col-span-8 + col-span-1)

### 5. **Navigation & Settings**
- [x] **Settings > Templates umbenennen**
  - ✅ **BEHOBEN:** "Templates" → "PDF Templates" umbenannt
  - ✅ **BEHOBEN:** Tiefer in Menü-Hierarchie verschoben (Position 8 nach Import/Export)
  - ✅ **Fix:** SettingsNav.tsx Navigation angepasst
- [x] **Teammitglied einladen: Standard-Dialoge**
  - ✅ **BEHOBEN:** Browser alert() und confirm() durch UI-Komponenten ersetzt
  - ✅ **Root Cause:** Alte Browser-Dialoge störten UX
  - ✅ **Fix:** Toast-Funktion auf console.log umgestellt, Confirmation Dialog implementiert

### 6. **Boilerplates/Textbausteine Probleme**
- [x] **KI-Toolbar Konflikte im Editor**
  - ✅ **BEHOBEN:** GmailStyleEditor durch einfachen Tiptap-Editor ersetzt
  - ✅ **Root Cause:** FloatingAIToolbar interferierte mit Boilerplate-Eingabe
  - ✅ **Fix:** Einfacher Editor nur mit Basics: Bold, Italic, Underline, Listen
  - ✅ **Resultat:** Keine KI-Features mehr, perfekt für Textbausteine
- [x] **Anderes Tag-System**
  - ✅ **BEHOBEN:** Tag-System komplett aus Boilerplates entfernt
  - ✅ **Root Cause:** Inkonsistenz zum restlichen System vermieden
  - ✅ **Fix:** Tag-Feld und TAG-Spalte vollständig entfernt
  - ✅ **Resultat:** Einfachere Boilerplate-Verwaltung ohne Tag-Komplexität
- [x] **PDF-Ausgabe Fehler**
  - ✅ **BEHOBEN:** Absender wird korrekt aus Projektkunde übernommen
  - ✅ **Root Cause 1:** onProjectSelect übertrug nur Projekt, nicht Kunde
  - ✅ **Root Cause 2:** PDF-Template verwendete "Unbekannter Kunde" als Fallback
  - ✅ **Root Cause 3:** Bestehende Kampagnen hatten "Unbekannter Kunde" gespeichert
  - ✅ **Fix 1:** Automatische Kundenübernahme aus project.customer.id/name
  - ✅ **Fix 2:** CSS-Regeln für Boilerplate-Content bereinigt
  - ✅ **Fix 3:** Campaign-Load überschreibt veralteten clientName mit Projekt-Kunde
  - ✅ **Resultat:** PDF zeigt korrekten Kundennamen in Kopf- und Fußzeile

### 7. **Projekt-Management**
- [x] **Task-Completion Anzeige defekt**
  - ✅ **BEHOBEN:** Fortschritts-Indikator zeigt jetzt korrekten Progress an
  - ✅ **Root Cause 1:** Progress-Calculator verwendete veraltete 7-Stage Pipeline-Struktur
  - ✅ **Root Cause 2:** updateProjectProgress() wurde nicht automatisch aufgerufen
  - ✅ **Root Cause 3:** Inkonsistente Property-Namen (linkedProjectId vs projectId)
  - ✅ **Problem 1:** calculateTaskProgress() suchte nach 'internal_approval' + 'customer_approval'
  - ✅ **Problem 2:** getByProjectId() und getByProjectStage() verwendeten verschiedene Property-Namen
  - ✅ **Fix 1:** Aktualisiert auf neues 6-Stage-System mit kombinierter 'approval' Stage
  - ✅ **Fix 2:** Automatische Progress-Berechnung in getAll() implementiert
  - ✅ **Fix 3:** Backward-Compatible Task-Suche mit beiden Property-Namen
  - ✅ **Lösung:** Stage-Weights angepasst (approval = 30% statt 15%+15%)
  - ✅ **Debug:** Extensive Logging für Progress-Berechnung und Task-Suche hinzugefügt
  - ✅ **FINAL:** System vereinfacht mit festen Progress-Werten (0%-20%-40%-60%-80%-100%)
  - ✅ **CLEANUP:** Debug-Logs entfernt, überflüssige UI-Elemente reduziert
  - ✅ **Resultat:** Einfaches, vorhersagbares Progress-System ohne Komplexität
- [x] **Projekt erstellen: Erfolgsbox falscher Link**
  - ✅ **BEHOBEN:** Erfolgsbox auf einen fokussierten "Zum Projekt" Button reduziert
  - ✅ **Root Cause:** Zu viele verwirrende Button-Optionen ("Zur Kampagne", "Dashboard schließen")
  - ✅ **Fix:** Überflüssige Buttons entfernt, zentraler Call-to-Action implementiert
  - ✅ **Resultat:** Saubere, fokussierte User Experience nach Projekt-Erstellung
- [x] **Kanban: Phase 3 nicht erreichbar**
  - ✅ **BEHOBEN:** Dropdown-Menü verwendet jetzt Business Logic statt Sequential Navigation
  - ✅ **BEHOBEN:** Phase-Name verkürzt für bessere UI-Darstellung
  - ✅ **Root Cause:** ProjectQuickActionsMenu verwendete previousStage/nextStage statt validateStageTransition
  - ✅ **Fix:** getValidTargetStages() Integration für konsistente Drag & Drop + Dropdown Regeln

---

## 📋 **MEDIUM PRIORITY (Nächste Woche)**
*Sollten behoben werden, aber nicht kritisch*

### 8. **Performance & UX**
- [ ] **KeyVisual Auswahl braucht Loader**
  - Kein Loading-State bei Bildauswahl

### 9. **Monitoring & Clipping**
- [x] **Neue Kampagnen erscheinen nicht im Monitoring**
  - ✅ **BEHOBEN:** Multi-Tenancy Parameter korrigiert in monitoring/page.tsx
  - ✅ **Root Cause:** prService.getAll() verwendete organizationId als userId
  - ✅ **Fix:** useOrganizationId: true Parameter hinzugefügt
- [x] **Clipping-Archiv (0) - Zuordnung defekt**
  - ✅ **BEHOBEN:** MarkPublishedModal setzt jetzt projectId beim Clipping
  - ✅ **Root Cause:** Clippings wurden ohne projectId erstellt
  - ✅ **Fix:** Campaign wird geladen um projectId zu ermitteln und zu setzen

### 10. **Auth & Onboarding**
- [ ] **Erster Login: Keine Google-Anmeldung möglich**
  - Google OAuth nicht verfügbar bei Registrierung
- [ ] **Login vor Email-Bestätigung möglich**
  - Validation-Flow inkorrekt

---

## 🔧 **LOW PRIORITY (Langfristig)**
*Nice-to-have Verbesserungen*

### 11. **Notifications & Team**
- [ ] **Benachrichtigungen nur für Ersteller**
  - Team-Mitglieder bekommen keine Notifications
  - Sollte team-weit funktionieren

### 12. **Broken Links & Debug-Code**
- [ ] **Edit/News Seite: Debug-Text entfernen**
  - "🧪 TEST: Projekt-Medienverzeichnis" in Production
- [ ] **3-Punkte Menü: "Dokumente" Link 404**
  - `https://www.celeropress.com/dashboard/strategy-documents?projectId=...`
  - Route existiert nicht

### 13. **Inbox komplett überarbeiten**
  - Komplettes Redesign erforderlich
  - Separate Analyse notwendig

---

## 📊 **Statistik**
- **Critical Bugs:** 0 🔴
- **High Priority:** 7 ⚠️
- **Medium Priority:** 4 📋
- **Low Priority:** 4 🔧
- **GESAMT:** 15 Issues

---

## 🎯 **Empfohlene Reihenfolge**

### **Sprint 1 (Diese Woche)**
1. CRM-Integration Debug (Domain-Problem lösen)
2. Projekt-Workflow Fix (Save-Redirect)
3. Versand-Modal Absender-Erkennung

### **Sprint 2 (Nächste Woche)**
1. UI Modal-Defekte (Personen, Publikationen)
2. Boilerplates Editor-Konflikte
3. Navigation & Settings Updates

### **Sprint 3 (Folgewoche)**
1. Monitoring/Clipping Integration
2. Performance Improvements
3. Auth-Flow Verbesserungen

---

## 🔗 **Related Issues**
- Domain-Anzeige Problem (aktuell in Debug)
- CRM-Publikations Integration (bereits implementiert)
- Gemini AI Model Updates (bereits gefixt)

---

**Nächster Schritt:** 🔴 Critical Bugs zuerst angehen - beginnen mit CRM-Integration?