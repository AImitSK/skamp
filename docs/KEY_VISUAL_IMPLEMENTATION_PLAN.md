# 🎯 Key Visual Media Library Extension - Implementierungsplan

## 📋 Aktueller Status: IN ARBEIT
**Start:** 15.08.2025  
**Fortschritt:** 5/7 Aufgaben erledigt (71%)

## ✅ Bereits erledigt:
1. ✅ **KeyVisualCropper Component** (`src/components/ui/key-visual-cropper.tsx`)
   - 16:9 Aspect Ratio für Key Visuals
   - Separater Component, ImageCropper bleibt bei 1:1 für Profilbilder
   - Export von File UND cropData für spätere Wiederverwendung
   - 1920x1080 Output-Größe (Full HD)

2. ✅ **KeyVisualSection Component** (`src/components/campaigns/KeyVisualSection.tsx`)
   - 16:9 Platzhalter mit Hover-Effekt
   - Integration mit AssetSelectorModal
   - Direkter Upload-Support
   - Edit/Remove Funktionalität
   - Firebase Storage Upload

## 📝 TODO-Liste (als Nächstes):

### 3. ✅ **AssetSelectorModal erweitert**
**Datei:** `src/components/campaigns/AssetSelectorModal.tsx`
- ✅ Upload-Button hinzugefügt in Modal Header
- ✅ Integration mit UploadModal (lazy loaded)
- ✅ Nach Upload: Automatische Medien-Reload
- ✅ Modus-Switch: "single" für Key Visual, "multiple" für Anhänge

### 4. ✅ **Campaign-Datenmodell erweitert**
**Datei:** `src/types/pr.ts`
- ✅ KeyVisualData Interface erstellt
- ✅ PRCampaign um keyVisual erweitert
- ✅ CropData für spätere Bearbeitung speicherbar

### 5. ✅ **Integration in Campaign Editor Pages**
**Dateien:** 
- ✅ `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`
- ✅ `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`
- ✅ KeyVisualSection nach Editor, vor Anhängen positioniert
- ✅ KeyVisual in create/update Daten integriert

### 5.1 🔧 **Multi-Tenancy Kompatibilitätsproblem behoben**
**Problem:** Key Visual und Media Library verwendeten unterschiedliche Organization IDs
- **Key Visual:** `organizationId` (echte Organization ID: `wVa3cJ7Y...`)
- **Media Library:** `legacyUserId` (Legacy User ID: `XXHOADV6...`)
- **Auswirkung:** Assets wurden in verschiedenen "Silos" gespeichert und nicht zusammen angezeigt

**Lösung (15.08.2025):**
- ✅ **Firebase Storage Pfad** auf Legacy User ID umgestellt: `organizations/{userId}/media/`
- ✅ **AssetSelectorModal organizationId** auf `userId` Parameter geändert
- ✅ **Storage Rules Limit** auf 50MB erhöht für große Key Visual Dateien
- ✅ **Deduplizierung** auf Asset-ID basis statt fileName für eindeutige Assets

**Technischer Debt:** 
- Media Library System nutzt Legacy User IDs als Organization IDs (funktional aber architektonisch unsauber)
- 23+ andere Media Library Integrationen verwenden weiterhin Legacy System
- Für zukünftige Refactoring: Einheitliche Organization ID Struktur implementieren

### 6. ⏳ **E-Mail Template anpassen**
**Dateien:**
- `src/components/pr/email/Step3Preview.tsx` 
- `src/lib/email/templates/*`

**HTML-Template Struktur:**
```html
<!-- Key Visual über Headline -->
<img src="{keyVisual.url}" 
     alt="{campaignTitle}" 
     style="width: 100%; max-width: 600px; height: auto; display: block; margin-bottom: 20px;"
/>
<!-- Dann Headline -->
<h1>{campaignTitle}</h1>
```

### 7. ⏳ **Firebase Service Update**
**Datei:** `src/lib/firebase/pr-service.ts`
- [ ] create() Method: keyVisual speichern
- [ ] update() Method: keyVisual updaten
- [ ] getById() Method: keyVisual laden

### 8. ⏳ **Tests schreiben**
**Neue Test-Datei:** `src/__tests__/key-visual-feature.test.tsx`
- [ ] KeyVisualSection Component Tests
- [ ] KeyVisualCropper Tests
- [ ] Integration Tests mit Campaign Editor
- [ ] Upload & Storage Tests

## 🎨 Design-Entscheidungen:

### Positionierung:
- **Im Editor:** NACH dem Haupttext (User weiß dann besser welches Bild passt)
- **In der Ausgabe:** ÜBER der Headline (visueller Aufmacher)
- **Optional:** Kein Key Visual = Headline startet direkt

### Technische Details:
- **Crop-Tool:** Basiert auf react-image-crop (bereits im Projekt)
- **Aspect Ratio:** 16:9 fest (kein 1:1 oder 9:16)
- **Storage:** Firebase Storage in `/key-visuals/{organizationId}/`
- **Größe:** 1920x1080 optimiert, max 10MB Upload

### User Flow:
1. User schreibt Text
2. Überlegt welches Bild passt
3. Klickt auf Key Visual Platzhalter
4. Wählt aus Media Library ODER lädt neu hoch
5. Croppt auf 16:9
6. Sieht Preview
7. Kann jederzeit ändern oder entfernen

## 🚨 Wichtige Hinweise:

### NICHT VERGESSEN:
- ImageCropper (1:1) MUSS für Profilbilder funktionieren bleiben
- KeyVisualCropper (16:9) ist SEPARATER Component
- Anhänge bleiben separate Funktion (für Download-Links)
- Key Visual ist NUR visuell, nicht zum Download

### Integration Points:
- Campaign Create/Edit Pages
- E-Mail Preview
- E-Mail Send Modal
- PDF Export (später)
- Freigabe-Ansicht

## 📊 Fortschritts-Tracking:

```
[##############------] 71% Complete
✅ KeyVisualCropper Component
✅ KeyVisualSection Component  
✅ AssetSelectorModal Extension
✅ Data Model Update
✅ Page Integration
⏳ Email Template
⏳ Tests
```

## 🔄 Nächste Schritte:

1. ✅ **ERLEDIGT:** AssetSelectorModal mit Upload-Button erweitert
2. ✅ **ERLEDIGT:** Datenmodell in pr.ts erweitert
3. ✅ **ERLEDIGT:** In new/edit Pages integriert
4. **JETZT:** E-Mail Template anpassen
5. **DANN:** Tests schreiben
6. **FERTIG:** Masterplan aktualisieren

---

**Letzte Aktualisierung:** 15.08.2025 - 15:00
**Status:** IN ARBEIT - 5/7 Tasks erledigt
**Nächster Task:** E-Mail Template anpassen