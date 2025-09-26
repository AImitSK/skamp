# 🐛 CeleroPress Bugfix-Liste
**Erstellt:** 2025-09-26
**Status:** 🔴 Critical Bugs identifiziert
**Neue Organisation Test:** Vollständiges Fehlerprotokoll

---

## 🔥 **CRITICAL (Sofort beheben)**
*Blockieren grundlegende Funktionalität*

### 1. **Projekt-Workflow komplett defekt**
- [ ] **Nach Pressemeldung Save: Falsche Weiterleitung**
  - ❌ Aktuell: `https://www.celeropress.com/dashboard/pr-tools/campaigns/campaigns/sYmRFYDy0Sp8RA1RjFFp`
  - ✅ Soll: Zurück zum Kanban Board
  - **Impact:** Nutzer landen in toter Route

### 2. **Versand-Funktionalität defekt**
- [ ] **Versenden Button: Falsche Anzeige-Logik**
  - Wird nach falschen Regeln ein-/ausgeblendet
- [ ] **Versende Modal: Absender nicht gefunden**
  - PDF-Ausgabe: "© 2025 Unbekannter Kunde"
  - Absender-Erkennung funktioniert nicht

### 3. **CRM-Integration defekt**
- [ ] **Kontaktzuordnung funktioniert nicht**
  - "Als veröffentlicht markieren" findet keine CRM-Einträge
  - Fehler: "Kein CRM-Eintrag für s.kuehne@sk-online-marketing.de gefunden"
  - **Related:** Unser Domain-Debug Problem

---

## ⚠️ **HIGH PRIORITY (Diese Woche)**
*Beeinträchtigen User Experience erheblich*

### 4. **UI/UX Defekte**
- [ ] **Personen Modal: Tag-Fenster defekt**
  - Tag-Auswahl funktioniert nicht
- [ ] **Personen Modal: Telefonnummer-Feld defekt**
  - Eingabe nicht möglich
- [ ] **Publikationen Modal: ISSN-Feld defekt**
  - Validation/Eingabe fehlerhaft

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

---

## 📋 **MEDIUM PRIORITY (Nächste Woche)**
*Sollten behoben werden, aber nicht kritisch*

### 8. **Performance & UX**
- [ ] **KeyVisual Auswahl braucht Loader**
  - Kein Loading-State bei Bildauswahl

### 9. **Monitoring & Clipping**
- [ ] **Neue Kampagnen erscheinen nicht im Monitoring**
  - Nach Versand sind Kampagnen nicht sichtbar
- [ ] **Clipping-Archiv (0) - Zuordnung defekt**
  - Veröffentlichungen werden nicht korrekt zugeordnet
  - Problem sowohl im Archiv als auch in Projekten

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
- **Critical Bugs:** 3 🔴
- **High Priority:** 9 ⚠️
- **Medium Priority:** 6 📋
- **Low Priority:** 4 🔧
- **GESAMT:** 22 Issues

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