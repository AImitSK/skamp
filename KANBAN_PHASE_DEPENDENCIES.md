# Kanban-Phase Abhängigkeiten in der Projektdetailseite

## Übersicht
Die Projektdetailseite (`src/app/dashboard/projects/[projectId]/page.tsx`) und zugehörige Komponenten zeigen verschiedene Inhalte abhängig von der aktuellen Kanban-Phase (`currentStage`) des Projekts. Diese Abhängigkeiten müssen entfernt werden, um eine konsistente Darstellung unabhängig von der Phase zu gewährleisten.

## Gefundene Phase-Abhängigkeiten

### 1. **Pressemeldung-Section (Zeilen 821-911)**
**Problem:** Die Pressemeldung-Section wird immer angezeigt, ABER der Inhalt ist abhängig davon, ob linkedCampaigns vorhanden sind.

**Aktuelle Implementierung:**
- Die Section zeigt "Keine Kampagne verknüpft" wenn `linkedCampaigns.length === 0`
- Zeigt erweiterte Kampagnen-Details nur wenn `linkedCampaigns.length > 0`
- Actions (Freigabe-Seite, Link kopieren, PDF, Historie) werden nur bei verknüpften Kampagnen angezeigt

**Erwartetes Verhalten:**
- Die Pressemeldung-Section sollte immer vollständig angezeigt werden
- Unabhängig von der aktuellen Phase sollten alle relevanten Informationen sichtbar sein

### 2. **Planungs-Tab Ordnerstruktur (Zeile 684-696)**
**Problem:** Der Planungs-Tab zeigt die `ProjectFoldersView` Komponente, die möglicherweise unterschiedliche Ordnerstrukturen je nach Phase anzeigt.

**Aktuelle Implementierung:**
```tsx
{activeTab === 'planning' && (
  <div className="space-y-6">
    <ProjectFoldersView
      projectId={project.id!}
      organizationId={currentOrganization.id}
      projectFolders={projectFolders}
      foldersLoading={foldersLoading}
      onRefresh={loadProjectFolders}
      clientId={project.customer?.id || ''}
    />
  </div>
)}
```

**Analyse der ProjectFoldersView:**
- Die Komponente selbst hat KEINE direkten Phase-Abhängigkeiten
- Die Ordnerstruktur wird basierend auf `projectFolders` Prop angezeigt
- ABER: Die Daten in `projectFolders` könnten vom Backend abhängig von der Phase unterschiedlich sein

### 3. **Pipeline Progress Dashboard (Zeilen 513-536)**
**Problem:** Zeigt den Fortschritt basierend auf `currentStage`

**Aktuelle Implementierung:**
- Verwendet `project.currentStage` zur Anzeige der aktuellen Phase
- Zeigt unterschiedliche Fortschrittsindikatoren je nach Phase

### 4. **Monitoring Tab (Zeilen 633-681)**
**Problem:** MonitoringStatusWidget und MonitoringConfigPanel verwenden `currentStage`

**Aktuelle Implementierung:**
```tsx
<MonitoringStatusWidget
  projectId={project?.id || ''}
  currentStage={project.currentStage}  // <-- Phase-Abhängigkeit
  isEnabled={true}
  // ...
/>
```

### 5. **Implizite Abhängigkeiten**

#### a) Datenlade-Logik
- `loadProjectFolders()` könnte unterschiedliche Ordner basierend auf der Phase laden
- `loadStrategyDocuments()` könnte phasenabhängige Dokumente filtern

#### b) Backend-Services
- `projectService.getProjectFolderStructure()` könnte phasenabhängige Strukturen zurückgeben
- Verknüpfte Kampagnen werden möglicherweise nur in bestimmten Phasen geladen

## Empfohlene Änderungen

### 1. Pressemeldung-Section
- Immer alle Kampagnen-Informationen anzeigen
- Platzhalter/Default-Werte verwenden wenn keine Kampagne verknüpft ist
- Alle Actions immer verfügbar machen (ggf. mit disabled state)

### 2. Planungs-Tab
- Sicherstellen, dass die Ordnerstruktur immer vollständig geladen wird
- Keine phasenabhängigen Filter in der Ordneranzeige

### 3. Pipeline Progress Dashboard
- Als optionale Information beibehalten, aber nicht zur Einschränkung von Features nutzen
- Nur zur Visualisierung, nicht zur Logik verwenden

### 4. Monitoring Tab
- `currentStage` Parameter entfernen oder optional machen
- Monitoring sollte in allen Phasen verfügbar sein

### 5. Backend-Services anpassen
- Alle Services sollten immer alle Daten zurückgeben
- Keine phasenabhängigen Filter auf Service-Ebene

## Betroffene Dateien

1. **Hauptdatei:**
   - `src/app/dashboard/projects/[projectId]/page.tsx`

2. **Komponenten:**
   - `src/components/projects/ProjectFoldersView.tsx`
   - `src/components/projects/workflow/PipelineProgressDashboard.tsx`
   - `src/components/projects/monitoring/MonitoringStatusWidget.tsx`
   - `src/components/projects/monitoring/MonitoringConfigPanel.tsx`

3. **Services:**
   - `src/lib/firebase/project-service.ts`
   - `src/lib/firebase/strategy-document-service.ts`

4. **Hooks:**
   - `src/hooks/useDragAndDrop.ts`
   - `src/hooks/useBoardRealtime.ts`

## Nächste Schritte

1. **Phase 1:** UI-Komponenten anpassen
   - Alle bedingten Renderings basierend auf `currentStage` entfernen
   - Default-Werte für fehlende Daten bereitstellen

2. **Phase 2:** Service-Layer überprüfen
   - Backend-Services auf phasenabhängige Filter prüfen
   - Sicherstellen, dass alle Daten immer verfügbar sind

3. **Phase 3:** Testing
   - Tests für alle Phasen durchführen
   - Sicherstellen, dass alle Features in jeder Phase funktionieren

## Hinweise

- Die `currentStage` Information kann weiterhin zur **Anzeige** des aktuellen Status verwendet werden
- Sie sollte jedoch NICHT zur **Einschränkung** von Funktionalitäten genutzt werden
- Alle Features sollten in allen Phasen zugänglich sein