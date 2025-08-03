# Dokumentations-Workflow

## 🎯 Wichtige Erinnerung für Entwicklung

**Die Dokumentation ist nur so gut wie ihre Aktualität!**

Dieses Dokument definiert klare Workflows, um die Feature-Dokumentationen immer auf dem neuesten Stand zu halten.

## 📋 Workflow für neue Features

### 1. Feature-Entwicklung
```
Entwicklung → Dokumentation → Review → Release
```

**Während der Entwicklung:**
- [ ] Feature-Dokumentation parallel erstellen
- [ ] Template aus `/docs/development/FEATURE_DOCUMENTATION_TEMPLATE.md` verwenden
- [ ] Bei Unklarheiten: `[UNKLAR: ...]` markieren

### 2. Dokumentations-Erstellung
**Checkliste für KI/Entwickler:**
- [ ] Neue Datei: `/docs/features/docu_[bereich]_[feature].md`
- [ ] Template vollständig ausfüllen
- [ ] User-Test-Anleitung erstellen
- [ ] Clean-Code-Checkliste durchgehen

### 3. Dokumentations-Integration
**Nach Fertigstellung:**
- [ ] `/docs/features/README.md` aktualisieren (Status: Geplant → Abgeschlossen)
- [ ] Bei neuen Bereichen: `/docs/README.md` ergänzen
- [ ] Template-Verbesserungen in `/docs/development/` kopieren

## 🔄 Workflow für Feature-Updates

### Bei Code-Änderungen
**Kleine Änderungen (Bugfixes):**
- Dokumentation prüfen, meist keine Änderung nötig

**Größere Änderungen (neue Funktionen):**
- [ ] Dokumentation entsprechend aktualisieren
- [ ] User-Test-Anleitung anpassen
- [ ] API-Änderungen dokumentieren

**Refactoring:**
- [ ] Clean-Code-Checkliste erneut durchgehen
- [ ] Code-Struktur-Abschnitt aktualisieren
- [ ] Komponenten-Struktur prüfen

### Bei Breaking Changes
- [ ] ⚠️ Warnings in Dokumentation hinzufügen
- [ ] Migration-Guide erstellen
- [ ] User-Test-Anleitungen komplett überprüfen

## 🕒 Regelmäßige Wartung

### Monatlich
- [ ] Alle Feature-Dokumentationen auf Aktualität prüfen
- [ ] Veraltete TODOs und Probleme bereinigen
- [ ] Test-Anleitungen stichprobenartig durchführen

### Bei Major-Releases
- [ ] Vollständiger Review aller Dokumentationen
- [ ] Template-Updates wenn nötig
- [ ] Architektur-Dokumentation aktualisieren

## 🎯 Qualitätssicherung

### Review-Prozess
1. **Self-Review**: Entwickler prüft eigene Dokumentation
2. **Peer-Review**: Teammitglied überprüft Vollständigkeit
3. **User-Test**: Test-Anleitung praktisch durchführen
4. **Final-Check**: Product Owner bestätigt Business-Logik

### Quality-Gates
**Dokumentation ist vollständig wenn:**
- [ ] Alle Template-Abschnitte ausgefüllt
- [ ] User-Test-Anleitung funktioniert
- [ ] Keine `[UNKLAR: ...]` Markierungen vorhanden
- [ ] Navigation aktualisiert

## 🚨 Wichtige Erinnerungen

### Für Entwickler
> **"Kein Feature ist fertig ohne Dokumentation!"**
> - Code-Änderungen = Dokumentations-Update
> - Neue API-Endpoints = API-Dokumentation
> - UI-Änderungen = User-Test-Anleitung anpassen

### Für KI-Assistenten
> **"Immer Dokumentations-Navigation aktualisieren!"**
> - Nach jeder Feature-Dokumentation: README.md-Dateien aktualisieren
> - Template-Verbesserungen in development/ kopieren
> - Status-Änderungen in Feature-Listen vornehmen

### Für Product Owner
> **"Dokumentation ist Teil der Definition of Done!"**
> - Features ohne Dokumentation sind nicht release-ready
> - User-Test-Anleitungen für Acceptance-Tests nutzen
> - Dokumentations-Vollständigkeit bei Reviews prüfen

## 📈 Erfolgs-Metriken

**Gute Dokumentation erkennbar an:**
- Neue Teammitglieder können Features verstehen
- User-Tests funktionieren ohne Nachfragen
- Code-Reviews fokussieren auf Logik, nicht auf Verständnis
- Support-Anfragen reduzieren sich

---

**Workflow-Version:** 1.0  
**Letzte Aktualisierung:** 2025-08-03  
**Review-Zyklus:** Monatlich