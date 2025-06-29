🎯 PR-Kampagnen Asset-Integration - Umsetzungsplan
📋 Executive Summary
Die Integration von Mediathek-Assets in PR-Kampagnen wird durch ein intelligentes, kundenzentrisches System realisiert. Der Workflow beginnt mit der Pflicht-Auswahl eines Kunden, zeigt dann nur kundenbezogene Assets an und erstellt automatisch professionelle Share-Links für die Empfänger.
🏗️ Architektur-Übersicht
mermaidgraph TD
    A[PR-Kampagne] -->|1. Pflicht| B[Kunde auswählen]
    B -->|2. Filter| C[Mediathek-Assets]
    C -->|3. Auswahl| D[Asset-Selector]
    D -->|4. Attach| E[Campaign Assets]
    E -->|5. Send| F[Auto Share-Links]
    F -->|6. Track| G[Analytics]
📊 Datenmodell-Erweiterungen
1. PR-Campaign Type erweitern
typescript// src/types/pr.ts - ERWEITERT
export interface PRCampaign {
  // ... existing fields ...
  
  // NEU: Kunden-Zuordnung (Pflichtfeld)
  clientId: string;
  clientName: string; // Denormalisiert für Performance
  
  // NEU: Angehängte Medien
  attachedAssets?: CampaignAssetAttachment[];
  
  // NEU: Generierter Share-Link für alle Assets
  assetShareLinkId?: string;
  assetShareUrl?: string;
}

// NEU: Asset-Attachment mit Metadaten
export interface CampaignAssetAttachment {
  id: string;
  type: 'asset' | 'folder';
  assetId?: string;
  folderId?: string;
  
  // Snapshot der Metadaten zum Zeitpunkt der Zuordnung
  metadata: {
    fileName?: string;
    folderName?: string;
    fileType?: string;
    description?: string;
    
    // Zukünftige Metadaten-Erweiterungen
    copyright?: string;
    author?: string;
    license?: string;
    expiryDate?: Date;
    usage?: {
      allowPrint?: boolean;
      allowDigital?: boolean;
      allowSocial?: boolean;
      restrictions?: string;
    };
  };
  
  // Tracking
  attachedAt: Timestamp;
  attachedBy: string;
}
2. Share-Link Erweiterung für Kampagnen
typescript// src/types/media.ts - ERWEITERT
export interface ShareLink {
  // ... existing fields ...
  
  // NEU: Kampagnen-Kontext
  context?: {
    type: 'pr_campaign' | 'direct_share';
    campaignId?: string;
    campaignTitle?: string;
  };
  
  // NEU: Multi-Asset Support
  targetIds?: string[]; // Mehrere Assets/Ordner
  assetCount?: number;
}
🎨 UI/UX Konzept
Workflow für neue Kampagne
1. Kunde auswählen (Pflicht)
   ├── Dropdown mit allen Kunden
   ├── Schnellsuche
   └── "Neuer Kunde" Button

2. Kampagnen-Details
   ├── Titel
   ├── Content (Rich-Text)
   └── KI-Assistent

3. Medien anhängen (NEU)
   ├── Tab: "Kunden-Assets"
   ├── Tab: "Kunden-Ordner"  
   ├── Tab: "Ausgewählte Medien"
   └── Metadaten-Vorschau

4. Versand-Optionen
   ├── Share-Link Einstellungen
   ├── Download erlauben?
   └── Ablaufdatum
Asset-Selector Component
typescript// src/components/pr/AssetSelector.tsx
interface AssetSelectorProps {
  clientId: string;
  selectedAssets: CampaignAssetAttachment[];
  onAssetsChange: (assets: CampaignAssetAttachment[]) => void;
  
  // Für zukünftige Erweiterungen
  metadataFields?: string[]; // Welche Metadaten anzeigen
  filterOptions?: AssetFilterOptions;
}
🔧 Implementierungs-Schritte
Phase 1: Datenmodell & Backend (2 Tage)
1.1 Campaign Service erweitern
typescript// src/lib/firebase/pr-service.ts - ERWEITERT
export const prService = {
  // ... existing methods ...
  
  async attachAssets(
    campaignId: string, 
    assets: CampaignAssetAttachment[]
  ): Promise<void> {
    // Assets zur Kampagne hinzufügen
    // Metadaten-Snapshot erstellen
  },
  
  async createCampaignShareLink(
    campaign: PRCampaign
  ): Promise<ShareLink> {
    // Multi-Asset Share-Link erstellen
    // Mit Kampagnen-Kontext
  },
  
  async getCampaignAssets(
    campaignId: string
  ): Promise<{
    assets: MediaAsset[];
    folders: MediaFolder[];
    metadata: Map<string, any>;
  }> {
    // Alle Assets mit aktuellen + historischen Metadaten
  }
};
1.2 Neue API-Routes
typescript// src/app/api/pr/campaign-assets/route.ts
// Endpoints für Asset-Management in Kampagnen

// src/app/api/pr/asset-preview/route.ts  
// Preview-Generation für E-Mail-Anhänge
Phase 2: UI-Komponenten (3 Tage)
2.1 Customer-First Workflow
typescript// src/components/pr/CustomerSelector.tsx
export function CustomerSelector({
  value,
  onChange,
  required = true
}: {
  value: string;
  onChange: (customerId: string, customerName: string) => void;
  required?: boolean;
}) {
  // Kunde als erstes auswählen
  // Mit Validierung
  // Quick-Add neuer Kunde
}
2.2 Asset-Selector mit Tabs
typescript// src/components/pr/AssetSelector.tsx
export function AssetSelector() {
  return (
    <Tabs>
      <Tab name="assets">
        <AssetGrid 
          clientId={clientId}
          onSelect={handleAssetSelect}
          selectedIds={selectedAssetIds}
        />
      </Tab>
      
      <Tab name="folders">
        <FolderTree
          clientId={clientId}
          onSelect={handleFolderSelect}
          selectedIds={selectedFolderIds}
        />
      </Tab>
      
      <Tab name="selected">
        <SelectedAssetsList
          assets={selectedAssets}
          onRemove={handleRemove}
          onMetadataEdit={handleMetadataEdit}
        />
      </Tab>
    </Tabs>
  );
}
2.3 Metadaten-Editor
typescript// src/components/pr/AssetMetadataEditor.tsx
export function AssetMetadataEditor({
  asset,
  metadata,
  onChange
}: {
  asset: MediaAsset;
  metadata: CampaignAssetAttachment['metadata'];
  onChange: (metadata: any) => void;
}) {
  // Aktuelle + zukünftige Metadaten
  // Copyright, Nutzungsrechte, etc.
  // Inline-Editing
}
Phase 3: Share-Link Integration (2 Tage)
3.1 Multi-Asset Share Pages
typescript// src/app/share/campaign/[shareId]/page.tsx
export default function CampaignSharePage() {
  // Professionelle Galerie-Ansicht
  // Kampagnen-Kontext anzeigen
  // Download-Controls
  // Metadaten-Anzeige
}
3.2 E-Mail Integration
typescript// src/components/pr/EmailSendModal.tsx - ERWEITERT
// Automatisch Share-Link in E-Mail einfügen
// Preview der angehängten Assets
// Download-Instructions
Phase 4: Analytics & Tracking (1 Tag)
typescript// Asset-Zugriffe tracken
// Download-Statistiken
// Populäre Assets identifizieren
// Rechteverletzungen erkennen
🎯 Konkrete Features
1. Smart Asset Discovery

Auto-Suggest: Zeige relevante Assets basierend auf Kampagnen-Titel
Recent Assets: Zuletzt hochgeladene Assets des Kunden
Popular Assets: Meistgenutzte Assets in PR-Kampagnen
Asset-Sets: Vordefinierte Asset-Gruppen (z.B. "Logo-Paket")

2. Metadaten-Management
typescriptinterface AssetMetadata {
  // Basis (heute)
  fileName: string;
  description: string;
  tags: string[];
  
  // Phase 2 (in 2 Monaten)
  copyright: {
    owner: string;
    year: number;
    license: 'CC0' | 'CC-BY' | 'Copyright' | 'Custom';
    restrictions?: string;
  };
  
  author: {
    name: string;
    email?: string;
    company?: string;
  };
  
  usage: {
    allowedUses: ('print' | 'digital' | 'social' | 'broadcast')[];
    geography?: string[]; // ['DE', 'AT', 'CH']
    validUntil?: Date;
    creditsRequired: boolean;
    creditsText?: string;
  };
  
  technical: {
    dimensions?: { width: number; height: number };
    resolution?: number; // DPI
    colorSpace?: string;
    fileSize: number;
  };
}
3. Asset-Pakete
typescriptinterface AssetPackage {
  id: string;
  name: string; // "Produkt-Launch-Paket"
  description: string;
  clientId: string;
  
  contents: {
    assets: string[];
    folders: string[];
    
    // Vordefinierte Struktur
    structure: {
      'logos': string[]; // Asset-IDs
      'products': string[];
      'team': string[];
      'infographics': string[];
    };
  };
  
  // Automatische Updates
  rules?: {
    autoInclude?: {
      tags?: string[];
      fileTypes?: string[];
      folderIds?: string[];
    };
  };
}
4. PR-spezifische Features
Presse-Mappe Generator
typescriptasync function generatePressKit(campaign: PRCampaign): Promise<{
  coverLetter: string; // Personalisiert
  pressRelease: string; // Campaign Content
  assets: {
    highRes: MediaAsset[];
    webRes: MediaAsset[];
    logos: MediaAsset[];
  };
  metadata: {
    contact: SenderInfo;
    embargo?: Date;
    copyright: string;
  };
  downloadUrl: string; // ZIP-Download
}>;
Asset-Vorschau in E-Mail
html<!-- E-Mail Template -->
<div class="asset-preview">
  <h3>Bildmaterial zur Pressemitteilung</h3>
  
  <div class="asset-grid">
    <!-- Erste 4 Assets als Preview -->
    <img src="asset1_thumb.jpg" alt="Preview 1">
    <img src="asset2_thumb.jpg" alt="Preview 2">
    <img src="asset3_thumb.jpg" alt="Preview 3">
    <div class="more-assets">+12 weitere</div>
  </div>
  
  <a href="{{shareLink}}" class="cta-button">
    Alle Medien ansehen & herunterladen
  </a>
  
  <p class="copyright-notice">
    © 2025 {{company}}. Nutzung nur für redaktionelle Zwecke.
  </p>
</div>
🔒 Sicherheit & Compliance
1. Rechteverwaltung

Wasserzeichen: Automatisch für Preview-Versionen
Download-Limits: Max. Downloads pro Empfänger
Zeitliche Begrenzung: Auto-Expire nach X Tagen
Geo-Blocking: Nur bestimmte Länder

2. Audit-Trail
typescriptinterface AssetAccessLog {
  assetId: string;
  campaignId: string;
  recipientEmail: string;
  action: 'view' | 'download' | 'share';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  
  // Compliance
  consentGiven: boolean;
  usageAgreed: boolean;
}
📱 Mobile Considerations
Progressive Web App Features

Offline Asset-Auswahl: Zuletzt angesehene Assets cachen
Mobile Upload: Direkt von Kamera zu Kampagne
Share-Extension: Assets aus anderen Apps teilen

🚀 Implementierungs-Roadmap
Woche 1: Foundation

 Datenmodell erweitern
 Customer-First UI
 Basis Asset-Selector

Woche 2: Integration

 Share-Link Multi-Asset
 E-Mail-Template Update
 Asset-Preview Component

Woche 3: Polish

 Metadaten-Editor
 Asset-Pakete
 Analytics-Integration

Woche 4: Advanced

 Presse-Mappe Generator
 Rechteverwaltung
 Mobile Optimierung

🎉 Vision: Der perfekte PR-Workflow

Kampagne starten: "Neue Produkteinführung für Kunde XYZ"
KI generiert Text: Perfekte Pressemitteilung in Sekunden
Assets automatisch vorgeschlagen: Relevante Produkt-Bilder, Logos
Ein-Klick Presse-Mappe: Alles perfekt verpackt
Personalisierte Links: Jeder Journalist bekommt seinen Link
Live-Tracking: Sehen wer welche Bilder nutzt
Auto-Follow-Up: KI erinnert bei hohem Interesse

Das macht SKAMP zur ultimativen PR-Plattform für moderne Marketing-Teams! 🚀