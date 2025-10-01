/**
 * Enrichment Engine für intelligente Daten-Anreicherung
 *
 * Implementierung basierend auf intelligent-matching-enrichment.md
 * Zeilen 1179-1456
 */

import { db } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
// TODO: Import wird in Phase 2 verfügbar
// import { resolveFieldConflict } from './conflict-resolver';

interface EnrichmentResult {
  enriched: boolean;
  fieldsAdded: string[];
  fieldsUpdated: string[];
  conflicts: Array<{
    field: string;
    action: 'auto_updated' | 'flagged_for_review' | 'kept_existing';
  }>;
  oldCompleteness: number;
  newCompleteness: number;
}

/**
 * Reichert Company mit neuen Daten an
 */
export async function enrichCompany(
  companyId: string,
  existingCompany: any,
  newData: {
    website?: string;
    phone?: string;
    address?: string;
    socialMedia?: any[];
    logo?: string;
  },
  variants: any[],
  confidence: number,
  userId: string
): Promise<EnrichmentResult> {

  console.log(`📊 Enriching company ${companyId}...`);

  if (confidence < 0.7) {
    console.log('⚠️ Confidence too low for enrichment');
    return {
      enriched: false,
      fieldsAdded: [],
      fieldsUpdated: [],
      conflicts: [],
      oldCompleteness: calculateCompanyCompleteness(existingCompany),
      newCompleteness: calculateCompanyCompleteness(existingCompany)
    };
  }

  const updates: any = {};
  const fieldsAdded: string[] = [];
  const fieldsUpdated: string[] = [];
  const conflicts: any[] = [];

  // ==========================================
  // FEHLENDE FELDER ERGÄNZEN
  // ==========================================

  // Webseite
  if (!existingCompany.website && newData.website) {
    const occurrences = countOccurrences('website', newData.website, variants);
    if (occurrences >= 2 || variants.length === 1) {
      updates.website = newData.website;
      fieldsAdded.push('website');
      console.log('✅ Webseite ergänzt:', newData.website);
    }
  }

  // Telefon
  if (!existingCompany.phone && newData.phone) {
    const occurrences = countOccurrences('phone', newData.phone, variants);
    if (occurrences >= 2) {
      updates.phone = newData.phone;
      fieldsAdded.push('phone');
      console.log('✅ Telefon ergänzt:', newData.phone);
    }
  }

  // Adresse
  if (!existingCompany.address && newData.address) {
    const occurrences = countOccurrences('address', newData.address, variants);
    if (occurrences >= 2) {
      updates.address = newData.address;
      fieldsAdded.push('address');
      console.log('✅ Adresse ergänzt:', newData.address);
    }
  }

  // Social Media
  if ((!existingCompany.socialMedia || existingCompany.socialMedia.length === 0) && newData.socialMedia?.length) {
    updates.socialMedia = newData.socialMedia;
    fieldsAdded.push('socialMedia');
    console.log('✅ Social Media ergänzt:', newData.socialMedia.length, 'Profile');
  }

  // Logo
  if (!existingCompany.logo && newData.logo) {
    const occurrences = countOccurrences('logo', newData.logo, variants);
    if (occurrences >= 2 || variants.length === 1) {
      updates.logo = newData.logo;
      fieldsAdded.push('logo');
      console.log('✅ Logo ergänzt');
    }
  }

  // ==========================================
  // KONFLIKTE PRÜFEN & LÖSEN
  // ==========================================

  // TODO: Konflikt-Resolution wird in Phase 2 implementiert
  // Vorerst: Einfache Konflikt-Erkennung ohne Resolution

  // Webseite-Konflikt
  if (existingCompany.website && newData.website && existingCompany.website !== newData.website) {
    console.log('⚠️ Webseiten-Konflikt erkannt, wird in Phase 2 gelöst');
    conflicts.push({ field: 'website', action: 'kept_existing' });
  }

  // Telefon-Konflikt
  if (existingCompany.phone && newData.phone && existingCompany.phone !== newData.phone) {
    console.log('⚠️ Telefon-Konflikt erkannt, wird in Phase 2 gelöst');
    conflicts.push({ field: 'phone', action: 'kept_existing' });
  }

  // Adresse-Konflikt
  if (existingCompany.address && newData.address && existingCompany.address !== newData.address) {
    console.log('⚠️ Adresse-Konflikt erkannt, wird in Phase 2 gelöst');
    conflicts.push({ field: 'address', action: 'kept_existing' });
  }

  // ==========================================
  // UPDATE AUSFÜHREN
  // ==========================================

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'companies_enhanced', companyId), {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      enrichedBy: 'matching_system',
      enrichedAt: serverTimestamp()
    });

    // Log Enrichment
    await logEnrichment({
      entityType: 'company',
      entityId: companyId,
      fieldsAdded,
      fieldsUpdated,
      confidence,
      userId
    });

    const oldCompleteness = calculateCompanyCompleteness(existingCompany);
    const newCompleteness = calculateCompanyCompleteness({ ...existingCompany, ...updates });

    console.log(`✅ Company enriched: ${fieldsAdded.length} added, ${fieldsUpdated.length} updated`);
    console.log(`📈 Completeness: ${oldCompleteness}% → ${newCompleteness}%`);

    return {
      enriched: true,
      fieldsAdded,
      fieldsUpdated,
      conflicts,
      oldCompleteness,
      newCompleteness
    };
  }

  return {
    enriched: false,
    fieldsAdded: [],
    fieldsUpdated: [],
    conflicts,
    oldCompleteness: calculateCompanyCompleteness(existingCompany),
    newCompleteness: calculateCompanyCompleteness(existingCompany)
  };
}

/**
 * Zählt wie oft ein Wert in Varianten vorkommt
 */
function countOccurrences(field: string, value: any, variants: any[]): number {
  return variants.filter(v => v.contactData[field] === value).length;
}

/**
 * Berechnet Vollständigkeits-Score für Company
 */
function calculateCompanyCompleteness(company: any): number {
  let score = 0;
  let total = 0;

  const fields = ['name', 'officialName', 'website', 'phone', 'address', 'email', 'logo', 'socialMedia', 'description'];

  for (const field of fields) {
    total++;
    if (company[field] && (Array.isArray(company[field]) ? company[field].length > 0 : true)) {
      score++;
    }
  }

  return Math.round((score / total) * 100);
}

/**
 * Protokolliert Anreicherung
 */
async function logEnrichment(data: {
  entityType: string;
  entityId: string;
  fieldsAdded: string[];
  fieldsUpdated: string[];
  confidence: number;
  userId: string;
}) {
  await addDoc(collection(db, 'enrichment_logs'), {
    ...data,
    timestamp: serverTimestamp()
  });
}