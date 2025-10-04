# Migration Plan: superadmin_publications → publications mit isGlobal

**Datum:** 2025-10-04
**Ziel:** Vereinheitlichung der Publication-Speicherung analog zu Companies (isGlobal-Pattern)

## 🎯 ANALYSE ABGESCHLOSSEN

### ✅ Services sind korrekt:
- ✅ `matching-service.ts` - Lädt aus `publications` (korrekt!)
- ✅ `publication-finder.ts` - Lädt aus `publications` (korrekt!)
- ✅ `ai/merge-variants/route.ts` - Keine DB-Zugriffe (korrekt!)
- ✅ `data-merger.ts` - Keine DB-Zugriffe (korrekt!)

### ❌ Zu ändern:
- ❌ `seed-realistic-test-data.ts` - Schreibt in BEIDE Collections
- ❌ `seed-massive-test-data.ts` - **KANN GELÖSCHT WERDEN**
- ❌ `seed-comprehensive-test-data.ts` - **KANN GELÖSCHT WERDEN**
- ❌ `cleanup-test-data.ts` - **KANN GELÖSCHT WERDEN** (wird integriert)

---

## 📝 UMSETZUNGSSCHRITTE

### 1. Dateien löschen (nicht mehr benötigt)
```
src/lib/matching/seed-massive-test-data.ts ❌ LÖSCHEN
src/lib/matching/seed-comprehensive-test-data.ts ❌ LÖSCHEN
src/lib/matching/cleanup-test-data.ts ❌ LÖSCHEN
```

### 2. `seed-realistic-test-data.ts` anpassen

**Änderungen:**
- Alle `batch.set(doc(db, 'superadmin_publications', ...))` ENTFERNEN
- NUR noch `batch.set(doc(db, 'publications', ...))` mit `isGlobal: true`
- Cleanup-Funktionen aus `cleanup-test-data.ts` in diese Datei integrieren
- Cleanup: Nur aus `publications` mit `isTestData: true` löschen

**Vorher:**
```typescript
// 1. superadmin_publications für Auto-Matching
batch.set(doc(db, 'superadmin_publications', publication.id), publicationData);

// 2. publications mit isGlobal für Premium-Datenbank
batch.set(doc(db, 'publications', publication.id), {
  ...publicationData,
  isGlobal: true
});
```

**Nachher:**
```typescript
// NUR publications mit isGlobal
batch.set(doc(db, 'publications', publication.id), {
  ...publicationData,
  isGlobal: true,
  organizationId: 'kqUJumpKKVPQIY87GP1cgO0VaKC3' // SuperAdmin org
});
```

### 3. `matching-service.ts` verbessern

**Problem in `createContactSnapshot` (Zeile 545-563):**

Aktueller Code findet keine Publication-Namen wenn References verwendet werden.

**Änderung:**
```typescript
// AKTUELL:
const pubDoc = await getDoc(doc(db, 'publications', pubId));

// NEU: Reference-Support hinzufügen
if (pubId.startsWith('local-ref-')) {
  // 1. Lade Reference um globalPublicationId zu bekommen
  // 2. Dann lade echte Publication
} else {
  // Normale Publication
  const pubDoc = await getDoc(doc(db, 'publications', pubId));
}
```

### 4. Dokumentation aktualisieren

**Dateien:**
- `docs/implementation-plans/intelligent-matching-part4-publication-finder.md`
- `docs/implementation-plans/intelligent-matching-part6-ui-testing.md`

**Änderungen:**
- Alle `collection(db, 'superadmin_publications')` → `collection(db, 'publications')`
- Code-Beispiele mit `isGlobal: true` Flag ergänzen

### 5. Keine weiteren Änderungen nötig
- ✅ SuperAdmin UI nutzt korrekte Services
- ✅ CRM/Publications Seiten nutzen korrekte Collections
- ✅ Firestore Rules können bleiben (schadet nicht)
- ✅ Alle Produktiv-Services bereits korrekt

---

## 🔍 PRÜFUNG ABGESCHLOSSEN ✅

### Geprüfte Bereiche:
1. ✅ CRM / Publications Seiten - **KEINE** superadmin_publications Aufrufe
2. ✅ Globale Suche durchgeführt - Nur folgende Dateien betroffen:

**Code-Dateien (zu ändern):**
- `src/lib/matching/seed-realistic-test-data.ts` ❌
- `src/lib/matching/seed-massive-test-data.ts` ❌ LÖSCHEN
- `src/lib/matching/seed-comprehensive-test-data.ts` ❌ LÖSCHEN
- `firestore.rules` ⚠️ Kann bleiben (schadet nicht)

**Dokumentation (zu aktualisieren):**
- `docs/implementation-plans/intelligent-matching-part4-publication-finder.md` 📝
- `docs/implementation-plans/intelligent-matching-part6-ui-testing.md` 📝

**Git-Logs & Migration Plan:**
- `.git/logs/*` (ignorieren)
- `docs/MIGRATION-PLAN-publications-isGlobal.md` (dieser Plan)

### Ergebnis:
✅ **NUR Test-Daten Services betroffen - Produktiv-Code ist bereits korrekt!**

---

## ✅ ERFOLGSKRITERIEN

- [ ] Nur noch `publications` Collection mit `isGlobal: true` für SuperAdmin
- [ ] Test-Daten funktionieren einwandfrei
- [ ] Cleanup löscht korrekt aus `publications`
- [ ] Reference-Publications werden korrekt geladen (Namen erscheinen in Varianten)
- [ ] Konsistenz mit Companies (`companies_enhanced` + `isGlobal`)

---

**Status:** In Planung
**Nächster Schritt:** CRM/Publications Seiten prüfen
