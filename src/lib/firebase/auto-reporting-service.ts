// src/lib/firebase/auto-reporting-service.ts

/**
 * Auto-Reporting Service (Client SDK)
 *
 * CRUD-Operationen für Auto-Reportings
 * Ermöglicht UI-Operationen wie Erstellen, Bearbeiten, Löschen, Toggle
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './client-init';
import {
  AutoReporting,
  AutoReportingFormData,
  AutoReportingSendLog,
  DEFAULT_DAY_OF_MONTH,
  DEFAULT_DAY_OF_WEEK
} from '@/types/auto-reporting';
import { calculateNextSendDate } from '@/lib/utils/reporting-helpers';

// ========================================
// TYPES
// ========================================

interface ServiceContext {
  organizationId: string;
  userId: string;
}

interface CreateAutoReportingData extends AutoReportingFormData {
  campaignId: string;
  campaignName: string;
  monitoringEndDate: Timestamp;
}

// ========================================
// COLLECTION REFERENCES
// ========================================

const AUTO_REPORTINGS_COLLECTION = 'auto_reportings';
const AUTO_REPORTING_LOGS_COLLECTION = 'auto_reporting_logs';

// ========================================
// CRUD OPERATIONS
// ========================================

/**
 * Erstellt ein neues Auto-Reporting für eine Kampagne
 */
async function createAutoReporting(
  data: CreateAutoReportingData,
  context: ServiceContext
): Promise<string> {
  // Berechne nächstes Versanddatum
  const nextSendAt = calculateNextSendDate(
    data.frequency,
    data.dayOfWeek ?? DEFAULT_DAY_OF_WEEK,
    data.dayOfMonth ?? DEFAULT_DAY_OF_MONTH
  );

  const autoReporting: Omit<AutoReporting, 'id'> = {
    organizationId: context.organizationId,
    campaignId: data.campaignId,
    campaignName: data.campaignName,
    recipients: data.recipients,
    frequency: data.frequency,
    dayOfWeek: data.frequency === 'weekly' ? (data.dayOfWeek ?? DEFAULT_DAY_OF_WEEK) : undefined,
    dayOfMonth: data.frequency === 'monthly' ? (data.dayOfMonth ?? DEFAULT_DAY_OF_MONTH) : undefined,
    isActive: true,
    nextSendAt: Timestamp.fromDate(nextSendAt),
    monitoringEndDate: data.monitoringEndDate,
    createdBy: context.userId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(
    collection(db, AUTO_REPORTINGS_COLLECTION),
    autoReporting
  );

  return docRef.id;
}

/**
 * Aktualisiert ein bestehendes Auto-Reporting
 */
async function updateAutoReporting(
  id: string,
  data: Partial<AutoReportingFormData>,
  context: ServiceContext
): Promise<void> {
  const docRef = doc(db, AUTO_REPORTINGS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Auto-Reporting nicht gefunden');
  }

  const existing = docSnap.data() as AutoReporting;

  // Sicherheitscheck: Nur eigene Organisation
  if (existing.organizationId !== context.organizationId) {
    throw new Error('Keine Berechtigung');
  }

  // Wenn Frequenz geändert wurde, nächstes Versanddatum neu berechnen
  const frequency = data.frequency ?? existing.frequency;
  const dayOfWeek = data.frequency === 'weekly'
    ? (data.dayOfWeek ?? existing.dayOfWeek ?? DEFAULT_DAY_OF_WEEK)
    : undefined;
  const dayOfMonth = data.frequency === 'monthly'
    ? (data.dayOfMonth ?? existing.dayOfMonth ?? DEFAULT_DAY_OF_MONTH)
    : undefined;

  const nextSendAt = calculateNextSendDate(frequency, dayOfWeek, dayOfMonth);

  const updateData: Partial<AutoReporting> = {
    ...data,
    dayOfWeek,
    dayOfMonth,
    nextSendAt: Timestamp.fromDate(nextSendAt),
    updatedAt: serverTimestamp() as Timestamp,
  };

  await updateDoc(docRef, updateData);
}

/**
 * Löscht ein Auto-Reporting
 */
async function deleteAutoReporting(
  id: string,
  context: ServiceContext
): Promise<void> {
  const docRef = doc(db, AUTO_REPORTINGS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Auto-Reporting nicht gefunden');
  }

  const existing = docSnap.data() as AutoReporting;

  // Sicherheitscheck: Nur eigene Organisation
  if (existing.organizationId !== context.organizationId) {
    throw new Error('Keine Berechtigung');
  }

  await deleteDoc(docRef);
}

// ========================================
// STATUS OPERATIONS
// ========================================

/**
 * Aktiviert oder pausiert ein Auto-Reporting
 */
async function toggleAutoReporting(
  id: string,
  isActive: boolean,
  context: ServiceContext
): Promise<void> {
  const docRef = doc(db, AUTO_REPORTINGS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Auto-Reporting nicht gefunden');
  }

  const existing = docSnap.data() as AutoReporting;

  // Sicherheitscheck: Nur eigene Organisation
  if (existing.organizationId !== context.organizationId) {
    throw new Error('Keine Berechtigung');
  }

  // Wenn aktiviert wird, nächstes Versanddatum neu berechnen
  const updateData: Partial<AutoReporting> = {
    isActive,
    updatedAt: serverTimestamp() as Timestamp,
  };

  if (isActive) {
    const nextSendAt = calculateNextSendDate(
      existing.frequency,
      existing.dayOfWeek,
      existing.dayOfMonth
    );
    updateData.nextSendAt = Timestamp.fromDate(nextSendAt);
  }

  await updateDoc(docRef, updateData);
}

// ========================================
// QUERY OPERATIONS
// ========================================

/**
 * Lädt das Auto-Reporting für eine bestimmte Kampagne
 */
async function getAutoReportingByCampaign(
  campaignId: string,
  context: ServiceContext
): Promise<AutoReporting | null> {
  const q = query(
    collection(db, AUTO_REPORTINGS_COLLECTION),
    where('organizationId', '==', context.organizationId),
    where('campaignId', '==', campaignId)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as AutoReporting;
}

/**
 * Lädt alle Auto-Reportings einer Organisation
 */
async function getAutoReportingsForOrganization(
  context: ServiceContext
): Promise<AutoReporting[]> {
  const q = query(
    collection(db, AUTO_REPORTINGS_COLLECTION),
    where('organizationId', '==', context.organizationId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AutoReporting[];
}

/**
 * Lädt ein einzelnes Auto-Reporting per ID
 */
async function getAutoReportingById(
  id: string,
  context: ServiceContext
): Promise<AutoReporting | null> {
  const docRef = doc(db, AUTO_REPORTINGS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data() as AutoReporting;

  // Sicherheitscheck: Nur eigene Organisation
  if (data.organizationId !== context.organizationId) {
    return null;
  }

  return {
    id: docSnap.id,
    ...data
  };
}

// ========================================
// LOG OPERATIONS
// ========================================

/**
 * Lädt die Versand-Logs für ein Auto-Reporting
 */
async function getAutoReportingLogs(
  autoReportingId: string,
  context: ServiceContext,
  limit: number = 10
): Promise<AutoReportingSendLog[]> {
  const q = query(
    collection(db, AUTO_REPORTING_LOGS_COLLECTION),
    where('organizationId', '==', context.organizationId),
    where('autoReportingId', '==', autoReportingId),
    orderBy('sentAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.slice(0, limit).map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AutoReportingSendLog[];
}

// ========================================
// EXPORT SERVICE
// ========================================

export const autoReportingService = {
  // CRUD
  createAutoReporting,
  updateAutoReporting,
  deleteAutoReporting,

  // Status
  toggleAutoReporting,

  // Queries
  getAutoReportingByCampaign,
  getAutoReportingsForOrganization,
  getAutoReportingById,

  // Logs
  getAutoReportingLogs,
};
