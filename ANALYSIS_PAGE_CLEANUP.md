# Phase 3.5: page.tsx Cleanup Analyse

## PROBLEM: Massive State-Duplikation nach Phase 3

Nach Phase 3 (Hook-Integration) haben wir:
- ✅ CampaignContext mit 14 States erstellt
- ✅ Alle 4 Tabs verwenden useCampaign() Hook
- ❌ **page.tsx hat NOCH ALLE lokalen States**
- ❌ **Doppelte Datenladung**: Context UND page.tsx laden Campaign

---

## DUPLIKATE: States existieren SOWOHL in Context ALS AUCH in page.tsx

### Content States (im Context vorhanden):
1. `campaignTitle` (Zeile 165) → Context: campaignTitle
2. `editorContent` (Zeile 167) → Context: editorContent  
3. `pressReleaseContent` (Zeile 166) → Context: pressReleaseContent
4. `keywords` (Zeile 317) → Context: keywords

### Asset & Visual States (im Context vorhanden):
5. `boilerplateSections` (Zeile 168) → Context: boilerplateSections
6. `attachedAssets` (Zeile 169) → Context: attachedAssets
7. `keyVisual` (Zeile 170) → Context: keyVisual

### Company & Project States (im Context vorhanden):
8. `selectedCompanyId` (Zeile 146) → Context: selectedCompanyId
9. `selectedCompanyName` (Zeile 147) → Context: selectedCompanyName
10. `selectedProjectId` (Zeile 181) → Context: selectedProjectId

### Approval States (im Context vorhanden):
11. `approvalData` (Zeile 171) → Context: approvalData
12. `previousFeedback` (Zeile 187) → Context: previousFeedback

### Template States (im Context vorhanden):
13. `selectedTemplateId` (Zeile 178) → Context: selectedTemplateId

### Computed/Derived States:
14. `finalContentHtml` (Zeile 320) → PreviewTab berechnet mit useMemo
15. `currentPdfVersion` (Zeile 142) → Context: currentPdfVersion
16. `generatingPdf` (Zeile 141) → Context: generatingPdf

**TOTAL: 16 DUPLIKATE** die entfernt werden können!

---

## VERWENDUNG der Duplikate in page.tsx

### loadData() Funktion (Zeile 607-748):
Lädt Campaign-Daten und setzt **ALLE** lokalen States:
- setCampaignTitle(campaign.title)
- setPressReleaseContent(campaign.contentHtml)
- setEditorContent(campaign.mainContent)
- setKeywords(campaign.keywords)
- setSelectedCompanyId(campaign.clientId)
- setSelectedCompanyName(campaign.clientName)
- setSelectedProjectId(campaign.projectId)
- setAttachedAssets(campaign.attachedAssets)
- setKeyVisual(campaign.keyVisual)
- setBoilerplateSections(convertedSections)
- setApprovalData(campaign.approvalData)
- setPreviousFeedback(campaign.approvalData.feedbackHistory)

**PROBLEM: Context.loadCampaign() macht das GLEICHE!**

### handleSubmit() Funktion (Zeile 751-890):
Verwendet lokale States zum Speichern:
- campaignTitle
- editorContent
- pressReleaseContent
- boilerplateSections
- keyVisual
- attachedAssets
- keywords
- approvalData

### Andere Verwendungen:
- generateContentHtml() - verwendet editorContent, boilerplateSections
- handleAiGenerate() - setzt campaignTitle, editorContent, pressReleaseContent
- useEffect PR-Score - verwendet campaignTitle, editorContent, keywords
- handleRemoveAsset() - verwendet attachedAssets

---

## STATES DIE BLEIBEN SOLLTEN (page-spezifisch)

### Loading States:
- `isLoadingCampaign` - lokales Loading für page.tsx
- `saving` - Submit-Operation
- ✅ Context hat bereits: `loading`, `saving`, `generatingPdf`

### Distribution States (NICHT im Context):
- `availableLists` - Liste aller Verteiler
- `selectedListIds` - Ausgewählte Listen-IDs
- `selectedListNames` - Ausgewählte Listen-Namen
- `listRecipientCount` - Anzahl Empfänger
- `manualRecipients` - Manuelle Empfänger
**→ Diese gehören zur Distribution-Logik, nicht Campaign-Content**

### Project States (teilweise):
- `selectedProject` - **Vollständiges Project-Objekt** (Context hat nur ID)
- `dokumenteFolderId` - KI-Context-Ordner
**→ selectedProject sollte evtl. in Context**

### Migration States (UI-spezifisch):
- `showMigrationDialog`
- `migrationAssetCount`
- `pendingProjectId`
- `pendingProject`
- `isMigrating`

### UI States:
- `showAssetSelector`
- `showAiModal`

### Pipeline States (möglicherweise veraltet):
- `pdfWorkflowPreview` - wird in ApprovalTab berechnet?
- `approvalWorkflowResult`
- `projectApproval`
- `pipelineApprovalStatus`

### Andere:
- `campaignAdmin` - Team Member Info
- `realPrScore` - PR-Score Berechnung (sollte in Context/ContentTab?)

---

## LÖSUNG: Refactoring-Plan

### Phase 3.5: State-Cleanup & Context-Integration in page.tsx

#### 1. Context erweitern (falls nötig):
- `selectedProject` hinzufügen? (vollständiges Objekt)
- `dokumenteFolderId` hinzufügen?
- `campaignAdmin` hinzufügen?
- `seoScore` bereits vorhanden ✅

#### 2. page.tsx Duplikate entfernen:
**Entfernen** (alle Content/Campaign States):
- [x] campaignTitle + setCampaignTitle
- [x] editorContent + setEditorContent
- [x] pressReleaseContent + setPressReleaseContent
- [x] keywords + setKeywords
- [x] boilerplateSections + setBoilerplateSections
- [x] attachedAssets + setAttachedAssets
- [x] keyVisual + setKeyVisual
- [x] selectedCompanyId + setSelectedCompanyId
- [x] selectedCompanyName + setSelectedCompanyName
- [x] selectedProjectId + setSelectedProjectId
- [x] approvalData + setApprovalData
- [x] previousFeedback + setPreviousFeedback
- [x] selectedTemplateId + setSelectedTemplateId
- [x] finalContentHtml + setFinalContentHtml
- [x] currentPdfVersion + setCurrentPdfVersion
- [x] generatingPdf + setGeneratingPdf

#### 3. loadData() refactoren:
**OPTION A: loadData() komplett entfernen**
- Context.loadCampaign() macht Campaign-Loading
- page.tsx lädt nur Distribution Lists + Project Details

**OPTION B: loadData() minimal halten**
- Nur Distribution-spezifische Daten laden
- Context kümmert sich um Campaign-Daten

#### 4. handleSubmit() refactoren:
- Context-States statt lokale States verwenden
- Oder: saveCampaign() im Context implementieren

#### 5. Handler anpassen:
- generateContentHtml() → nutzt Context-States
- handleAiGenerate() → nutzt Context updateTitle(), updateEditorContent()
- handleRemoveAsset() → nutzt Context removeAsset() ✅ (bereits vorhanden!)

---

## ERWARTETE ERGEBNISSE

### Code-Reduktion:
- **~16 useState Declarations entfernt**
- **~100-150 Zeilen Code reduziert**
- **loadData() vereinfacht oder entfernt**

### Vorteile:
- ✅ Keine State-Duplikation mehr
- ✅ Single Source of Truth (Context)
- ✅ Keine doppelte Datenladung
- ✅ Einfacheres State Management
- ✅ Bessere Konsistenz zwischen Tabs und page.tsx

### Risiken:
- ⚠️ Müssen sicherstellen, dass Context ALLE Daten hat
- ⚠️ Müssen loadData() Logik korrekt aufteilen
- ⚠️ Distribution States bleiben in page.tsx (ist OK)

---

## NÄCHSTE SCHRITTE

1. **Analyse abschließen** ✅
2. **User fragen**: Sollen wir Phase 3.5 machen?
3. **Context erweitern** (selectedProject, dokumenteFolderId)
4. **page.tsx refactoren**
5. **Tests durchführen**
6. **Commit erstellen**
