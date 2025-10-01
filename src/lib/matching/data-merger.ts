/**
 * Data Merger Service für intelligente Kontakt-Daten Zusammenführung
 *
 * Implementierung basierend auf intelligent-matching-enrichment.md
 * Zeilen 1049-1175
 */

import { MatchingCandidateVariant } from '@/types/matching';

export interface MergedContactData {
  name: {
    title?: string;
    firstName: string;
    lastName: string;
    suffix?: string;
  };
  displayName: string;
  emails: Array<{ email: string; type: string; isPrimary: boolean }>;
  phones?: Array<{ number: string; type: string; isPrimary: boolean }>;
  position?: string;
  department?: string;
  beats?: string[];
  mediaTypes?: string[];
  socialProfiles?: Array<{ platform: string; url: string; handle?: string }>;
  website?: string;
  photoUrl?: string;
}

/**
 * Merged mehrere Varianten intelligent mit KI
 */
export async function mergeVariantsWithAI(
  variants: MatchingCandidateVariant[]
): Promise<MergedContactData> {

  if (variants.length === 1) {
    // Keine Merge nötig
    return variants[0].contactData as MergedContactData;
  }

  console.log(`🤖 Merging ${variants.length} variants with AI...`);

  try {
    // ✅ Ruft dedizierte API Route auf (nicht direkt GoogleGenerativeAI!)
    const response = await fetch('/api/ai/merge-variants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ variants })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'KI-Merge fehlgeschlagen');
    }

    console.log('✅ AI merge successful');
    return result.mergedData;

  } catch (error) {
    console.error('❌ AI merge failed, falling back to mechanical merge:', error);

    // Fallback: Mechanisches Merge
    return mechanicalMerge(variants);
  }
}

/**
 * Fallback: Mechanisches Merge (falls KI fehlschlägt)
 */
function mechanicalMerge(variants: MatchingCandidateVariant[]): MergedContactData {

  // Wähle vollständigste Variante als Basis
  const baseVariant = variants.reduce((best, current) => {
    const bestScore = calculateCompletenessScore(best.contactData);
    const currentScore = calculateCompletenessScore(current.contactData);
    return currentScore > bestScore ? current : best;
  });

  const merged = { ...baseVariant.contactData };

  // Kombiniere Beats
  const allBeats = new Set<string>();
  variants.forEach(v => {
    v.contactData.beats?.forEach(beat => allBeats.add(beat));
  });
  merged.beats = Array.from(allBeats);

  // Kombiniere Media Types
  const allMediaTypes = new Set<string>();
  variants.forEach(v => {
    v.contactData.mediaTypes?.forEach(type => allMediaTypes.add(type));
  });
  merged.mediaTypes = Array.from(allMediaTypes);

  // Kombiniere Social Profiles (ohne Duplikate)
  const allProfiles = new Map<string, any>();
  variants.forEach(v => {
    v.contactData.socialProfiles?.forEach(profile => {
      const key = `${profile.platform}-${profile.url}`;
      if (!allProfiles.has(key)) {
        allProfiles.set(key, profile);
      }
    });
  });
  merged.socialProfiles = Array.from(allProfiles.values());

  return merged as MergedContactData;
}

function calculateCompletenessScore(data: any): number {
  let score = 0;
  if (data.emails?.length) score += 20;
  if (data.phones?.length) score += 15;
  if (data.position) score += 10;
  if (data.companyName) score += 15;
  if (data.website) score += 10;
  if (data.beats?.length) score += 10;
  if (data.socialProfiles?.length) score += 10;
  if (data.hasMediaProfile) score += 10;
  return score;
}