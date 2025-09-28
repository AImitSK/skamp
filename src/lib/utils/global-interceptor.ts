import { getGlobalMetadata } from '@/lib/hooks/useAutoGlobal';

export type InterceptorContext = 'contact' | 'company' | 'publication';

export interface GlobalMetadata {
  addedBy: string;
  addedAt: Date;
  autoPromoted: boolean;
  context: InterceptorContext;
  version: number;
  isDraft: boolean;
  reviewedBy?: string;
  publishedAt?: Date;
  qualityScore?: number;
}

export interface GlobalizableData {
  [key: string]: any;
  isGlobal?: boolean;
  globalMetadata?: GlobalMetadata;
  sourceType?: 'manual' | 'import' | 'api' | 'merged';
  mergedFrom?: string[];
}

/**
 * Save-Interceptor für alle CRM-Bereiche
 * Macht automatisch alles global was SuperAdmin/Team erstellt
 */
export function interceptSave<T extends GlobalizableData>(
  data: T,
  context: InterceptorContext,
  user: any,
  options: {
    liveMode?: boolean;
    forceGlobal?: boolean;
    sourceType?: 'manual' | 'import' | 'api' | 'merged';
    autoGlobalMode?: boolean; // Pass this from the component
  } = {}
): T {
  // Bestimme ob global gesetzt werden soll
  const shouldBeGlobal = options.forceGlobal || options.autoGlobalMode;

  if (!shouldBeGlobal) {
    return data; // Keine Änderung für normale User
  }

  // Global Metadata generieren
  const globalMetadata: GlobalMetadata = {
    addedBy: user?.email || 'unknown',
    addedAt: new Date(),
    autoPromoted: options.autoGlobalMode || false,
    context: context,
    version: data.globalMetadata?.version ? data.globalMetadata.version + 1 : 1,
    isDraft: options.liveMode === false, // Default: Live, außer explizit Draft
    qualityScore: calculateQualityScore(data, context),
    ...(options.liveMode && {
      publishedAt: new Date(),
      reviewedBy: user?.email
    })
  };

  return {
    ...data,
    isGlobal: true,
    globalMetadata,
    sourceType: options.sourceType || 'manual',
    // Audit-Felder
    lastModifiedBy: user?.email,
    lastModifiedAt: new Date()
  };
}

/**
 * Bulk-Interceptor für Import-Operationen
 */
export function interceptBulkSave<T extends GlobalizableData>(
  dataArray: T[],
  context: InterceptorContext,
  user: any,
  options: {
    liveMode?: boolean;
    sourceType?: 'import' | 'api' | 'merged';
    batchId?: string;
    autoGlobalMode?: boolean; // Pass this from the component
  } = {}
): T[] {
  if (!options.autoGlobalMode) {
    return dataArray; // Keine Änderung für normale User
  }

  const batchId = options.batchId || generateBatchId();

  return dataArray.map((data, index) => interceptSave(data, context, user, {
    ...options,
    sourceType: options.sourceType || 'import',
    autoGlobalMode: options.autoGlobalMode
  }));
}

/**
 * Quality Score basierend auf Vollständigkeit und Kontext
 */
function calculateQualityScore(data: any, context: InterceptorContext): number {
  let score = 0;

  switch (context) {
    case 'contact':
      return calculateContactQualityScore(data);
    case 'company':
      return calculateCompanyQualityScore(data);
    case 'publication':
      return calculatePublicationQualityScore(data);
    default:
      return 50; // Default Score
  }
}

function calculateContactQualityScore(contact: any): number {
  let score = 0;

  // Basis-Daten (40%)
  if (contact.firstName && contact.lastName) score += 15;
  if (contact.email) score += 15;
  if (contact.phone) score += 10;

  // Journalist-spezifische Daten (40%)
  if (contact.type === 'journalist') {
    if (contact.medium || contact.company) score += 15;
    if (contact.position) score += 10;
    if (contact.topics && contact.topics.length > 0) score += 10;
    if (contact.socialMedia?.length > 0) score += 5;
  }

  // Verifizierung (20%)
  if (contact.emailVerified) score += 10;
  if (contact.phoneVerified) score += 5;
  if (contact.linkedInProfile) score += 5;

  return Math.min(score, 100);
}

function calculateCompanyQualityScore(company: any): number {
  let score = 0;

  // Basis-Daten (50%)
  if (company.name) score += 20;
  if (company.email) score += 10;
  if (company.phone) score += 10;
  if (company.website) score += 10;

  // Adress-Daten (30%)
  if (company.address) score += 15;
  if (company.city && company.country) score += 15;

  // Meta-Daten (20%)
  if (company.industry) score += 10;
  if (company.size) score += 10;

  return Math.min(score, 100);
}

function calculatePublicationQualityScore(publication: any): number {
  let score = 0;

  // Basis-Daten (60%)
  if (publication.title) score += 20;
  if (publication.content) score += 20;
  if (publication.category) score += 10;
  if (publication.tags?.length > 0) score += 10;

  // Meta-Daten (40%)
  if (publication.author) score += 15;
  if (publication.publishedAt) score += 10;
  if (publication.description) score += 10;
  if (publication.coverImage) score += 5;

  return Math.min(score, 100);
}

/**
 * Batch-ID Generator für Bulk-Operationen
 */
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Audit-Log für Global-Änderungen
 */
export async function logGlobalAction(
  action: 'create' | 'update' | 'delete' | 'publish' | 'merge',
  entityType: InterceptorContext,
  entityId: string,
  performedBy: string,
  changes?: any,
  isLive: boolean = true
) {
  const auditEntry = {
    action,
    entityType,
    entityId,
    performedBy,
    timestamp: new Date(),
    changes,
    isLive,
    sessionId: getSessionId()
  };

  // TODO: Save to Firestore /globalAuditLog collection
  console.log('Global Action:', auditEntry);
}

function getSessionId(): string {
  // TODO: Implement session tracking
  return `session_${Date.now()}`;
}