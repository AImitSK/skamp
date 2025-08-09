// src/lib/email/team-folder-service.ts
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { BaseService, QueryOptions, BatchOperationResult } from '@/lib/firebase/service-base';
import {
  TeamFolder,
  EmailThreadFolder,
  AutoAssignRule,
  AssignmentResult,
  FolderTreeNode,
  FolderSuggestion,
  FolderStats,
  TeamMemberFolderSummary,
  EmailMessage,
  TeamMember
} from '@/types/inbox-enhanced';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// TEAM FOLDER SERVICE
// ============================================================================

export class TeamFolderService extends BaseService<TeamFolder> {
  constructor() {
    super('team_folders');
  }

  // ========================================
  // SYSTEM FOLDER MANAGEMENT
  // ========================================

  /**
   * Erstellt System-Ordner für neue Organisation
   */
  async createSystemFolders(
    organizationId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const systemFolders = [
      {
        name: "📥 Allgemeine Anfragen",
        description: "Geteilter Posteingang für alle Team-Mitglieder",
        icon: "📥",
        color: "#3B82F6",
        ownerId: "system",
        ownerName: "System",
        path: ["Allgemeine Anfragen"],
        isShared: true,
        isSystem: true,
        autoAssignRules: []
      },
      {
        name: `👤 ${userName}`,
        description: `Persönlicher Ordner für ${userName}`,
        icon: "👤",
        color: "#10B981",
        ownerId: userId,
        ownerName: userName,
        path: [userName],
        isShared: false,
        isSystem: true,
        autoAssignRules: []
      }
    ];

    const context = { organizationId, userId };

    for (const folderData of systemFolders) {
      try {
        await this.create(folderData, context);
      } catch (error) {
      }
    }
  }

  /**
   * Erstellt persönlichen Ordner für neues Team-Mitglied
   */
  async createUserMainFolder(
    organizationId: string,
    userId: string,
    userName: string,
    createdBy: string
  ): Promise<string> {
    const folderData = {
      name: `👤 ${userName}`,
      description: `Persönlicher Ordner für ${userName}`,
      icon: "👤",
      color: "#10B981",
      ownerId: userId,
      ownerName: userName,
      path: [userName],
      isShared: false,
      isSystem: true,
      autoAssignRules: []
    };

    return await this.create(folderData, { organizationId, userId: createdBy });
  }

  // ========================================
  // FOLDER HIERARCHY MANAGEMENT
  // ========================================

  /**
   * Erstellt Unterordner
   */
  async createSubFolder(
    organizationId: string,
    userId: string,
    parentFolderId: string,
    folderData: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      isShared?: boolean;
      autoAssignRules?: AutoAssignRule[];
    }
  ): Promise<string> {
    // Parent-Ordner laden für Validierung
    const parentFolder = await this.getById(parentFolderId, organizationId);
    if (!parentFolder) {
      throw new Error('Parent-Ordner nicht gefunden');
    }

    // Berechtigung prüfen
    if (parentFolder.ownerId !== userId && parentFolder.ownerId !== "system") {
      throw new Error('Keine Berechtigung für diesen Ordner');
    }

    // Max Level prüfen (3 Ebenen)
    if (parentFolder.level >= 2) {
      throw new Error('Maximale Ordner-Tiefe erreicht (3 Ebenen)');
    }

    // Max Ordner pro User prüfen (20)
    const userFolders = await this.getUserFolders(organizationId, userId);
    if (userFolders.length >= 20) {
      throw new Error('Maximale Anzahl Ordner erreicht (20 pro User)');
    }

    const subFolderData = {
      ...folderData,
      ownerId: parentFolder.ownerId,
      ownerName: parentFolder.ownerName,
      parentFolderId: parentFolderId,
      level: parentFolder.level + 1,
      path: [...parentFolder.path, folderData.name],
      isSystem: false,
      icon: folderData.icon || "📁",
      color: folderData.color || "#6B7280",
      isShared: folderData.isShared || false,
      autoAssignRules: folderData.autoAssignRules || []
    };

    return await this.create(subFolderData, { organizationId, userId });
  }

  /**
   * Lädt hierarchische Ordner-Struktur
   */
  async getFolderTree(organizationId: string, userId: string): Promise<FolderTreeNode[]> {
    // Alle zugänglichen Ordner laden
    const allFolders = await this.getAccessibleFolders(organizationId, userId);
    
    // Hierarchie aufbauen
    const folderMap = new Map<string, TeamFolder>();
    allFolders.forEach(folder => {
      if (folder.id) folderMap.set(folder.id, folder);
    });

    // Root-Ordner finden (level 0)
    const rootFolders = allFolders.filter(folder => folder.level === 0);
    
    // Rekursiv Baum aufbauen
    const buildTree = (folder: TeamFolder, depth: number = 0): FolderTreeNode => {
      const children: FolderTreeNode[] = [];
      
      // Kinder finden
      allFolders
        .filter(f => f.parentFolderId === folder.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(childFolder => {
          children.push(buildTree(childFolder, depth + 1));
        });

      return {
        folder,
        children,
        depth,
        hasUnread: folder.unreadCount > 0
      };
    };

    return rootFolders
      .sort((a, b) => {
        // System-Ordner zuerst, dann alphabetisch
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.name.localeCompare(b.name);
      })
      .map(folder => buildTree(folder));
  }

  /**
   * Lädt alle für User zugänglichen Ordner
   */
  async getAccessibleFolders(organizationId: string, userId: string): Promise<TeamFolder[]> {
    const constraints: QueryConstraint[] = [
      // System-Ordner ODER eigene Ordner ODER geteilte Ordner
      // Firestore unterstützt keine OR-Queries, daher multiple Queries
    ];

    try {
      // 1. System-Ordner
      const systemQuery = query(
        this.collectionRef,
        where('organizationId', '==', organizationId),
        where('isSystem', '==', true)
      );

      // 2. Eigene Ordner
      const ownQuery = query(
        this.collectionRef,
        where('organizationId', '==', organizationId),
        where('ownerId', '==', userId)
      );

      // 3. Geteilte Ordner
      const sharedQuery = query(
        this.collectionRef,
        where('organizationId', '==', organizationId),
        where('sharedWithUserIds', 'array-contains', userId)
      );

      // 4. Allgemein geteilte Ordner
      const publicSharedQuery = query(
        this.collectionRef,
        where('organizationId', '==', organizationId),
        where('isShared', '==', true)
      );

      const [systemSnap, ownSnap, sharedSnap, publicSharedSnap] = await Promise.all([
        getDocs(systemQuery),
        getDocs(ownQuery),
        getDocs(sharedQuery),
        getDocs(publicSharedQuery)
      ]);

      // Alle Ergebnisse kombinieren und Duplikate entfernen
      const allDocs = new Map<string, TeamFolder>();

      [systemSnap, ownSnap, sharedSnap, publicSharedSnap].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() } as TeamFolder;
          allDocs.set(doc.id, data);
        });
      });

      return Array.from(allDocs.values())
        .filter(folder => !folder.deletedAt); // Soft delete filtering
    } catch (error) {
      return [];
    }
  }

  /**
   * Lädt Ordner eines bestimmten Users
   */
  async getUserFolders(organizationId: string, userId: string): Promise<TeamFolder[]> {
    return await this.search(organizationId, { ownerId: userId });
  }

  // ========================================
  // EMAIL-FOLDER ASSIGNMENT
  // ========================================

  /**
   * Verschiebt E-Mail in Ordner (Multi-Location Support)
   */
  async moveEmailToFolder(
    threadId: string,
    targetFolderId: string,
    userId: string,
    organizationId: string,
    isPrimary: boolean = false
  ): Promise<void> {
    // Validierung
    const targetFolder = await this.getById(targetFolderId, organizationId);
    if (!targetFolder) {
      throw new Error('Ziel-Ordner nicht gefunden');
    }

    // Berechtigung prüfen
    if (!this.canUserAccessFolder(targetFolder, userId)) {
      throw new Error('Keine Berechtigung für diesen Ordner');
    }

    // EmailThreadFolder erstellen
    const threadFolderData: Omit<EmailThreadFolder, 'id'> = {
      threadId,
      folderId: targetFolderId,
      folderPath: targetFolder.path,
      assignedBy: userId,
      assignedAt: serverTimestamp() as any,
      isOriginalLocation: targetFolder.isSystem && targetFolder.name.includes('Allgemeine'),
      isPrimaryLocation: isPrimary,
      organizationId
    };

    // In email_thread_folders Collection speichern
    const threadFolderRef = collection(db, 'email_thread_folders');
    await addDoc(threadFolderRef, threadFolderData);

    // Ordner-Statistiken aktualisieren
    await this.incrementEmailCount(targetFolderId, organizationId);
  }

  /**
   * Prüft ob User Zugriff auf Ordner hat
   */
  private canUserAccessFolder(folder: TeamFolder, userId: string): boolean {
    return (
      folder.isSystem ||
      folder.ownerId === userId ||
      folder.isShared ||
      (folder.sharedWithUserIds && folder.sharedWithUserIds.includes(userId))
    );
  }

  /**
   * Erhöht E-Mail-Zähler eines Ordners
   */
  private async incrementEmailCount(folderId: string, organizationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'team_folders', folderId);
      await updateDoc(docRef, {
        emailCount: (await this.getById(folderId, organizationId))?.emailCount || 0 + 1,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
    }
  }

  // ========================================
  // AUTO-ASSIGNMENT ENGINE
  // ========================================

  /**
   * Verarbeitet Auto-Assignment Regeln für eingehende E-Mail
   */
  async processAutoAssignment(email: EmailMessage, organizationId: string): Promise<AssignmentResult[]> {
    const results: AssignmentResult[] = [];

    // Alle Ordner mit Auto-Assignment Regeln laden
    const foldersWithRules = await this.search(organizationId, {
      'autoAssignRules.0': { operator: '!=', value: null }
    });

    for (const folder of foldersWithRules) {
      if (!folder.autoAssignRules) continue;

      for (const rule of folder.autoAssignRules) {
        if (!rule.isActive) continue;

        const match = this.evaluateRule(rule, email);
        if (match.isMatch) {
          results.push({
            folderId: folder.id!,
            folderPath: folder.path,
            reason: match.reason,
            confidence: match.confidence,
            priority: rule.priority,
            ruleType: rule.type
          });
        }
      }
    }

    // Nach Priorität und Confidence sortieren
    return results.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Evaluiert eine Auto-Assignment Regel
   */
  private evaluateRule(rule: AutoAssignRule, email: EmailMessage): {
    isMatch: boolean;
    reason: string;
    confidence: number;
  } {
    const pattern = rule.pattern.toLowerCase();
    
    switch (rule.type) {
      case 'domain':
        const domain = this.extractDomain(email.from.email);
        const domainMatch = domain === pattern;
        return {
          isMatch: domainMatch,
          reason: domainMatch ? `Domain-Match: ${domain}` : '',
          confidence: domainMatch ? 0.9 : 0
        };

      case 'keyword':
        const content = `${email.subject} ${email.textContent}`.toLowerCase();
        const keywordMatch = content.includes(pattern);
        return {
          isMatch: keywordMatch,
          reason: keywordMatch ? `Keyword-Match: "${rule.pattern}"` : '',
          confidence: keywordMatch ? 0.7 : 0
        };

      case 'sender':
        const senderMatch = email.from.email.toLowerCase().includes(pattern);
        return {
          isMatch: senderMatch,
          reason: senderMatch ? `Sender-Match: ${email.from.email}` : '',
          confidence: senderMatch ? 0.8 : 0
        };

      case 'subject':
        const subjectMatch = email.subject.toLowerCase().includes(pattern);
        return {
          isMatch: subjectMatch,
          reason: subjectMatch ? `Subject-Match: "${rule.pattern}"` : '',
          confidence: subjectMatch ? 0.75 : 0
        };

      case 'content':
        const contentMatch = email.textContent.toLowerCase().includes(pattern);
        return {
          isMatch: contentMatch,
          reason: contentMatch ? `Content-Match: "${rule.pattern}"` : '',
          confidence: contentMatch ? 0.6 : 0
        };

      default:
        return { isMatch: false, reason: '', confidence: 0 };
    }
  }

  /**
   * Extrahiert Domain aus E-Mail-Adresse
   */
  private extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  // ========================================
  // STATISTICS & ANALYTICS
  // ========================================

  /**
   * Lädt Ordner-Statistiken für Dashboard
   */
  async getFolderStats(organizationId: string, userId?: string): Promise<FolderStats[]> {
    const folders = userId 
      ? await this.getUserFolders(organizationId, userId)
      : await this.getAll(organizationId);

    return folders.map(folder => ({
      folderId: folder.id!,
      folderName: folder.name,
      totalEmails: folder.emailCount,
      newEmails: 0, // TODO: Implementieren basierend auf Status
      inProgressEmails: 0, // TODO: Implementieren basierend auf Status
      resolvedEmails: 0, // TODO: Implementieren basierend auf Status
      avgResponseTime: 0, // TODO: Implementieren
      assignedToUser: folder.ownerId,
      lastActivity: folder.updatedAt
    }));
  }

  /**
   * Lädt Team-Member Ordner-Übersicht
   */
  async getTeamMemberSummary(organizationId: string): Promise<TeamMemberFolderSummary[]> {
    // Alle Ordner laden
    const allFolders = await this.getAll(organizationId);
    
    // Nach Owner gruppieren
    const userFolders = new Map<string, TeamFolder[]>();
    
    allFolders.forEach(folder => {
      if (folder.ownerId === 'system') return;
      
      if (!userFolders.has(folder.ownerId)) {
        userFolders.set(folder.ownerId, []);
      }
      userFolders.get(folder.ownerId)!.push(folder);
    });

    // Summaries erstellen
    const summaries: TeamMemberFolderSummary[] = [];
    
    for (const [userId, folders] of userFolders) {
      const folderStats = await this.getFolderStats(organizationId, userId);
      
      summaries.push({
        userId,
        userName: folders[0]?.ownerName || 'Unbekannt',
        totalFolders: folders.length,
        totalEmails: folders.reduce((sum, f) => sum + f.emailCount, 0),
        unreadEmails: folders.reduce((sum, f) => sum + f.unreadCount, 0),
        avgResponseTime: 0, // TODO: Berechnen
        folders: folderStats
      });
    }

    return summaries;
  }

  // ========================================
  // FOLDER SUGGESTIONS
  // ========================================

  /**
   * Schlägt Ordner für E-Mail vor
   */
  async suggestFoldersForEmail(
    email: EmailMessage,
    organizationId: string,
    userId: string
  ): Promise<FolderSuggestion[]> {
    const suggestions: FolderSuggestion[] = [];

    // Auto-Assignment Ergebnisse
    const autoResults = await this.processAutoAssignment(email, organizationId);
    
    for (const result of autoResults.slice(0, 3)) { // Top 3
      const folder = await this.getById(result.folderId, organizationId);
      if (folder) {
        suggestions.push({
          folderId: result.folderId,
          folderName: folder.name,
          folderPath: result.folderPath,
          reason: result.reason,
          confidence: result.confidence,
          canApply: this.canUserAccessFolder(folder, userId)
        });
      }
    }

    // TODO: Historische Ähnlichkeiten hinzufügen
    // TODO: AI-basierte Vorschläge hinzufügen

    return suggestions;
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  /**
   * Erstellt mehrere Ordner gleichzeitig
   */
  async createBulkFolders(
    organizationId: string,
    userId: string,
    folders: Array<{
      name: string;
      parentFolderId?: string;
      description?: string;
      icon?: string;
      color?: string;
    }>
  ): Promise<BatchOperationResult> {
    const results: BatchOperationResult = {
      errors: []
    };

    for (const folderData of folders) {
      try {
        if (folderData.parentFolderId) {
          await this.createSubFolder(organizationId, userId, folderData.parentFolderId, folderData);
        } else {
          // Root-level Ordner
          const data = {
            ...folderData,
            ownerId: userId,
            ownerName: '', // TODO: Von TeamMember laden
            path: [folderData.name],
            isShared: false,
            isSystem: false,
            icon: folderData.icon || "📁",
            color: folderData.color || "#6B7280"
          };
          
          await this.create(data, { organizationId, userId });
        }
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    return results;
  }
}

// ============================================================================
// EMAIL THREAD FOLDER SERVICE
// ============================================================================

export class EmailThreadFolderService extends BaseService<EmailThreadFolder> {
  constructor() {
    super('email_thread_folders');
  }

  /**
   * Lädt alle Ordner-Zuweisungen für Thread
   */
  async getThreadFolders(threadId: string, organizationId: string): Promise<EmailThreadFolder[]> {
    return await this.search(organizationId, { threadId });
  }

  /**
   * Lädt alle Threads in einem Ordner
   */
  async getFolderThreads(folderId: string, organizationId: string): Promise<EmailThreadFolder[]> {
    return await this.search(organizationId, { folderId });
  }

  /**
   * Entfernt Thread aus Ordner
   */
  async removeThreadFromFolder(
    threadId: string,
    folderId: string,
    organizationId: string
  ): Promise<void> {
    const assignments = await this.search(organizationId, { threadId, folderId });
    
    for (const assignment of assignments) {
      if (assignment.id) {
        await this.hardDelete(assignment.id, organizationId);
      }
    }
  }
}

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

export const teamFolderService = new TeamFolderService();
export const emailThreadFolderService = new EmailThreadFolderService();