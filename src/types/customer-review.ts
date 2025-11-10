/**
 * TypeScript-Typen für das Customer-Freigabe-Toggle-System
 * 
 * Dieses Modul definiert alle Typen für das Toggle-basierte Interface
 * zur Kundenfreigabe von PDF-Kampagnen.
 */

import { ReactNode } from 'react';

// Import für Icon-Component Type
import { ForwardRefExoticComponent, SVGProps, RefAttributes } from 'react';

type HeroIcon = ForwardRefExoticComponent<Omit<SVGProps<SVGSVGElement>, "ref"> & { title?: string | undefined; titleId?: string | undefined; } & RefAttributes<SVGSVGElement>>;

// Basis-Props für alle Toggle-Boxen
export interface ToggleBoxProps {
  /** Eindeutige ID der Toggle-Box */
  id: string;
  /** Titel der Toggle-Box */
  title: string;
  /** Beschreibung oder Untertitel */
  subtitle?: string;
  /** Anzahl der Elemente (für Badge-Anzeige) */
  count?: number;
  /** Kinder-Elemente */
  children?: ReactNode;
  /** Standardmäßig geöffnet */
  defaultOpen?: boolean;
  /** Icon für die Toggle-Box (Heroicons /24/outline) */
  icon?: HeroIcon;
  /** Icon-Farbe */
  iconColor?: string;
  /** Aktueller Toggle-Status */
  isExpanded: boolean;
  /** Callback beim Toggle-Klick */
  onToggle: (id: string) => void;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Organisations-ID für Multi-Tenancy */
  organizationId: string;
  /** Ob die Box deaktiviert ist */
  disabled?: boolean;
  /** Zusätzliche Inhalte im Header */
  headerActions?: ReactNode;
}

// Props für Medien-Toggle-Box
export interface MediaToggleBoxProps extends ToggleBoxProps {
  /** Liste der angezeigten Medien */
  mediaItems: MediaItem[];
  /** Callback für Medien-Auswahl */
  onMediaSelect?: (mediaId: string) => void;
  /** Ausgewählte Medien-IDs */
  selectedMediaIds?: string[];
  /** Maximale Anzahl anzuzeigender Medien */
  maxDisplayCount?: number;
}

// Props für PDF-Historie-Toggle-Box
export interface PDFHistoryToggleBoxProps extends ToggleBoxProps {
  /** Liste der PDF-Versionen */
  pdfVersions: PDFVersion[];
  /** Aktuelle PDF-Version */
  currentVersionId?: string;
  /** Callback für Versions-Auswahl */
  onVersionSelect?: (versionId: string) => void;
  /** Ob Download-Buttons angezeigt werden */
  showDownloadButtons?: boolean;
}

// Props für Kommunikations-Toggle-Box
export interface CommunicationToggleBoxProps extends ToggleBoxProps {
  /** Liste der Kommunikationselemente */
  communications: CommunicationItem[];
  /** Callback für neue Nachricht */
  onNewMessage?: () => void;
  /** Ob neue Nachrichten erlaubt sind */
  allowNewMessages?: boolean;
  /** Ungelesene Nachrichten-Anzahl */
  unreadCount?: number;
  /** Letzte Nachricht für Hervorhebung */
  latestMessage?: CommunicationItem;
  /** Callback für Antwort */
  onReply?: (communication: CommunicationItem) => void;
}

// Props für Entscheidungs-Toggle-Box
export interface DecisionToggleBoxProps extends ToggleBoxProps {
  /** Callback für Freigabe */
  onApprove?: () => void;
  /** Callback für Ablehnung */
  onReject?: () => void;
  /** Callback für Änderungsanforderung */
  onRequestChanges?: (comment: string) => void;
  /** Aktuelle Entscheidung */
  decision?: CustomerDecision;
  /** Callback für Entscheidungsänderung */
  onDecisionChange?: (decision: CustomerDecision) => void;
  /** Verfügbare Entscheidungsoptionen */
  availableDecisions?: DecisionType[];
  /** Deadline für Entscheidung */
  deadline?: Date;
  /** Text für Freigabe-Button */
  approveButtonText?: string;
  /** Text für Ablehnungs-Button */
  rejectButtonText?: string;
  /** Text für Änderungs-Button */
  requestChangesButtonText?: string;
}

// State-Management für Toggle-System
export interface ToggleState {
  /** Map der erweiterten Toggle-Boxen */
  expandedToggles: Record<string, boolean>;
  /** Aktive/fokussierte Toggle-Box */
  activeToggle?: string;
  /** Lade-Status */
  isLoading: boolean;
  /** Fehler-Status */
  error?: string;
}

// Toggle-Aktionen
export interface ToggleActions {
  /** Toggle-Box erweitern/minimieren */
  toggleBox: (id: string) => void;
  /** Alle Toggle-Boxen erweitern */
  expandAll: () => void;
  /** Alle Toggle-Boxen minimieren */
  collapseAll: () => void;
  /** Toggle-Status zurücksetzen */
  resetToggleState: () => void;
  /** Fokus setzen */
  setActiveToggle: (id?: string) => void;
}

// Medien-Element für Media-Toggle
export interface MediaItem {
  /** Eindeutige Medien-ID */
  id: string;
  /** Dateiname */
  filename: string;
  /** Legacy: Name (alias für filename) */
  name?: string;
  /** MIME-Type */
  mimeType: string;
  /** Dateigröße in Bytes */
  size: number;
  /** URL zur Datei */
  url: string;
  /** Thumbnail-URL (optional) */
  thumbnailUrl?: string;
  /** Upload-Datum */
  uploadedAt: Date;
  /** Uploader-Info */
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  /** Organisations-ID */
  organizationId: string;
  /** Zusätzliche Metadaten */
  metadata?: Record<string, any>;
}

// PDF-Version für History-Toggle
export interface PDFVersion {
  /** Version-ID */
  id: string;
  /** Versions-Nummer/Name */
  version: string;
  /** PDF-URL */
  pdfUrl: string;
  /** Erstellungsdatum */
  createdAt: Date;
  /** Ersteller-Info */
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  /** Dateigröße */
  fileSize: number;
  /** Änderungskommentar */
  changeComment?: string;
  /** Kommentar zur Version */
  comment?: string;
  /** Ob es die aktuelle Version ist */
  isCurrent: boolean;
  /** Kampagnen-ID */
  campaignId: string;
  /** Organisations-ID */
  organizationId: string;
  /** Status der PDF-Version */
  status?: 'draft' | 'pending_customer' | 'approved' | 'rejected';
  /** Zusätzliche Metadaten */
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    fileType?: string;
    [key: string]: any;
  };
}

// Kommunikations-Element
export interface CommunicationItem {
  /** Nachrichten-ID */
  id: string;
  /** Nachrichtentyp */
  type: 'comment' | 'feedback' | 'question' | 'approval_request';
  /** Nachrichteninhalt */
  content: string;
  /** Legacy: Nachrichteninhalt (alias für content) */
  message?: string;
  /** Absender-Info */
  sender: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'agency' | 'admin';
  };
  /** Legacy: Absender Name (alias für sender.name) */
  senderName?: string;
  /** Legacy: Absender Avatar */
  senderAvatar?: string;
  /** Empfänger-Info */
  recipient?: {
    id: string;
    name: string;
    email: string;
  };
  /** Erstellungsdatum */
  createdAt: Date;
  /** Ob gelesen */
  isRead: boolean;
  /** Kampagnen-ID */
  campaignId: string;
  /** Organisations-ID */
  organizationId: string;
  /** Anhänge */
  attachments?: MediaItem[];
  /** Antwort auf andere Nachricht */
  replyTo?: string;
  /** Flag für manuelle Freigabe durch Team-Member */
  manualApproval?: boolean;
}

// Kunden-Entscheidung
export interface CustomerDecision {
  /** Entscheidungs-ID */
  id: string;
  /** Entscheidungstyp */
  type: DecisionType;
  /** Entscheidungs-Status */
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  /** Kommentar zur Entscheidung */
  comment?: string;
  /** Entscheidungsdatum */
  decidedAt?: Date;
  /** Kunden-Info */
  customer: {
    id: string;
    name: string;
    email: string;
  };
  /** Kampagnen-ID */
  campaignId: string;
  /** Organisations-ID */
  organizationId: string;
  /** Deadline für Entscheidung */
  deadline?: Date;
  /** Änderungswünsche */
  requestedChanges?: ChangeRequest[];
}

// Entscheidungstypen
export type DecisionType = 
  | 'final_approval' 
  | 'content_approval' 
  | 'design_approval' 
  | 'publish_approval'
  | 'reject_with_changes';

// Änderungswünsche
export interface ChangeRequest {
  /** Änderungs-ID */
  id: string;
  /** Bereich der Änderung */
  section: 'content' | 'design' | 'layout' | 'images' | 'general';
  /** Beschreibung der gewünschten Änderung */
  description: string;
  /** Priorität */
  priority: 'low' | 'medium' | 'high';
  /** Bezogene Seitennummer (bei PDF) */
  pageNumber?: number;
  /** Koordinaten (bei spezifischen Stellen) */
  coordinates?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  /** Erstellungsdatum */
  createdAt: Date;
  /** Status der Änderung */
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

// Gesamt-Context für Toggle-System
export interface CustomerReviewToggleContext {
  /** Toggle-State */
  toggleState: ToggleState;
  /** Toggle-Aktionen */
  toggleActions: ToggleActions;
  /** Kampagnen-ID */
  campaignId: string;
  /** Kunden-ID */
  customerId: string;
  /** Organisations-ID */
  organizationId: string;
  /** Benutzer-Rolle */
  userRole: 'customer' | 'agency' | 'admin';
  /** Berechtigung zum Bearbeiten */
  canEdit: boolean;
  /** Berechtigung zum Genehmigen */
  canApprove: boolean;
}

// Hook-Return-Type für useCustomerReviewToggle
export interface UseCustomerReviewToggleReturn {
  /** Toggle-State */
  toggleState: ToggleState;
  /** Toggle-Aktionen */
  actions: ToggleActions;
  /** Medien laden */
  loadMedia: (campaignId: string) => Promise<MediaItem[]>;
  /** PDF-Versionen laden */
  loadPDFVersions: (campaignId: string) => Promise<PDFVersion[]>;
  /** Kommunikation laden */
  loadCommunications: (campaignId: string) => Promise<CommunicationItem[]>;
  /** Entscheidung laden */
  loadDecision: (campaignId: string) => Promise<CustomerDecision | null>;
  /** Neue Nachricht senden */
  sendMessage: (content: string, type: CommunicationItem['type']) => Promise<void>;
  /** Entscheidung speichern */
  saveDecision: (decision: Omit<CustomerDecision, 'id' | 'decidedAt'>) => Promise<void>;
}

// Event-Handler-Typen
export interface ToggleEventHandlers {
  /** Toggle-Box erweitert/minimiert */
  onToggle?: (id: string, isExpanded: boolean) => void;
  /** Medien ausgewählt */
  onMediaSelect?: (mediaId: string, mediaItem: MediaItem) => void;
  /** PDF-Version ausgewählt */
  onPDFVersionSelect?: (versionId: string, version: PDFVersion) => void;
  /** Neue Nachricht */
  onNewMessage?: (message: Omit<CommunicationItem, 'id' | 'createdAt'>) => void;
  /** Entscheidung geändert */
  onDecisionChange?: (decision: CustomerDecision) => void;
}

// Konfiguration für Toggle-System
export interface ToggleSystemConfig {
  /** Standardmäßig erweiterte Toggle-Boxen */
  defaultExpanded?: string[];
  /** Animationen aktiviert */
  enableAnimations?: boolean;
  /** Maximale Anzahl gleichzeitig erweiterter Boxen */
  maxExpandedBoxes?: number;
  /** Auto-Collapse nach Zeit */
  autoCollapseAfter?: number;
  /** Persistierung des Toggle-Status */
  persistToggleState?: boolean;
  /** Tastatur-Navigation aktiviert */
  enableKeyboardNavigation?: boolean;
}