# Benachrichtigungssystem - Action Plan

## Zusammenfassung der Probleme

| # | Problem | Priorität | Aufwand |
|---|---------|-----------|---------|
| 1 | `mediaLinkExpired` Einstellung funktioniert nicht | Hoch | Mittel |
| 2 | `firstView` Einstellung fehlt | Mittel | Gering |
| 3 | `teamChatMention` Einstellung fehlt | Mittel | Gering |
| 4 | `project_assignment` Type nicht implementiert | Niedrig | Mittel |

---

## Empfohlene Aktionen

### Aktion 1: `mediaLinkExpired` aus Settings entfernen
**Grund:** Die Einstellung suggeriert Funktionalität die nicht existiert
**Aufwand:** 5 Minuten
**Dateien:**
- `src/components/notifications/NotificationSettings.tsx` - Einstellung entfernen
- `src/hooks/use-notifications.ts` - Default entfernen (optional)

### Aktion 2: `firstView` Einstellung hinzufügen
**Grund:** Notification wird ausgelöst aber User kann sie nicht deaktivieren
**Aufwand:** 10 Minuten
**Dateien:**
- `src/components/notifications/NotificationSettings.tsx` - Einstellung hinzufügen
- `src/types/notifications.ts` - Type erweitern falls nötig
- `src/lib/firebase/notifications-service.ts` - Settings Check hinzufügen

### Aktion 3: `teamChatMention` Einstellung hinzufügen
**Grund:** Notification wird ausgelöst aber User kann sie nicht deaktivieren
**Aufwand:** 15 Minuten
**Dateien:**
- `src/components/notifications/NotificationSettings.tsx` - Neue Gruppe + Einstellung
- `src/types/notifications.ts` - Type erweitern
- `src/lib/firebase/team-chat-notifications.ts` - Settings Check hinzufügen

### Aktion 4: `project_assignment` ignorieren oder entfernen
**Grund:** Nie implementiert worden
**Aufwand:** 5 Minuten
**Empfehlung:** Type aus `notifications.ts` entfernen wenn nicht geplant

---

## Implementierungsplan

### Phase 1: Cleanup (Sofort)
1. ✅ `mediaLinkExpired` aus Settings-UI entfernen
2. ✅ Code-Kommentar hinzufügen dass Feature noch nicht implementiert

### Phase 2: Fehlende Einstellungen (Sofort)
1. ✅ `firstView` zur Freigaben-Gruppe hinzufügen
2. ✅ Settings-Check in `approval-service.ts` hinzufügen
3. ✅ `teamChatMention` als neue "Team"-Gruppe hinzufügen
4. ✅ Settings-Check in `team-chat-notifications.ts` hinzufügen

### Phase 3: Optional (Später)
1. ⏳ `mediaLinkExpired` Trigger implementieren (Cloud Function)
2. ⏳ `project_assignment` Trigger implementieren
3. ⏳ Email-Benachrichtigungen zusätzlich zu In-App

---

## Checkliste nach Implementierung

- [ ] Alle Settings-Einträge haben funktionierenden Trigger
- [ ] Alle Trigger respektieren User-Settings
- [ ] Default-Einstellungen sind sinnvoll (alle aktiviert)
- [ ] Settings werden korrekt in Firestore gespeichert
- [ ] Settings werden beim Notification-Erstellen geprüft
- [ ] UI zeigt nur echte, funktionierende Optionen
