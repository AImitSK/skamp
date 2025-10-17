# Media-Modul: Client-Zuordnung entfernen

**Datum:** 2025-10-17
**Grund:** Umstellung auf Projekt-bezogenes Arbeiten
**Status:** 📋 Planung
**Geschätzter Aufwand:** 2-3 Stunden

---

## Zusammenfassung

Das Media-Modul enthält eine komplexe Client-Zuordnungs-Logik (`clientId`), die durch die Umstellung auf Projekt-bezogenes Arbeiten nicht mehr benötigt wird. Diese Logik umfasst:

1. **Client-Zuordnung auf Asset-Ebene** (`MediaAsset.clientId`)
2. **Client-Zuordnung auf Folder-Ebene** (`MediaFolder.clientId`)
3. **Komplexe Client-Vererbung** (Folders → Assets)
4. **Client-Filter und Query-Funktionen**
5. **UI-Komponenten mit Client-Anzeige**

**Ziel:** Alle Client-Zuordnungen und deren Vererbungslogik aus dem Media-Modul entfernen.

---

## Betroffene Bereiche

### 1. TypeScript-Typen (5 Dateien)

#### `src/types/media.ts`

**Zu entfernen:**
```typescript
// MediaAsset
clientId?: string; // Kunden-Zuordnung

// MediaFolder
clientId?: string; // Optional: Kunde zugeordnet

// MediaFilter
clientId?: string;

// AssetCollection (deprecated)
clientId: string;

// AssetPackage (deprecated)
clientId: string;
```

**Status:** 3 aktive Typen, 2 deprecated Typen

---

### 2. Service-Layer (3 Dateien)

#### `src/lib/firebase/media-assets-service.ts`

**Zu entfernen:**

1. **Upload Context:**
```typescript
// Line ~40
context?: { userId: string; clientId?: string }

// Line ~75
...(context?.clientId && { clientId: context.clientId }),
```

2. **Client-Filter Funktion:**
```typescript
// Line ~250-280 (komplette Funktion)
export async function getMediaAssetsByClient(
  organizationId: string,
  clientId: string,
): Promise<MediaAsset[]>
```

3. **Update Asset:**
```typescript
// Line ~130
if (updates.clientId !== undefined) updateData.clientId = updates.clientId;

// Line ~145 (Client-Vererbung)
updateData.clientId = inheritedClientId;
```

4. **Create Folder Context:**
```typescript
// Line ~165
context?: { userId?: string; clientId?: string }

// Line ~190
...(context?.clientId && { clientId: context.clientId })
```

**Geschätzter Aufwand:** 30 Minuten

---

#### `src/lib/firebase/media-folders-service.ts`

**Zu entfernen:**

1. **Create Folder:**
```typescript
// Line ~36
...(folder.clientId && { clientId: folder.clientId }),
```

2. **Update Folder Client Inheritance (KOMPLETTE FUNKTION):**
```typescript
// Line ~114-162 (49 Zeilen)
export async function updateFolderClientInheritance(
  folderId: string,
  organizationId: string
): Promise<void>
```

**Details:**
- Rekursive Funktion, die `clientId` von Parent-Folder zu Child-Folders/Assets vererbt
- Wird bei Folder-Move aufgerufen
- Importiert `getRootFolderClientId` aus `folder-utils`
- Ruft `updateAsset` auf

3. **Update Folder:**
```typescript
// Line ~208
if (updates.clientId !== undefined) updateData.clientId = updates.clientId;
```

4. **Move Folder:**
```typescript
// Line ~188-189
// Update client inheritance if organizationId provided
if (organizationId) {
  await updateFolderClientInheritance(folderId, organizationId);
}
```

**Geschätzter Aufwand:** 45 Minuten

---

#### `src/lib/firebase/media-service.backup.ts`

**Zu entfernen:**
- Identische Logik wie in den extrahierten Services
- Wird nur noch als Backup behalten

**Aktion:** Datei kann ignoriert werden (ist Backup)

---

### 3. Utility-Funktionen (1 Datei)

#### `src/lib/utils/folder-utils.ts` (vermutlich)

**Zu entfernen:**
```typescript
export async function getRootFolderClientId(
  folder: MediaFolder,
  allFolders: MediaFolder[]
): Promise<string | undefined>
```

**Status:** Muss geprüft werden, ob Datei existiert

**Geschätzter Aufwand:** 10 Minuten

---

### 4. UI-Komponenten (3 Dateien)

#### `src/components/mediathek/AssetDetailsModal.tsx`

**Zu entfernen:**
```typescript
// Line ~50 (ungefähr)
return folder.clientId;
```

**Aktion:**
- Client-Badge entfernen
- Client-Auswahl-Dropdown entfernen (falls vorhanden)

**Geschätzter Aufwand:** 15 Minuten

---

#### `src/components/mediathek/FolderCard.tsx`

**Zu entfernen:**
- Client-Badge (falls angezeigt)

**Status:** Prüfen, ob Client-Badge angezeigt wird

**Geschätzter Aufwand:** 10 Minuten

---

#### `src/app/dashboard/library/media/UploadModal.tsx`

**Zu entfernen:**
```typescript
// Client-Zuordnung UI-Elemente
preselectedClientId?: string;
```

**Aktion:**
- Client-Dropdown entfernen
- Upload-Context ohne `clientId` aufrufen

**Geschätzter Aufwand:** 15 Minuten

---

### 5. React Query Hooks (1 Datei)

#### `src/lib/hooks/useMediaData.ts`

**Zu prüfen:**
- `useUploadMediaAsset()` - Context ohne `clientId`
- `useCreateFolder()` - Folder ohne `clientId`
- `useUpdateAsset()` - Updates ohne `clientId`

**Aktion:**
- Hook-Signaturen anpassen (optionale Parameter entfernen)

**Geschätzter Aufwand:** 15 Minuten

---

### 6. Dokumentation (4 Dateien)

#### `docs/media/api/README.md`

**Zu entfernen:**

1. **Service-Übersicht (Zeile ~10):**
```markdown
| **Folders** | `media-folders-service.ts` | ~300 | Folder Management, Hierarchie, Client-Vererbung |
```
→ "Client-Vererbung" entfernen

2. **Upload Context (Zeile ~45):**
```typescript
context?: { userId?: string; clientId?: string }

// Beispiel
{ userId: 'user-789', clientId: 'client-101' }
```

3. **Asset Properties (Zeile ~60):**
```typescript
clientId: 'client-456',
```

4. **Client-Filter Funktion (Zeile ~120-150):**
```markdown
#### `getMediaAssetsByClient(organizationId, clientId)`
Lädt alle Assets für einen Client.
```
→ Komplette Sektion entfernen

5. **Folder Properties (Zeile ~180):**
```typescript
clientId?: string;
clientId: 'client-101',
```

6. **Client-Vererbung Sektion (Zeile ~220-260):**
```markdown
### Client-Vererbung

#### `updateFolderClientInheritance(folderId, organizationId)`
...
```
→ Komplette Sektion entfernen

**Geschätzter Aufwand:** 30 Minuten

---

#### `docs/media/components/README.md`

**Zu entfernen:**

1. **FolderCard Features (Zeile ~85):**
```markdown
- Client-Badge (wenn clientId vorhanden)
```

2. **UploadModal Props (Zeile ~318):**
```typescript
preselectedClientId?: string;
```

3. **UploadModal Features (Zeile ~340):**
```markdown
- Client-Zuordnung
```

4. **AssetDetailsModal Features (Zeile ~414):**
```markdown
- Client-Zuordnung
```

5. **FolderModal Features (Zeile ~462):**
```markdown
- Client-Zuordnung
```

**Geschätzter Aufwand:** 20 Minuten

---

#### `docs/media/guides/upload-guide.md`

**Zu entfernen:**

1. **Upload mit Client-Zuordnung Sektion (Zeile ~206-242):**
```markdown
## Upload mit Client-Zuordnung

### Asset automatisch einem Client zuordnen
...
**Client-Vererbung:**
...
```
→ Komplette Sektion entfernen (~35 Zeilen)

**Geschätzter Aufwand:** 10 Minuten

---

#### `docs/media/README.md`

**Zu prüfen:**
- Erwähnungen von Client-Zuordnung
- Features-Liste

**Geschätzter Aufwand:** 10 Minuten

---

### 7. Tests (4 Dateien)

#### `src/lib/firebase/__tests__/media-assets-service.test.ts`

**Zu entfernen/anpassen:**
- Tests für `getMediaAssetsByClient()`
- Tests für Upload mit `clientId`-Context
- Tests für Asset-Update mit `clientId`

**Geschätzter Aufwand:** 15 Minuten

---

#### `src/lib/firebase/__tests__/media-folders-service.test.ts`

**Zu entfernen/anpassen:**
- Tests für `updateFolderClientInheritance()`
- Tests für Folder-Create mit `clientId`
- Tests für Folder-Move mit Client-Vererbung

**Geschätzter Aufwand:** 20 Minuten

---

#### `src/components/mediathek/__tests__/...`

**Zu prüfen:**
- UploadModal Tests
- AssetDetailsModal Tests
- FolderCard Tests

**Geschätzter Aufwand:** 15 Minuten

---

## Migrations-Strategie

### Option 1: Daten beibehalten (Empfohlen)

**Vorgehen:**
1. Code entfernen, aber `clientId` in Firestore behalten
2. Alte Daten bleiben unverändert
3. Neue Assets/Folders werden ohne `clientId` erstellt

**Vorteile:**
- Keine Daten-Migration notwendig
- Alte Daten bleiben verfügbar (falls Rückfrage)
- Schnelle Implementierung

**Nachteile:**
- `clientId`-Felder bleiben in Firestore (aber ungenutzt)

---

### Option 2: Daten migrieren (Optional)

**Vorgehen:**
1. Code entfernen
2. Firestore-Migration-Script schreiben
3. Alle `clientId`-Felder aus Firestore entfernen

**Vorteile:**
- Saubere Datenbank
- Keine ungenutzten Felder

**Nachteile:**
- Migration-Script notwendig
- Zeitaufwand: +2-3 Stunden
- Risiko bei Fehler in Migration

**Empfehlung:** Nur wenn Datenbank-Cleanup wichtig ist

---

## Implementierungs-Plan (Empfohlene Reihenfolge)

### Phase 1: TypeScript-Typen (15 Min)

**Dateien:**
1. `src/types/media.ts`
   - `MediaAsset.clientId` → optional beibehalten (deprecated)
   - `MediaFolder.clientId` → optional beibehalten (deprecated)
   - `MediaFilter.clientId` → entfernen
   - `AssetCollection.clientId` → entfernen (deprecated Type)
   - `AssetPackage.clientId` → entfernen (deprecated Type)

**Warum optional beibehalten?**
- Firestore-Daten enthalten noch `clientId`
- TypeScript-Fehler vermeiden beim Lesen

**Aktion:**
```typescript
// MediaAsset
/** @deprecated Client-Zuordnung nicht mehr verwendet (Projekt-basiert) */
clientId?: string;

// MediaFolder
/** @deprecated Client-Zuordnung nicht mehr verwendet (Projekt-basiert) */
clientId?: string;
```

---

### Phase 2: Service-Layer (90 Min)

**Reihenfolge:**

1. **media-assets-service.ts** (30 Min)
   - Upload-Context: `clientId` aus Signatur entfernen
   - `getMediaAssetsByClient()` → Funktion entfernen
   - Update-Asset: Client-Vererbung entfernen

2. **folder-utils.ts** (10 Min)
   - `getRootFolderClientId()` → Funktion entfernen (falls existiert)

3. **media-folders-service.ts** (45 Min)
   - `updateFolderClientInheritance()` → Funktion entfernen
   - Create-Folder: `clientId` entfernen
   - Update-Folder: `clientId`-Handling entfernen
   - Move-Folder: Client-Vererbung-Aufruf entfernen

4. **media-service.backup.ts** (5 Min)
   - Kann ignoriert werden (nur Backup)

---

### Phase 3: UI-Komponenten (40 Min)

**Reihenfolge:**

1. **UploadModal.tsx** (15 Min)
   - Client-Dropdown UI entfernen
   - `preselectedClientId` Prop entfernen
   - Upload-Aufruf ohne `clientId`-Context

2. **AssetDetailsModal.tsx** (15 Min)
   - Client-Badge entfernen
   - Client-Auswahl-Dropdown entfernen (falls vorhanden)

3. **FolderCard.tsx** (10 Min)
   - Client-Badge entfernen (falls angezeigt)

---

### Phase 4: React Query Hooks (15 Min)

**Dateien:**
1. `src/lib/hooks/useMediaData.ts`
   - `useUploadMediaAsset()` → Context ohne `clientId`
   - `useCreateFolder()` → Folder ohne `clientId`
   - `useUpdateAsset()` → Updates ohne `clientId`

---

### Phase 5: Tests anpassen (50 Min)

**Reihenfolge:**

1. **media-assets-service.test.ts** (15 Min)
   - Tests für `getMediaAssetsByClient()` entfernen
   - Upload-Tests ohne `clientId` anpassen

2. **media-folders-service.test.ts** (20 Min)
   - Tests für `updateFolderClientInheritance()` entfernen
   - Folder-Create/Update-Tests anpassen

3. **Komponenten-Tests** (15 Min)
   - UploadModal Tests anpassen
   - AssetDetailsModal Tests anpassen

---

### Phase 6: Dokumentation aktualisieren (70 Min)

**Reihenfolge:**

1. **api/README.md** (30 Min)
   - Service-Übersicht: "Client-Vererbung" entfernen
   - Upload-Context ohne `clientId`
   - `getMediaAssetsByClient()` Sektion entfernen
   - Client-Vererbung Sektion entfernen

2. **components/README.md** (20 Min)
   - FolderCard: Client-Badge entfernen
   - UploadModal: Client-Zuordnung entfernen
   - AssetDetailsModal: Client-Zuordnung entfernen

3. **guides/upload-guide.md** (10 Min)
   - "Upload mit Client-Zuordnung" Sektion entfernen

4. **README.md** (10 Min)
   - Client-Zuordnung aus Features entfernen

---

### Phase 7: Tests ausführen & Finalisierung (30 Min)

1. **TypeScript-Check** (5 Min)
```bash
npm run type-check
```

2. **Tests ausführen** (15 Min)
```bash
npm test -- media
```

3. **Build-Test** (10 Min)
```bash
npm run build
```

---

## Checkliste

### Code-Änderungen

#### TypeScript-Typen
- [ ] `src/types/media.ts` - `MediaAsset.clientId` → deprecated
- [ ] `src/types/media.ts` - `MediaFolder.clientId` → deprecated
- [ ] `src/types/media.ts` - `MediaFilter.clientId` → entfernen
- [ ] `src/types/media.ts` - `AssetCollection.clientId` → entfernen
- [ ] `src/types/media.ts` - `AssetPackage.clientId` → entfernen

#### Service-Layer
- [ ] `media-assets-service.ts` - Upload Context ohne `clientId`
- [ ] `media-assets-service.ts` - `getMediaAssetsByClient()` entfernen
- [ ] `media-assets-service.ts` - Update Asset: Client-Vererbung entfernen
- [ ] `media-folders-service.ts` - `updateFolderClientInheritance()` entfernen
- [ ] `media-folders-service.ts` - Create Folder ohne `clientId`
- [ ] `media-folders-service.ts` - Update Folder ohne `clientId`
- [ ] `media-folders-service.ts` - Move Folder: Client-Vererbung entfernen
- [ ] `folder-utils.ts` - `getRootFolderClientId()` entfernen (falls existiert)

#### UI-Komponenten
- [ ] `UploadModal.tsx` - Client-Dropdown entfernen
- [ ] `UploadModal.tsx` - `preselectedClientId` Prop entfernen
- [ ] `AssetDetailsModal.tsx` - Client-Badge entfernen
- [ ] `AssetDetailsModal.tsx` - Client-Auswahl entfernen
- [ ] `FolderCard.tsx` - Client-Badge entfernen (falls vorhanden)

#### React Query Hooks
- [ ] `useMediaData.ts` - `useUploadMediaAsset()` ohne `clientId`
- [ ] `useMediaData.ts` - `useCreateFolder()` ohne `clientId`
- [ ] `useMediaData.ts` - `useUpdateAsset()` ohne `clientId`

#### Tests
- [ ] `media-assets-service.test.ts` - Tests anpassen
- [ ] `media-folders-service.test.ts` - Tests anpassen
- [ ] Komponenten-Tests anpassen

### Dokumentation

#### API-Dokumentation
- [ ] `api/README.md` - Service-Übersicht aktualisieren
- [ ] `api/README.md` - Upload-Context ohne `clientId`
- [ ] `api/README.md` - `getMediaAssetsByClient()` entfernen
- [ ] `api/README.md` - Client-Vererbung Sektion entfernen

#### Komponenten-Dokumentation
- [ ] `components/README.md` - FolderCard aktualisieren
- [ ] `components/README.md` - UploadModal aktualisieren
- [ ] `components/README.md` - AssetDetailsModal aktualisieren

#### Guides
- [ ] `guides/upload-guide.md` - Client-Zuordnung entfernen
- [ ] `README.md` - Features aktualisieren

### Qualitäts-Checks

- [ ] TypeScript: 0 Fehler (`npm run type-check`)
- [ ] ESLint: 0 Warnings (`npm run lint`)
- [ ] Tests: 100% bestehen (`npm test -- media`)
- [ ] Build: Erfolgreich (`npm run build`)

---

## Git-Workflow

### Branch-Strategie

```bash
# Feature-Branch erstellen
git checkout -b refactor/media-remove-client-assignment

# Nach jeder Phase committen
git add .
git commit -m "refactor: Phase X - [Beschreibung]"

# Am Ende pushen
git push origin refactor/media-remove-client-assignment
```

### Commit-Messages

**Phase 1:**
```
refactor: Media Types - clientId als deprecated markiert

- MediaAsset.clientId → @deprecated
- MediaFolder.clientId → @deprecated
- MediaFilter.clientId entfernt
- AssetCollection/AssetPackage.clientId entfernt
```

**Phase 2:**
```
refactor: Media Services - Client-Zuordnung entfernt

- getMediaAssetsByClient() Funktion entfernt
- updateFolderClientInheritance() Funktion entfernt
- Upload/Create/Update ohne clientId-Context
- Client-Vererbungslogik entfernt (~150 Zeilen)
```

**Phase 3:**
```
refactor: Media UI - Client-Zuordnung UI entfernt

- UploadModal: Client-Dropdown entfernt
- AssetDetailsModal: Client-Badge entfernt
- FolderCard: Client-Badge entfernt
```

**Phase 4:**
```
refactor: Media Hooks - Client-Context entfernt

- useUploadMediaAsset ohne clientId
- useCreateFolder ohne clientId
- useUpdateAsset ohne clientId
```

**Phase 5:**
```
test: Media Tests - Client-Tests entfernt/angepasst

- media-assets-service Tests angepasst
- media-folders-service Tests angepasst
- Komponenten-Tests angepasst
```

**Phase 6:**
```
docs: Media Dokumentation - Client-Referenzen entfernt

- API-Docs: Client-Vererbung Sektion entfernt
- Components-Docs: Client-Zuordnung entfernt
- Upload-Guide: Client-Zuordnung Sektion entfernt
```

**Final:**
```
refactor: Media-Modul Client-Zuordnung vollständig entfernt

Umstellung auf Projekt-bezogenes Arbeiten:
- Client-Zuordnung und Vererbung entfernt
- ~200 Zeilen Code entfernt
- Dokumentation aktualisiert
- Alle Tests bestehen

BREAKING CHANGE: clientId wird nicht mehr unterstützt
Bestehende Daten bleiben unverändert (deprecated)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Risiko-Analyse

### Hohes Risiko

**1. Client-Vererbungslogik ist komplex**
- Rekursive Funktionen
- Viele Abhängigkeiten

**Mitigation:**
- Schrittweise entfernen
- Tests nach jeder Änderung ausführen

**2. Bestehende Daten in Firestore**
- `clientId`-Felder existieren noch

**Mitigation:**
- Felder als `deprecated` markieren (nicht entfernen)
- Daten bleiben unverändert

### Mittleres Risiko

**3. Tests könnten fehlschlagen**
- Viele Tests verwenden `clientId`

**Mitigation:**
- Tests schrittweise anpassen
- Sofort fixen bei Fehler

### Niedriges Risiko

**4. Dokumentation könnte inkonsistent werden**

**Mitigation:**
- Alle Docs in einer Phase aktualisieren
- Systematisches Suchen nach "client"

---

## Zeitplan

**Gesamt-Aufwand:** ~280 Minuten (~4.5 Stunden)

| Phase | Aufwand | Kumulativ |
|-------|---------|-----------|
| Phase 1: TypeScript-Typen | 15 Min | 15 Min |
| Phase 2: Service-Layer | 90 Min | 105 Min |
| Phase 3: UI-Komponenten | 40 Min | 145 Min |
| Phase 4: React Query Hooks | 15 Min | 160 Min |
| Phase 5: Tests anpassen | 50 Min | 210 Min |
| Phase 6: Dokumentation | 70 Min | 280 Min |
| Phase 7: Finalisierung | 30 Min | 310 Min |

**Empfohlene Arbeitsweise:**
- **Session 1 (2h):** Phase 1-3 (Code-Änderungen)
- **Session 2 (1.5h):** Phase 4-6 (Hooks, Tests, Docs)
- **Session 3 (30min):** Phase 7 (Finalisierung)

---

## Erfolgs-Kriterien

**Technisch:**
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Tests: 100% bestehen
- ✅ Build: Erfolgreich

**Funktional:**
- ✅ Upload funktioniert ohne Client-Zuordnung
- ✅ Folder-Create funktioniert ohne Client-Zuordnung
- ✅ Folder-Move funktioniert ohne Client-Vererbung
- ✅ Keine Client-UI-Elemente sichtbar

**Dokumentation:**
- ✅ Alle Client-Referenzen entfernt
- ✅ Upload-Guide ohne Client-Sektion
- ✅ API-Docs ohne Client-Vererbung

---

## Nächste Schritte

1. **Plan reviewen** - Team-Review einholen
2. **Branch erstellen** - `refactor/media-remove-client-assignment`
3. **Phase 1 starten** - TypeScript-Typen anpassen
4. **Iterativ arbeiten** - Phase für Phase mit Tests
5. **Dokumentieren** - Jede Phase committen
6. **Finalisieren** - Tests + Build + Push

---

**Erstellt:** 2025-10-17
**Autor:** Claude Code (Analyse & Planung)
**Status:** ✅ Bereit zur Implementierung
**Geschätzter Aufwand:** 2-3 Stunden
**Risiko:** Mittel (komplexe Vererbungslogik)

---

## Fragen & Antworten

**Q: Sollen wir Firestore-Daten migrieren?**
A: Nein (vorerst). Felder als `deprecated` markieren, aber Daten beibehalten.

**Q: Was passiert mit alten Assets/Folders die `clientId` haben?**
A: Bleiben unverändert. `clientId` wird ignoriert, aber nicht gelöscht.

**Q: Müssen wir Firestore Security Rules anpassen?**
A: Nein. `clientId`-Felder können bleiben (werden nur nicht mehr geschrieben).

**Q: Was ist mit Tests die `clientId` verwenden?**
A: Schrittweise anpassen oder entfernen (Phase 5).

**Q: Können wir später wieder Client-Zuordnung einführen?**
A: Ja, da Felder in Firestore bleiben (deprecated).

---
