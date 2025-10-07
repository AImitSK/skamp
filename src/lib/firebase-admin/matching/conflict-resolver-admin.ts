/**
 * Conflict Resolver für intelligente Konfliktlösung
 *
 * Implementierung basierend auf intelligent-matching-part2-conflict-resolver.md
 * Zeilen 1-525
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

interface ConflictResolution {
  action: 'auto_updated' | 'flagged_for_review' | 'kept_existing';
  value: any;
  confidence: number;
  reason: string;
}

interface ConflictReview {
  id?: string;
  entityType: 'company' | 'publication';
  entityId: string;
  entityName?: string;
  field: string;

  currentValue: any;
  suggestedValue: any;

  evidence: {
    currentValueSource: string;
    currentValueAge: number;
    newVariantsCount: number;
    totalVariantsCount: number;
    variantDetails: Array<{
      organizationId: string;
      organizationName: string;
      value: any;
      contactId: string;
    }>;
  };

  confidence: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending_review' | 'approved' | 'rejected';

  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewNotes?: string;
}

/**
 * 3-Stufen Konfliktlösungs-System
 */
export async function resolveFieldConflict(
  entityType: 'company' | 'publication',
  entityId: string,
  field: string,
  currentValue: any,
  newValues: any[],
  confidence: number
): Promise<ConflictResolution> {

  console.log(`⚖️  Resolving conflict for ${entityType}.${field}...`);

  // Zähle neue Werte
  const valueCounts = countOccurrences(newValues);
  const majorityValue = getMajority(valueCounts);
  const majorityCount = valueCounts.get(majorityValue) || 0;
  const totalCount = newValues.length;
  const majorityPercentage = majorityCount / totalCount;

  console.log(`📊 Majority: ${majorityValue} (${majorityCount}/${totalCount} = ${Math.round(majorityPercentage * 100)}%)`);

  // ==========================================
  // STUFE 1: KEIN KONFLIKT (Feld leer)
  // ==========================================
  if (!currentValue || currentValue === '') {
    console.log('✅ No conflict - field is empty');
    return {
      action: 'auto_updated',
      value: majorityValue,
      confidence: majorityPercentage,
      reason: 'Field was empty'
    };
  }

  // ==========================================
  // STUFE 2: AUTO-UPDATE (Super Majority)
  // ==========================================

  // Hole Feld-spezifischen Threshold
  const threshold = FIELD_THRESHOLDS[field] || FIELD_THRESHOLDS.default;

  if (majorityPercentage >= threshold.autoUpdate && totalCount >= 3) {
    console.log('🔄 AUTO-UPDATE - Super majority detected');

    // Prüfe Quellenalter
    const valueAge = await getValueAge(entityId, field);
    const valueSource = await getValueSource(entityId, field);

    // Wenn manuell heute eingegeben → NICHT auto-update!
    if (valueSource === 'manual_entry' && valueAge < 1) {
      console.log('⚠️ Manual entry from today - flagging for review instead');

      await createConflictReview({
        entityType,
        entityId,
        field,
        currentValue,
        suggestedValue: majorityValue,
        confidence: majorityPercentage,
        evidence: {
          currentValueSource: valueSource,
          currentValueAge: valueAge,
          newVariantsCount: majorityCount,
          totalVariantsCount: totalCount,
          variantDetails: []
        },
        priority: 'high',
        status: 'pending_review'
      });

      return {
        action: 'flagged_for_review',
        value: currentValue,
        confidence: majorityPercentage,
        reason: 'Manual entry from today - needs review'
      };
    }

    // Berechne Update-Wahrscheinlichkeit mit Alter-Bonus
    const updateProbability = calculateUpdateProbability(
      currentValue,
      majorityValue,
      {
        currentValueAge: valueAge,
        majorityPercentage,
        totalVariants: totalCount
      }
    );

    if (updateProbability >= threshold.autoUpdate) {
      // Führe Auto-Update durch
      await performAutoUpdate(
        entityType,
        entityId,
        field,
        currentValue,
        majorityValue,
        {
          confidence: majorityPercentage,
          variantCount: `${majorityCount}/${totalCount}`,
          valueAge
        }
      );

      return {
        action: 'auto_updated',
        value: majorityValue,
        confidence: updateProbability,
        reason: `Super majority (${Math.round(majorityPercentage * 100)}%) with ${majorityCount}/${totalCount} variants`
      };
    }
  }

  // ==========================================
  // STUFE 3: CONFLICT-REVIEW (Alles andere)
  // ==========================================

  console.log('⚠️ CONFLICT - Creating review task');

  const priority = calculatePriority(majorityPercentage, totalCount);

  await createConflictReview({
    entityType,
    entityId,
    field,
    currentValue,
    suggestedValue: majorityValue,
    confidence: majorityPercentage,
    evidence: {
      currentValueSource: await getValueSource(entityId, field),
      currentValueAge: await getValueAge(entityId, field),
      newVariantsCount: majorityCount,
      totalVariantsCount: totalCount,
      variantDetails: [] // TODO: fill with actual variant details
    },
    priority,
    status: 'pending_review'
  });

  return {
    action: 'flagged_for_review',
    value: currentValue,
    confidence: majorityPercentage,
    reason: `Conflict detected - ${majorityCount}/${totalCount} variants suggest different value`
  };
}

/**
 * Feld-spezifische Schwellwerte
 */
const FIELD_THRESHOLDS: Record<string, { autoUpdate: number; flag: number }> = {
  // Kritische Felder: NIEMALS auto-update
  name: { autoUpdate: 1.0, flag: 0.95 },
  officialName: { autoUpdate: 1.0, flag: 0.95 },
  legalName: { autoUpdate: 1.0, flag: 0.95 },
  taxId: { autoUpdate: 1.0, flag: 0.95 },

  // Wichtige Felder: Hohe Schwellwerte
  address: { autoUpdate: 0.9, flag: 0.75 },
  phone: { autoUpdate: 0.9, flag: 0.75 },
  email: { autoUpdate: 0.9, flag: 0.75 },

  // Unkritische Felder: Moderate Schwellwerte
  website: { autoUpdate: 0.8, flag: 0.66 },
  socialMedia: { autoUpdate: 0.8, flag: 0.66 },
  logo: { autoUpdate: 0.85, flag: 0.7 },
  description: { autoUpdate: 0.85, flag: 0.7 },

  // Default für unbekannte Felder
  default: { autoUpdate: 0.9, flag: 0.75 }
};

/**
 * Zählt Vorkommen von Werten
 */
function countOccurrences(values: any[]): Map<any, number> {
  const counts = new Map<any, number>();

  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') {
      const normalized = normalizeValue(value);
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Normalisiert Wert für besseren Vergleich
 */
function normalizeValue(value: any): any {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return value;
}

/**
 * Findet Mehrheitswert
 */
function getMajority(counts: Map<any, number>): any {
  let maxCount = 0;
  let majorityValue: any = null;

  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      majorityValue = value;
    }
  }

  return majorityValue;
}

/**
 * Berechnet Update-Wahrscheinlichkeit mit Alter-Bonus
 */
function calculateUpdateProbability(
  currentValue: any,
  newValue: any,
  context: {
    currentValueAge: number;
    majorityPercentage: number;
    totalVariants: number;
  }
): number {

  let probability = context.majorityPercentage;

  // Bonus: Alter Wert ist sehr alt (> 1 Jahr)
  if (context.currentValueAge > 365) {
    probability += 0.1;
    console.log('📅 Old value (>1 year) - +10% update probability');
  }

  // Bonus: Alter Wert ist mega alt (> 2 Jahre)
  if (context.currentValueAge > 730) {
    probability += 0.1;
    console.log('📅 Very old value (>2 years) - +10% update probability');
  }

  // Bonus: Viele Varianten stimmen überein
  if (context.totalVariants >= 5) {
    probability += 0.05;
    console.log('📊 Many variants (5+) - +5% update probability');
  }

  return Math.min(probability, 1.0);
}

/**
 * Führt Auto-Update durch
 */
async function performAutoUpdate(
  entityType: string,
  entityId: string,
  field: string,
  oldValue: any,
  newValue: any,
  metadata: {
    confidence: number;
    variantCount: string;
    valueAge: number;
  }
): Promise<void> {

  console.log(`🔄 Performing auto-update: ${entityType}.${field}`);

  const collectionName = entityType === 'company' ? 'companies_enhanced' : 'publications_enhanced';

  await adminDb.collection(collectionName).doc(entityId).update({
    [field]: newValue,
    [`${field}_previousValue`]: oldValue,
    [`${field}_updatedBy`]: 'matching_system',
    [`${field}_updateReason`]: `Auto-update: ${metadata.variantCount} variants, ${Math.round(metadata.confidence * 100)}% confidence`,
    [`${field}_updateConfidence`]: metadata.confidence,
    [`${field}_updatedAt`]: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  // Log für Audit-Trail
  await adminDb.collection('auto_update_logs').add({
    entityType,
    entityId,
    field,
    oldValue,
    newValue,
    confidence: metadata.confidence,
    variantCount: metadata.variantCount,
    valueAge: metadata.valueAge,
    timestamp: FieldValue.serverTimestamp()
  });

  console.log('✅ Auto-update completed');
}

/**
 * Erstellt Conflict-Review Task
 */
async function createConflictReview(review: Omit<ConflictReview, 'id' | 'createdAt'>): Promise<string> {

  console.log(`📝 Creating conflict review for ${review.entityType}.${review.field}`);

  // Hole Entity-Name
  const collectionName = review.entityType === 'company' ? 'companies_enhanced' : 'publications_enhanced';
  const entityDoc = await adminDb.collection(collectionName).doc(review.entityId).get();
  const entityName = entityDoc.exists ? entityDoc.data()?.name : 'Unknown';

  const docRef = await adminDb.collection('conflict_reviews').add({
    ...review,
    entityName,
    createdAt: FieldValue.serverTimestamp()
  });

  console.log(`✅ Conflict review created: ${docRef.id}`);

  return docRef.id;
}

/**
 * Berechnet Priorität für Review
 */
function calculatePriority(majorityPercentage: number, totalVariants: number): 'low' | 'medium' | 'high' {

  // High Priority: Sehr klare Mehrheit
  if (majorityPercentage >= 0.9 && totalVariants >= 4) {
    return 'high';
  }

  // Medium Priority: Klare Mehrheit
  if (majorityPercentage >= 0.75 && totalVariants >= 3) {
    return 'medium';
  }

  // Low Priority: Keine klare Mehrheit
  return 'low';
}

/**
 * Holt Alter eines Feldwertes (in Tagen)
 */
async function getValueAge(entityId: string, field: string): Promise<number> {
  try {
    // Prüfe ob es ein Update-Timestamp gibt
    const docSnap = await adminDb.collection('companies_enhanced').doc(entityId).get();

    if (!docSnap.exists) return 999; // Sehr alt als Default

    const data = docSnap.data();
    if (!data) return 999;

    const updateTimestamp = data[`${field}_updatedAt`] || data.updatedAt || data.createdAt;

    if (!updateTimestamp) return 999;

    const updateDate = updateTimestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - updateDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;

  } catch (error) {
    console.error('Error getting value age:', error);
    return 999;
  }
}

/**
 * Holt Quelle eines Feldwertes
 */
async function getValueSource(entityId: string, field: string): Promise<string> {
  try {
    const docSnap = await adminDb.collection('companies_enhanced').doc(entityId).get();

    if (!docSnap.exists) return 'unknown';

    const data = docSnap.data();
    if (!data) return 'unknown';

    const source = data[`${field}_updatedBy`] || data.createdBy;

    // Unterscheide zwischen System und Mensch
    if (source === 'matching_system' || source === 'import_system') {
      return 'automatic';
    }

    return 'manual_entry';

  } catch (error) {
    console.error('Error getting value source:', error);
    return 'unknown';
  }
}

/**
 * Lädt alle offenen Conflict Reviews
 */
export async function getOpenConflicts(): Promise<ConflictReview[]> {
  const snapshot = await adminDb
    .collection('conflict_reviews')
    .where('status', '==', 'pending_review')
    .orderBy('priority', 'desc')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ConflictReview));
}

/**
 * Genehmigt Conflict Review (führt Update durch)
 */
export async function approveConflict(
  reviewId: string,
  userId: string,
  notes?: string
): Promise<void> {

  const reviewDoc = await adminDb.collection('conflict_reviews').doc(reviewId).get();

  if (!reviewDoc.exists) {
    throw new Error('Conflict review not found');
  }

  const review = reviewDoc.data() as ConflictReview;

  // Update Entity
  const collectionName = review.entityType === 'company' ? 'companies_enhanced' : 'publications_enhanced';

  await adminDb.collection(collectionName).doc(review.entityId).update({
    [review.field]: review.suggestedValue,
    [`${review.field}_previousValue`]: review.currentValue,
    [`${review.field}_updatedBy`]: userId,
    [`${review.field}_updateReason`]: 'Manual approval after conflict review',
    updatedAt: FieldValue.serverTimestamp()
  });

  // Update Review Status
  await adminDb.collection('conflict_reviews').doc(reviewId).update({
    status: 'approved',
    reviewedBy: userId,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewNotes: notes || ''
  });

  console.log(`✅ Conflict approved and applied: ${review.field}`);
}

/**
 * Lehnt Conflict Review ab (behält aktuellen Wert)
 */
export async function rejectConflict(
  reviewId: string,
  userId: string,
  notes?: string
): Promise<void> {

  await adminDb.collection('conflict_reviews').doc(reviewId).update({
    status: 'rejected',
    reviewedBy: userId,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewNotes: notes || ''
  });

  console.log(`❌ Conflict rejected: ${reviewId}`);
}
