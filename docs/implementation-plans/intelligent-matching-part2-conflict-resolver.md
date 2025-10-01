# Intelligent Matching - Teil 2: Conflict Resolver

> Fortsetzung von `intelligent-matching-enrichment.md`

---

## 🔧 Implementierung: Phase 5 - Conflict Resolver

### Datei: `src/lib/matching/conflict-resolver.ts`

```typescript
import { db } from '@/lib/firebase/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection, getDoc } from 'firebase/firestore';

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
  const majorityCount = valueCounts[majorityValue];
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

  await updateDoc(doc(db, collectionName, entityId), {
    [field]: newValue,
    [`${field}_previousValue`]: oldValue,
    [`${field}_updatedBy`]: 'matching_system',
    [`${field}_updateReason`]: `Auto-update: ${metadata.variantCount} variants, ${Math.round(metadata.confidence * 100)}% confidence`,
    [`${field}_updateConfidence`]: metadata.confidence,
    [`${field}_updatedAt`]: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Log für Audit-Trail
  await addDoc(collection(db, 'auto_update_logs'), {
    entityType,
    entityId,
    field,
    oldValue,
    newValue,
    confidence: metadata.confidence,
    variantCount: metadata.variantCount,
    valueAge: metadata.valueAge,
    timestamp: serverTimestamp()
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
  const entityDoc = await getDoc(doc(db, collectionName, review.entityId));
  const entityName = entityDoc.exists() ? entityDoc.data().name : 'Unknown';

  const docRef = await addDoc(collection(db, 'conflict_reviews'), {
    ...review,
    entityName,
    createdAt: serverTimestamp()
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
    const docSnap = await getDoc(doc(db, 'companies_enhanced', entityId));

    if (!docSnap.exists()) return 999; // Sehr alt als Default

    const data = docSnap.data();
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
    const docSnap = await getDoc(doc(db, 'companies_enhanced', entityId));

    if (!docSnap.exists()) return 'unknown';

    const data = docSnap.data();
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
  const q = query(
    collection(db, 'conflict_reviews'),
    where('status', '==', 'pending_review'),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

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

  const reviewDoc = await getDoc(doc(db, 'conflict_reviews', reviewId));

  if (!reviewDoc.exists()) {
    throw new Error('Conflict review not found');
  }

  const review = reviewDoc.data() as ConflictReview;

  // Update Entity
  const collectionName = review.entityType === 'company' ? 'companies_enhanced' : 'publications_enhanced';

  await updateDoc(doc(db, collectionName, review.entityId), {
    [review.field]: review.suggestedValue,
    [`${review.field}_previousValue`]: review.currentValue,
    [`${review.field}_updatedBy`]: userId,
    [`${review.field}_updateReason`]: 'Manual approval after conflict review',
    updatedAt: serverTimestamp()
  });

  // Update Review Status
  await updateDoc(doc(db, 'conflict_reviews', reviewId), {
    status: 'approved',
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
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

  await updateDoc(doc(db, 'conflict_reviews', reviewId), {
    status: 'rejected',
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
    reviewNotes: notes || ''
  });

  console.log(`❌ Conflict rejected: ${reviewId}`);
}
```

---

## 📊 Conflict Review UI-Komponente

### Datei: `src/app/dashboard/super-admin/settings/ConflictReviewSection.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextArea } from '@/components/ui/textarea';
import {
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { getOpenConflicts, approveConflict, rejectConflict } from '@/lib/matching/conflict-resolver';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function ConflictReviewSection() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const data = await getOpenConflicts();
      setConflicts(data);
    } catch (error) {
      console.error('Error loading conflicts:', error);
      toast.error('Fehler beim Laden der Konflikte');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    if (!user) return;

    const notes = reviewNotes[reviewId] || '';

    const toastId = toast.loading('Aktualisiere...');

    try {
      await approveConflict(reviewId, user.uid, notes);
      toast.success('Update durchgeführt!', { id: toastId });

      // Entferne aus Liste
      setConflicts(conflicts.filter(c => c.id !== reviewId));

    } catch (error) {
      console.error('Error approving conflict:', error);
      toast.error('Fehler beim Genehmigen', { id: toastId });
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!user) return;

    const notes = reviewNotes[reviewId] || '';

    const toastId = toast.loading('Ablehnen...');

    try {
      await rejectConflict(reviewId, user.uid, notes);
      toast.success('Konflikt abgelehnt', { id: toastId });

      // Entferne aus Liste
      setConflicts(conflicts.filter(c => c.id !== reviewId));

    } catch (error) {
      console.error('Error rejecting conflict:', error);
      toast.error('Fehler beim Ablehnen', { id: toastId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'zinc';
      default: return 'zinc';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="text-sm text-zinc-500">Lade Konflikte...</div>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="text-center py-8">
          <CheckCircleIcon className="size-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Keine offenen Konflikte
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Alle Daten-Konflikte wurden gelöst!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          ⚠️ Konflikte zur Überprüfung ({conflicts.length})
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Daten-Konflikte die manuelle Überprüfung benötigen
        </p>
      </div>

      <div className="space-y-4">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="rounded-lg border-2 border-zinc-200 dark:border-zinc-800 p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {conflict.entityType === 'company' ? '🏢' : '📰'} {conflict.entityName} - {conflict.field}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color={getPriorityColor(conflict.priority)}>
                    {conflict.priority.toUpperCase()}
                  </Badge>
                  <Badge color="blue">
                    {Math.round(conflict.confidence * 100)}% Konfidenz
                  </Badge>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <ClockIcon className="size-3" />
                    {conflict.evidence.currentValueAge} Tage alt
                  </div>
                </div>
              </div>
            </div>

            {/* Werte-Vergleich */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Aktueller Wert */}
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="text-xs font-medium text-red-900 dark:text-red-100 mb-2">
                  Aktuell in DB:
                </div>
                <div className="text-sm text-red-800 dark:text-red-200 font-mono break-all">
                  {conflict.currentValue || '(leer)'}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Quelle: {conflict.evidence.currentValueSource}
                </div>
              </div>

              {/* Vorgeschlagener Wert */}
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <div className="text-xs font-medium text-green-900 dark:text-green-100 mb-2">
                  Neue Daten ({conflict.evidence.newVariantsCount}x):
                </div>
                <div className="text-sm text-green-800 dark:text-green-200 font-mono break-all">
                  {conflict.suggestedValue}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                  {conflict.evidence.newVariantsCount} von {conflict.evidence.totalVariantsCount} Varianten stimmen überein
                </div>
              </div>
            </div>

            {/* Empfehlung */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 mb-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="size-5 text-blue-600" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Empfehlung:</strong> {conflict.confidence >= 0.8 ? 'Update durchführen' : 'Aktuellen Wert behalten'}
                </div>
              </div>
            </div>

            {/* Notizen */}
            <div className="mb-4">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                Notizen (optional):
              </label>
              <TextArea
                value={reviewNotes[conflict.id!] || ''}
                onChange={(e) => setReviewNotes({
                  ...reviewNotes,
                  [conflict.id!]: e.target.value
                })}
                placeholder="Grund für Entscheidung..."
                rows={2}
              />
            </div>

            {/* Aktionen */}
            <div className="flex justify-end gap-2">
              <Button
                color="red"
                onClick={() => handleReject(conflict.id!)}
              >
                <XMarkIcon className="size-4" />
                <span>Aktuellen Wert behalten</span>
              </Button>

              <Button
                color="green"
                onClick={() => handleApprove(conflict.id!)}
              >
                <CheckCircleIcon className="size-4" />
                <span>Update durchführen</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 Verwendung des Conflict Resolvers

### Im Import-Flow:

```typescript
// Nach Company-Matching und vor Kontakt-Erstellung:

const enrichmentResult = await enrichCompany(
  companyMatch.companyId,
  existingCompany,
  newData,
  variants,
  companyMatch.confidence,
  userId
);

// enrichmentResult.conflicts enthält alle Konflikte:
for (const conflict of enrichmentResult.conflicts) {
  if (conflict.action === 'auto_updated') {
    console.log(`✅ Auto-updated: ${conflict.field}`);
  } else if (conflict.action === 'flagged_for_review') {
    console.log(`⚠️ Flagged for review: ${conflict.field}`);
  } else {
    console.log(`➡️  Kept existing: ${conflict.field}`);
  }
}
```

### In Settings-Seite:

```typescript
// src/app/dashboard/super-admin/settings/page.tsx

import ConflictReviewSection from './ConflictReviewSection';

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Bestehende Sektionen */}

      {/* Conflict Review */}
      <section>
        <ConflictReviewSection />
      </section>
    </div>
  );
}
```

---

**Weiter mit Teil 3 (String Similarity Utils)?** 🚀
