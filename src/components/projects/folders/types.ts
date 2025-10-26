import { MediaAsset, MediaFolder } from '@/types/media';

export interface ProjectFoldersViewProps {
  /**
   * Organization ID (Multi-Tenancy)
   */
  organizationId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Customer ID (für Boilerplate-Filterung)
   */
  customerId?: string;

  /**
   * Customer Name (für Boilerplate-Speicherung)
   */
  customerName?: string;

  /**
   * Project Folders Data (pre-loaded)
   */
  projectFolders: any;

  /**
   * Loading state
   */
  foldersLoading: boolean;

  /**
   * Callback für Refresh
   */
  onRefresh: () => void;

  /**
   * Filter für Ordner-Anzeige (für Phase 3)
   * - 'all': Alle Ordner anzeigen (Daten-Tab)
   * - 'Dokumente': Nur Dokumente-Ordner (Strategie-Tab)
   */
  filterByFolder?: 'all' | 'Dokumente';

  /**
   * Initial geöffneter Ordner (für Phase 3)
   */
  initialFolderId?: string;

  /**
   * Callback bei Ordner-Wechsel (für Phase 3)
   */
  onFolderChange?: (folderId: string) => void;

  /**
   * Überschrift für die Folder View
   * Default: 'Strategiedokumente'
   * Verwendung:
   * - Strategie Tab: Keine Angabe (nutzt Default)
   * - Daten Tab: 'Projektdaten'
   */
  title?: string;
}

export interface FolderNavigationProps {
  folders: any[];
  currentFolderId?: string;
  onFolderSelect: (folderId: string) => void;
  onFolderCreate?: () => void;
  filterByFolder?: 'all' | 'Dokumente';
  loading?: boolean;
}

export interface FileListProps {
  files: any[];
  loading: boolean;
  onFileClick: (file: any) => void;
  onFileDelete: (fileId: string, fileName: string) => void;
  onFileDownload: (file: any) => void;
  onFileMove: (file: any) => void;
}

export interface FileListItemProps {
  file: any;
  onFileClick: (file: any) => void;
  onFileDelete: (fileId: string, fileName: string) => void;
  onFileDownload: (file: any) => void;
  onFileMove: (file: any) => void;
}

export interface UploadZoneProps {
  folderId?: string;
  projectId: string;
  organizationId: string;
  onUpload: (files: File[]) => void;
  uploading: boolean;
  uploadProgress?: { [key: string]: number };
}

export interface FolderCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: () => void;
  parentFolderId?: string;
  organizationId: string;
}

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface AlertProps {
  type: 'info' | 'error' | 'success';
  message: string;
}
