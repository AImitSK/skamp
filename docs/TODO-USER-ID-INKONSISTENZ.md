# TODO: User-ID Inkonsistenz beheben

## Status: Offen
**Erstellt:** 2025-12-06
**Priorität:** Mittel
**Betroffene Bereiche:** Tasks, Projekte, Team-Zuweisungen

---

## Problem-Beschreibung

Das System verwendet **inkonsistent zwei verschiedene User-Identifikatoren**:

1. **Firebase Auth UID** (`user.uid`) - Die eindeutige ID aus Firebase Authentication
2. **TeamMember Document ID** (`teamMember.id`) - Die Firestore Document-ID des TeamMember-Eintrags

Diese IDs sind **unterschiedlich**, werden aber an verschiedenen Stellen austauschbar verwendet.

### Beispiel aus der Produktion (GolfNext Organisation)

| Feld | Wert |
|------|------|
| Firebase Auth UID | `BgKHilkfTBSVG13sqKfDwnl9Gxr2` |
| TeamMember Document ID | `pEiB1yfnHuJSDZppsTWN` |

---

## Betroffene Stellen

### 1. Projekte (`projects` Collection)
- `project.assignedTo[]` - Enthält TeamMember Document IDs
- `project.projectManager` - Enthält TeamMember Document ID

### 2. Tasks (`tasks` Collection)
- `task.assignedUserId` - Enthält TeamMember Document ID (sollte Firebase Auth UID sein)

### 3. Hooks und Queries
- `useMyTasks` - Suchte ursprünglich nur nach `user.uid`, fand aber Tasks mit Document ID nicht
  - **Workaround implementiert:** Sucht jetzt nach beiden IDs

### 4. API-Routes
- `/api/v1/messages` - Team-Membership-Check prüfte nur nach Firebase Auth UID
  - **Workaround implementiert:** Prüft jetzt auch TeamMember Document ID

---

## Auswirkungen

- Tasks werden Usern zugewiesen, aber im Dashboard nicht angezeigt
- Filterung nach "Meine Aufgaben" funktioniert nicht korrekt
- Potenzielle Probleme bei anderen Features, die User-IDs verwenden

---

## Implementierter Workaround

In `src/lib/hooks/useMyTasks.ts` wurde ein Workaround implementiert:

```typescript
// Sammle alle möglichen IDs für den aktuellen User
const userIds = new Set<string>();
userIds.add(user.uid);

// Lade TeamMember-Eintrag um die Document ID zu erhalten
const teamMember = await teamMemberService.getByUserAndOrg(user.uid, currentOrganization.id);
if (teamMember?.id && teamMember.id !== user.uid) {
  userIds.add(teamMember.id);
}

// Suche nach beiden IDs
for (const userId of userIds) {
  // ... Query mit userId
}
```

---

## Empfohlene Langfrist-Lösung

### Option A: Migration auf Firebase Auth UID (Empfohlen)

1. **Migrations-Script erstellen:**
   - Alle `project.assignedTo[]` Einträge von Document ID auf `userId` migrieren
   - Alle `project.projectManager` Einträge migrieren
   - Alle `task.assignedUserId` Einträge migrieren

2. **Code anpassen:**
   - `TaskCreateModal` und `TaskEditModal` prüfen (verwenden bereits `member.userId`)
   - Projekt-Wizard Team-Zuweisung prüfen
   - Alle Stellen finden, die `member.id` statt `member.userId` verwenden

3. **Validierung hinzufügen:**
   - Bei neuen Zuweisungen sicherstellen, dass immer `userId` verwendet wird

### Option B: Konsistente Document ID Nutzung

Alternativ könnte überall die TeamMember Document ID verwendet werden, aber dies erfordert:
- Anpassung aller Auth-basierten Queries
- Komplexere Lookups bei der Authentifizierung

---

## Betroffene Dateien (zu prüfen)

- [ ] `src/components/projects/TaskCreateModal.tsx`
- [ ] `src/components/projects/TaskEditModal.tsx`
- [ ] `src/components/projects/ProjectTaskManager.tsx`
- [ ] `src/app/dashboard/projects/[projectId]/page.tsx`
- [ ] Projekt-Wizard Komponenten
- [ ] Alle Stellen mit `assignedTo` oder `projectManager`

---

## Migrations-Script Vorlage

```javascript
// scripts/migrate-user-ids.js
// TODO: Implementieren wenn Zeit vorhanden

async function migrateUserIds() {
  // 1. Lade alle TeamMembers mit userId Mapping
  // 2. Für jedes Projekt: Ersetze Document IDs in assignedTo mit userIds
  // 3. Für jede Task: Ersetze Document ID in assignedUserId mit userId
  // 4. Logging und Rollback-Möglichkeit
}
```

---

## Notizen

- Der Workaround in `useMyTasks` funktioniert, erhöht aber die Anzahl der Firestore-Queries
- Bei neuen Features sollte konsequent `member.userId` (Firebase Auth UID) verwendet werden
- Owner-Einträge haben oft eine kombinierte ID: `{userId}_{organizationId}` - diese sind korrekt
