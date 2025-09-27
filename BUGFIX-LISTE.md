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
- [ ] **Settings > Templates umbenennen**
  - "Templates" → "PDF Templates"
  - Tiefer in Menü-Hierarchie verschieben
- [ ] **Teammitglied einladen: Standard-Dialoge**
  - Verwendet noch alte Browser-Dialoge statt UI-Komponenten

### 6. **Boilerplates/Textbausteine Probleme**
- [ ] **KI-Toolbar Konflikte im Editor**
  - Editor und KI-Funktionen interferieren
- [ ] **Anderes Tag-System**
  - Inkonsistenz zu restlichem System
- [ ] **PDF-Ausgabe Fehler**
  - Absender wird nicht korrekt übernommen

### 7. **Projekt-Management**
- [ ] **Task-Completion Anzeige defekt**
  - Fortschritts-Indikator in Projekt-Übersicht funktioniert nicht
- [ ] **Projekt erstellen: Erfolgsbox falscher Link**
  - Redirect nach Erstellung fehlerhaft
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