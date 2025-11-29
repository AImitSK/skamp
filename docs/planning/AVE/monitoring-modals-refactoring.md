# Monitoring Modals: Refactoring von `blog` zu `audio`

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** Monitoring, Veröffentlichungs-Erfassung, UI Components
**Bezug:** `monitoring-types-refactoring.md`, `publication-type-format-metrics-konzept.md`

---

## 🎯 Zielsetzung

Die beiden Modals zum Erfassen und Bearbeiten von Veröffentlichungen im Monitoring-Bereich müssen an unser neues **Type/Format-Konzept** angepasst werden:

- ❌ **Entfernen:** `blog` als `outletType`-Option (ist ein **Type**, kein **Format**)
- ✅ **Hinzufügen:** `audio` als `outletType`-Option (neues Format für Podcasts)

**Betroffene Modals:**
1. `MarkPublishedModal.tsx` - Neue Veröffentlichung erfassen
2. `EditClippingModal.tsx` - Bestehende Veröffentlichung bearbeiten

---

## 📍 Wo werden die Modals verwendet?

**Route:** `/dashboard/analytics/monitoring/[campaignId]?tab=recipients`

**User Flow:**
1. User wählt Tab "Empfänger & Veröffentlichungen"
2. **Neue Veröffentlichung:** Dropdown-Menü → "Als veröffentlicht markieren" → `MarkPublishedModal`
3. **Bearbeiten:** Dropdown-Menü → "Bearbeiten" → `EditClippingModal`

---

## ❌ Aktuelles Problem

### **1. MarkPublishedModal.tsx**

**Datei:** `src/components/monitoring/MarkPublishedModal.tsx`

#### **Problem 1.1: Erstes Dropdown (Zeile 250-254)**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="blog">✍️ Blog</option>  // ❌ FALSCH
</Select>
```

**Wird angezeigt:** Wenn KEINE Publication aus dem Selector gewählt wurde (manuelle Eingabe)

---

#### **Problem 1.2: Zweites Dropdown (Zeile 269-273)**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
  disabled={selectedPublication.source === 'company'}
>
  <option value="print">📰 Print</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast</option>
  <option value="blog">✍️ Blog</option>  // ❌ FALSCH
</Select>
```

**Wird angezeigt:** Wenn eine Publication aus dem Selector gewählt wurde

---

### **2. EditClippingModal.tsx**

**Datei:** `src/components/monitoring/EditClippingModal.tsx`

#### **Problem 2.1: Dropdown (Zeile 128-131)**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="blog">✍️ Blog</option>  // ❌ FALSCH
</Select>
```

---

#### **Problem 2.2: TypeScript Type Cast (Zeile 35)**
```typescript
const [formData, setFormData] = useState<UpdateClippingFormData>({
  // ...
  outletType: clipping.outletType as 'print' | 'online' | 'broadcast' | 'blog',
  // ❌ FALSCH: 'blog' statt 'audio'
  // ...
});
```

---

## ✅ SOLL-Zustand

### **Neue Dropdown-Struktur**

**Vollständige Option (mit Beschreibung):**
```typescript
<Select value={formData.outletType} onChange={...}>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online (Website/Blog)</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="audio">🎧 Audio (Podcast)</option>  // ✅ NEU
</Select>
```

**Kompakte Option (ohne Beschreibung):**
```typescript
<Select value={formData.outletType} onChange={...}>
  <option value="print">📰 Print</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast</option>
  <option value="audio">🎧 Podcast</option>  // ✅ NEU
</Select>
```

---

### **TypeScript Type Cast**
```typescript
outletType: clipping.outletType as 'print' | 'online' | 'broadcast' | 'audio',
```

---

## 🔧 Implementierungsplan

### **Phase 1: MarkPublishedModal.tsx anpassen**

**Datei:** `src/components/monitoring/MarkPublishedModal.tsx`

#### **Änderung 1.1: Erstes Dropdown (Zeile 250-254)**

**VORHER:**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="blog">✍️ Blog</option>
</Select>
```

**NACHHER:**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online (Website/Blog)</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="audio">🎧 Audio (Podcast)</option>
</Select>
```

**Änderungen:**
- Zeile 251: `Online` → `Online (Website/Blog)` (Klarstellung)
- Zeile 254: `<option value="blog">✍️ Blog</option>` → `<option value="audio">🎧 Audio (Podcast)</option>`

---

#### **Änderung 1.2: Zweites Dropdown (Zeile 269-273)**

**VORHER:**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
  disabled={selectedPublication.source === 'company'}
>
  <option value="print">📰 Print</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast</option>
  <option value="blog">✍️ Blog</option>
</Select>
```

**NACHHER:**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
  disabled={selectedPublication.source === 'company'}
>
  <option value="print">📰 Print</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast</option>
  <option value="audio">🎧 Podcast</option>
</Select>
```

**Änderungen:**
- Zeile 272: `<option value="blog">✍️ Blog</option>` → `<option value="audio">🎧 Podcast</option>`

---

### **Phase 2: EditClippingModal.tsx anpassen**

**Datei:** `src/components/monitoring/EditClippingModal.tsx`

#### **Änderung 2.1: Dropdown (Zeile 128-131)**

**VORHER:**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="blog">✍️ Blog</option>
</Select>
```

**NACHHER:**
```typescript
<Select
  value={formData.outletType}
  onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online (Website/Blog)</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="audio">🎧 Audio (Podcast)</option>
</Select>
```

**Änderungen:**
- Zeile 129: `Online` → `Online (Website/Blog)` (Klarstellung)
- Zeile 131: `<option value="blog">✍️ Blog</option>` → `<option value="audio">🎧 Audio (Podcast)</option>`

---

#### **Änderung 2.2: TypeScript Type Cast (Zeile 35)**

**VORHER:**
```typescript
const [formData, setFormData] = useState<UpdateClippingFormData>({
  articleUrl: clipping.url || '',
  articleTitle: clipping.title || '',
  outletName: clipping.outletName || '',
  outletType: clipping.outletType as 'print' | 'online' | 'broadcast' | 'blog',
  reach: clipping.reach?.toString() || '',
  sentiment: clipping.sentiment,
  sentimentScore: clipping.sentimentScore || aveSettingsService.getSentimentScoreFromLabel(clipping.sentiment),
  publishedAt: clipping.publishedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
});
```

**NACHHER:**
```typescript
const [formData, setFormData] = useState<UpdateClippingFormData>({
  articleUrl: clipping.url || '',
  articleTitle: clipping.title || '',
  outletName: clipping.outletName || '',
  outletType: clipping.outletType as 'print' | 'online' | 'broadcast' | 'audio',
  reach: clipping.reach?.toString() || '',
  sentiment: clipping.sentiment,
  sentimentScore: clipping.sentimentScore || aveSettingsService.getSentimentScoreFromLabel(clipping.sentiment),
  publishedAt: clipping.publishedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
});
```

**Änderungen:**
- Zeile 35: `'blog'` → `'audio'` im Type Cast

---

## 🔄 Migration bestehender Clippings

### **Szenario: User hat bereits Clippings mit `outletType: 'blog'`**

**Problem:**
- Wenn ein Clipping mit `outletType: 'blog'` im `EditClippingModal` geöffnet wird, würde das Dropdown den Wert nicht finden
- TypeScript Cast würde Fehler werfen

**Lösungen:**

#### **Option A: Migration Script (empfohlen)**
Bereits geplant in: `monitoring-types-refactoring.md` (Phase 3)

Alle Clippings mit `outletType: 'blog'` werden zu `'online'` konvertiert.

---

#### **Option B: Graceful Degradation im Modal**

**EditClippingModal.tsx - Zeile 35:**
```typescript
const [formData, setFormData] = useState<UpdateClippingFormData>({
  // ...
  outletType: (
    clipping.outletType === 'blog'
      ? 'online'  // ✅ Fallback: blog → online
      : clipping.outletType
  ) as 'print' | 'online' | 'broadcast' | 'audio',
  // ...
});
```

**Vorteil:** Funktioniert auch ohne Migration

**Nachteil:** Temporäre Workaround-Logik im Code

---

#### **Option C: Deprecated-Option temporär beibehalten**

**Dropdown mit Warnung:**
```typescript
<Select value={formData.outletType} onChange={...}>
  <option value="print">📰 Print (Zeitung/Magazin)</option>
  <option value="online">💻 Online (Website/Blog)</option>
  <option value="broadcast">📺 Broadcast (TV/Radio)</option>
  <option value="audio">🎧 Audio (Podcast)</option>
  {formData.outletType === 'blog' && (
    <option value="blog" disabled>⚠️ Blog (veraltet - wird zu Online)</option>
  )}
</Select>
```

**Vorteil:** User sieht alte Daten noch

**Nachteil:** Komplexere UI-Logik

---

**Empfehlung:** **Option A (Migration Script)** + **Option B (Fallback)** als Sicherheitsnetz

---

## 📊 Betroffene Dateien

| Datei | Änderungen | Zeilen | Aufwand |
|-------|-----------|--------|---------|
| `src/components/monitoring/MarkPublishedModal.tsx` | 2 Dropdowns anpassen | 250-254, 269-273 | 5 Min |
| `src/components/monitoring/EditClippingModal.tsx` | 1 Dropdown + 1 Type Cast | 35, 128-131 | 5 Min |

**Gesamt:** ~10 Minuten reine Code-Änderung

---

## 🎯 Implementierungs-Schritte

### **Phase 1: MarkPublishedModal.tsx** ✅ Priorität 1
- [ ] Zeile 250-254: Erstes Dropdown anpassen (`blog` → `audio`)
- [ ] Zeile 251: Label ergänzen (`Online` → `Online (Website/Blog)`)
- [ ] Zeile 269-273: Zweites Dropdown anpassen (`blog` → `audio`)

### **Phase 2: EditClippingModal.tsx** ✅ Priorität 1
- [ ] Zeile 128-131: Dropdown anpassen (`blog` → `audio`)
- [ ] Zeile 129: Label ergänzen (`Online` → `Online (Website/Blog)`)
- [ ] Zeile 35: TypeScript Cast anpassen (`'blog'` → `'audio'`)
- [ ] Optional: Fallback für alte `blog`-Clippings (siehe Option B)

### **Phase 3: Testing** ✅ Priorität 2
- [ ] Test: Modal öffnen und alle Dropdown-Optionen prüfen
- [ ] Test: `audio` auswählen und Clipping speichern
- [ ] Test: AVE-Berechnung für `audio` prüfen
- [ ] Test: Bestehendes Clipping mit `blog` öffnen (falls vorhanden)

### **Phase 4: Migration (Optional)** ⏸️ Optional
- [ ] Siehe `monitoring-types-refactoring.md` - Phase 3

---

## 🔗 Verwandte Dokumente

- `monitoring-types-refactoring.md` - Type-Definitionen Anpassung
- `monitoring-settings-page-refactoring.md` - Settings-Page Umbau
- `publication-type-format-metrics-konzept.md` - Type/Format-Hauptkonzept

---

## ✅ Entscheidungen

1. **Dropdown-Labels:**
   - ✅ `Online (Website/Blog)` - Klarstellung, dass Blogs hier eingeordnet werden
   - ✅ `Audio (Podcast)` - Klarstellung des Medientyps

2. **Icons:**
   - ✅ Print: 📰
   - ✅ Online: 💻
   - ✅ Broadcast: 📺
   - ✅ Audio: 🎧 (Podcast-Icon)

3. **Migration bestehender `blog`-Clippings:**
   - ✅ **Primary:** Migration Script (siehe `monitoring-types-refactoring.md`)
   - ✅ **Fallback:** Graceful Degradation im Modal (Option B)

4. **TypeScript Cast:**
   - ✅ Expliziter Cast: `as 'print' | 'online' | 'broadcast' | 'audio'`

---

## 📝 Code-Beispiele (Vollständig)

### **MarkPublishedModal.tsx - Erstes Dropdown (Zeile 250-254)**

```typescript
{/* Medium/Outlet und Typ - 2-spaltig (nur wenn nicht automatisch gefüllt) */}
{!selectedPublication && (
  <div className="grid grid-cols-2 gap-4">
    <Field>
      <Label>Medium/Outlet</Label>
      <Input
        type="text"
        value={formData.outletName}
        onChange={(e) => setFormData({ ...formData, outletName: e.target.value })}
        placeholder="z.B. Süddeutsche Zeitung"
      />
    </Field>

    <Field>
      <Label>Medientyp</Label>
      <Select
        value={formData.outletType}
        onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
      >
        <option value="print">📰 Print (Zeitung/Magazin)</option>
        <option value="online">💻 Online (Website/Blog)</option>
        <option value="broadcast">📺 Broadcast (TV/Radio)</option>
        <option value="audio">🎧 Audio (Podcast)</option>
      </Select>
    </Field>
  </div>
)}
```

---

### **MarkPublishedModal.tsx - Zweites Dropdown (Zeile 269-273)**

```typescript
{/* Automatisch gefüllte Felder anzeigen */}
{selectedPublication && (
  <div className="grid grid-cols-2 gap-4">
    <Field>
      <Label>Medientyp</Label>
      <Select
        value={formData.outletType}
        onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
        disabled={selectedPublication.source === 'company'}
      >
        <option value="print">📰 Print</option>
        <option value="online">💻 Online</option>
        <option value="broadcast">📺 Broadcast</option>
        <option value="audio">🎧 Podcast</option>
      </Select>
      {selectedPublication.source === 'company' && (
        <Text className="text-xs text-gray-500">
          Automatisch gesetzt basierend auf {selectedPublication.name}
        </Text>
      )}
    </Field>

    <Field>
      <Label>Reichweite</Label>
      <Input
        type="number"
        value={formData.reach}
        onChange={(e) => setFormData({ ...formData, reach: e.target.value })}
        placeholder="z.B. 2500000"
        disabled={!!selectedPublication.reach}
      />
      {selectedPublication.reach && (
        <Text className="text-xs text-gray-500">
          Aus Medienhaus-Daten: {selectedPublication.reach.toLocaleString('de-DE')}
        </Text>
      )}
    </Field>
  </div>
)}
```

---

### **EditClippingModal.tsx - Dropdown (Zeile 128-131)**

```typescript
{/* Medium/Outlet und Medientyp - 2-spaltig */}
<div className="grid grid-cols-2 gap-4">
  <Field>
    <Label>Medium/Outlet</Label>
    <Input
      type="text"
      value={formData.outletName}
      onChange={(e) => setFormData({ ...formData, outletName: e.target.value })}
      placeholder="z.B. Süddeutsche Zeitung"
    />
  </Field>

  <Field>
    <Label>Medientyp</Label>
    <Select
      value={formData.outletType}
      onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
    >
      <option value="print">📰 Print (Zeitung/Magazin)</option>
      <option value="online">💻 Online (Website/Blog)</option>
      <option value="broadcast">📺 Broadcast (TV/Radio)</option>
      <option value="audio">🎧 Audio (Podcast)</option>
    </Select>
  </Field>
</div>
```

---

### **EditClippingModal.tsx - State Init mit Fallback (Zeile 31-40)**

```typescript
const [formData, setFormData] = useState<UpdateClippingFormData>({
  articleUrl: clipping.url || '',
  articleTitle: clipping.title || '',
  outletName: clipping.outletName || '',
  outletType: (
    // ✅ Fallback für alte 'blog' Clippings
    clipping.outletType === 'blog'
      ? 'online'
      : clipping.outletType
  ) as 'print' | 'online' | 'broadcast' | 'audio',
  reach: clipping.reach?.toString() || '',
  sentiment: clipping.sentiment,
  sentimentScore: clipping.sentimentScore || aveSettingsService.getSentimentScoreFromLabel(clipping.sentiment),
  publishedAt: clipping.publishedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
});
```

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
