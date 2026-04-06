// src/lib/ai/prompts/press-release/expert-builder.ts
// STORY-FOKUS: DNA als strategisches Werkzeug, nicht als Einschränkung

import {
  extractTonalityOverride,
  extractBlacklist,
  extractKeyMessages
} from '../ai-sequence';

export interface DNAContact {
  id: string;
  name: string;
  position: string;
}

export interface FaktenMatrix {
  hook: { event: string; location: string; date: string; };
  details: { delta: string; evidence: string; };
  quote: { speakerId: string; rawStatement: string; };
}

/**
 * EXPERT PROMPT BUILDER
 *
 * Baut den DNA-spezifischen Teil des Prompts.
 * Fokus: DNA als Story-Werkzeug nutzen, nicht als Regel-Korsett.
 */
export function buildExpertPrompt(
  dnaSynthese: string,
  faktenMatrix: FaktenMatrix,
  dnaContacts: DNAContact[],
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3',
  companyName: string = "{{companyName}}",
  currentDate?: string
): string {
  const tonality = extractTonalityOverride(dnaSynthese);
  const blacklist = extractBlacklist(dnaSynthese);
  const companyLocation = extractCompanyLocation(dnaSynthese);
  const leadDate = currentDate || formatGermanDate(new Date());

  // Speaker finden
  let speaker = findSpeaker(faktenMatrix.quote.speakerId, dnaContacts);

  // DNA-Elemente für Story extrahieren
  const painPoints = extractPainPoints(dnaSynthese);
  const challengerPosition = extractChallengerPosition(dnaSynthese);
  const usps = extractUSPs(dnaSynthese);
  const targetGroupInfo = extractTargetGroupInfo(dnaSynthese, targetGroup);

  return `
═══════════════════════════════════════════════════════════════════
MARKEN-DNA (Dein Story-Werkzeugkasten)
═══════════════════════════════════════════════════════════════════

${dnaSynthese}

═══════════════════════════════════════════════════════════════════
STORY-ELEMENTE AUS DER DNA (Nutze diese aktiv!)
═══════════════════════════════════════════════════════════════════

🎯 PAIN-POINTS DER ZIELGRUPPE (= Dein HOOK):
${painPoints || 'Nicht explizit definiert - aus Kontext ableiten'}
→ Nutze diese als Einstieg! "Tschüss [Klischee]...", "Schluss mit [Problem]..."

⚔️ CHALLENGER-POSITION (= Deine DIFFERENZIERUNG):
${challengerPosition || 'Nicht explizit definiert'}
→ Positioniere gegen Wettbewerber/alte Denkmuster: "Während andere..., setzt X auf..."

💎 USPs (= Deine BEWEISE):
${usps || 'Aus Fakten-Matrix ableiten'}
→ Konkrete Belege statt Marketing-Floskeln

👥 ZIELGRUPPE ${targetGroup || 'ZG1'} (= Deine ANSPRACHE):
${targetGroupInfo || 'Nicht explizit definiert'}
→ Sprich sie direkt an, nenne ihre Bedürfnisse

═══════════════════════════════════════════════════════════════════
FAKTEN-MATRIX (Die harten Facts - erfinde nichts dazu!)
═══════════════════════════════════════════════════════════════════

📍 LEAD-DATEN:
- Firmenstandort: ${companyLocation}
- Datum: ${leadDate}
→ Lead-Format: **${companyLocation}, ${leadDate} – [Kompletter Lead-Satz hier]**
→ Der GESAMTE Lead-Paragraph muss in **Sterne** fuer Bold!

📰 DIE NEWS:
- Was passiert: ${faktenMatrix.hook.event}
- Wo: ${faktenMatrix.hook.location}
- Das Besondere: ${faktenMatrix.details.delta}
- Beweise/Zahlen: ${faktenMatrix.details.evidence}

═══════════════════════════════════════════════════════════════════
ZITAT-VORGABE
═══════════════════════════════════════════════════════════════════

👤 SPRECHER: ${speaker.name}, ${speaker.position} bei ${companyName}
💬 KERNAUSSAGE: "${faktenMatrix.quote.rawStatement}"

→ Formuliere ein lebendiges, authentisches Zitat.
→ Es soll klingen wie ein echter Mensch, nicht wie eine Pressestelle.
→ EXAKTES Format: "Zitat-Text hier", sagt ${speaker.name}, ${speaker.position} bei ${companyName}.
→ KEINE eckigen Klammern verwenden!

${tonality ? `
═══════════════════════════════════════════════════════════════════
TONALITÄT
═══════════════════════════════════════════════════════════════════
${tonality}
` : ''}

${blacklist ? `
═══════════════════════════════════════════════════════════════════
BLACKLIST (Diese Begriffe NICHT verwenden)
═══════════════════════════════════════════════════════════════════
${blacklist}
` : ''}
`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findSpeaker(speakerId: string, dnaContacts: DNAContact[]): DNAContact {
  // Stufe 1: Exakte ID
  let speaker = dnaContacts.find(c => c.id === speakerId);
  if (speaker) return speaker;

  // Stufe 2: Name-Matching
  if (speakerId) {
    const speakerIdParts = speakerId.replace('contact_', '').split('_');
    const nameParts = speakerIdParts.slice(0, -1);

    if (nameParts.length > 0) {
      speaker = dnaContacts.find(c => {
        const contactName = c.name.toLowerCase();
        return nameParts.every(part => contactName.includes(part.toLowerCase()));
      });
      if (speaker) return speaker;
    }
  }

  // Stufe 3: Fallback
  const parts = speakerId.replace('contact_', '').split('_');
  const fallbackName = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Sprecher';
  const fallbackPosition = parts[parts.length - 1]?.charAt(0).toUpperCase() + parts[parts.length - 1]?.slice(1).toLowerCase() || 'Geschäftsführer';

  return { id: speakerId, name: fallbackName, position: fallbackPosition };
}

function formatGermanDate(date: Date): string {
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function extractCompanyLocation(dnaSynthese: string): string {
  // Pattern 1: Sitz
  const sitzMatch = dnaSynthese.match(/(?:Haupt)?[Ss]itz:\s*([^\n,]+)/i);
  if (sitzMatch) return sitzMatch[1].trim();

  // Pattern 2: Adresse
  const addressMatch = dnaSynthese.match(/Adresse:\s*[^,]+,\s*\d{5}\s+([^\n]+)/i);
  if (addressMatch) return addressMatch[1].trim();

  // Pattern 3: PLZ Stadt
  const plzStadtMatch = dnaSynthese.match(/\b\d{5}\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/);
  if (plzStadtMatch) return plzStadtMatch[1].trim();

  return 'Deutschland';
}

/**
 * Extrahiert Pain-Points der Zielgruppen aus der DNA
 */
function extractPainPoints(dnaSynthese: string): string | null {
  // Suche nach Pain-Point/Trigger in der Zielgruppen-Matrix
  const painPointMatch = dnaSynthese.match(/Pain-Point\/Trigger[:\s]+([^\n]+)/gi);
  if (painPointMatch) {
    return painPointMatch.map(p => p.replace(/Pain-Point\/Trigger[:\s]+/i, '').trim()).join('\n- ');
  }

  // Alternative: Suche nach "Image" Problemen
  const imageMatch = dnaSynthese.match(/[Nn]egativ\w*\s+[Ii]mage[^.]+/g);
  if (imageMatch) {
    return imageMatch.join('\n- ');
  }

  return null;
}

/**
 * Extrahiert die Challenger-Positionierung
 */
function extractChallengerPosition(dnaSynthese: string): string | null {
  // Suche nach Marktrolle: Challenger
  if (dnaSynthese.toLowerCase().includes('challenger')) {
    const diffMatch = dnaSynthese.match(/Differenzierung[:\s]+([^\n]+(?:\n[^\n]+)?)/i);
    if (diffMatch) {
      return diffMatch[1].trim();
    }
  }

  // Suche nach "Im Gegensatz zu" Formulierungen
  const contrastMatch = dnaSynthese.match(/[Ii]m\s+[Gg]egensatz\s+zu[^.]+\./g);
  if (contrastMatch) {
    return contrastMatch.join(' ');
  }

  return null;
}

/**
 * Extrahiert USPs aus der DNA
 */
function extractUSPs(dnaSynthese: string): string | null {
  const uspMatch = dnaSynthese.match(/USP[:\s]+([^\n]+(?:\n[^→\n]+)?)/i);
  if (uspMatch) {
    return uspMatch[1].trim();
  }

  // Alternative: Beweis-Zeilen
  const beweisMatch = dnaSynthese.match(/→\s*Beweis[:\s]+([^\n]+)/gi);
  if (beweisMatch) {
    return beweisMatch.map(b => b.replace(/→\s*Beweis[:\s]+/i, '').trim()).join('\n- ');
  }

  return null;
}

/**
 * Extrahiert Zielgruppen-Informationen
 */
function extractTargetGroupInfo(dnaSynthese: string, targetGroup?: string): string | null {
  if (!targetGroup) return null;

  // Suche nach ZG1, ZG2, ZG3 in der Matrix
  const zgPattern = new RegExp(`${targetGroup}\\s+([^\\n]+)`, 'i');
  const zgMatch = dnaSynthese.match(zgPattern);
  if (zgMatch) {
    return zgMatch[1].trim();
  }

  // Suche nach Kernbotschaften für die Zielgruppe
  const kernbotschaftMatch = dnaSynthese.match(new RegExp(`FÜR:\\s*${targetGroup}[^\\n]*`, 'gi'));
  if (kernbotschaftMatch) {
    return kernbotschaftMatch.join('\n');
  }

  return null;
}
