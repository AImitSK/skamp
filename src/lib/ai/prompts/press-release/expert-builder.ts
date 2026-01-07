// src/lib/ai/prompts/press-release/expert-builder.ts
// FOKUS: Inhaltliche Logik, Story-Struktur und Identitäts-Sicherung

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
 * STRATEGISCHES EXPERTEN-GEHIRN
 * Implementiert die inhaltliche Hierarchie: Fakten-Matrix > DNA-Stil.
 * Eliminiert PR-Floskeln durch eine zwingende Story-Abfolge.
 */
export function buildExpertPrompt(
  dnaSynthese: string,
  faktenMatrix: FaktenMatrix,
  dnaContacts: DNAContact[],
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3',
  companyName: string = "{{companyName}}"
): string {
  const tonality = extractTonalityOverride(dnaSynthese);
  const blacklist = extractBlacklist(dnaSynthese);
  const keyMessages = extractKeyMessagesForTargetGroup(dnaSynthese, targetGroup);
  const companyData = extractCompanyData(dnaSynthese);

  // Speaker finden: Erst nach ID, dann nach Name-Pattern aus speakerId
  let speaker = dnaContacts.find(c => c.id === faktenMatrix.quote.speakerId);

  // Fallback: Name aus speakerId extrahieren und matchen (Format: contact_vorname_nachname_position)
  if (!speaker && faktenMatrix.quote.speakerId) {
    const speakerIdParts = faktenMatrix.quote.speakerId.replace('contact_', '').split('_');
    // Name-Teile (alles außer letztem Part = Position)
    const nameParts = speakerIdParts.slice(0, -1);
    const searchName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

    speaker = dnaContacts.find(c => {
      const contactName = c.name.toLowerCase();
      return nameParts.every(part => contactName.includes(part.toLowerCase()));
    });
  }

  // Letzter Fallback: Default-Werte
  if (!speaker) {
    speaker = { name: "Sprecher", position: "Geschäftsführung" };
  }

  return `
═══════════════════════════════════════════════════════════════════
STRIKTE INHALTS-KONTROLLE (ANTI-HALLUZINATION)
═══════════════════════════════════════════════════════════════════
Nutze NUR Fakten aus der MATRIX und den Sound aus der DNA.
- Erfinde KEINE strategischen Pläne (z.B. "Expansion in andere Länder").
- Erfinde KEINE falschen Hoffnungen oder PR-Floskeln.
- Schreibe FAKTISCH und PRÄZISE.

═══════════════════════════════════════════════════════════════════
STRUKTUR-GESETZ (Folge diesem Ablauf)
═══════════════════════════════════════════════════════════════════
1. LEAD (Zeile 2): Das aktuelle Ereignis (Das Delta). MUSS in **Sterne**.
2. KONTEXT: Bedeutung der Nachricht und Vorstellung der handelnden Experten.
3. MEHRWERT: Technischer Nutzen und konkrete Vorteile (Engineering-Fokus).
4. KOMMUNIKATION: Umsetzung vor Ort (Sprache, Zeit, Erreichbarkeit).
5. ZITAT (Zeile 6): Strategische Einordnung durch den Experten.
6. ABSCHLUSS: Der Anspruch der Marke ${companyName}.

═══════════════════════════════════════════════════════════════════
FAKTEN-MATRIX (Inhaltliche Wahrheit)
═══════════════════════════════════════════════════════════════════
- EREIGNIS: ${faktenMatrix.hook.event}
- KONTEXT: ${faktenMatrix.details.delta}
- BEWEISE: ${faktenMatrix.details.evidence}

═══════════════════════════════════════════════════════════════════
ZITAT-VORGABE (Echte Identität)
═══════════════════════════════════════════════════════════════════
SPRECHER: ${speaker.name}, ${speaker.position}
KERNBOTSCHAFT: ${faktenMatrix.quote.rawStatement}

REGEL: Formuliere ein lebendiges Zitat. Nutze KEINE eckigen Klammern [ ].
Format: "Text", sagt ${speaker.name}, ${speaker.position} bei ${companyName}.

═══════════════════════════════════════════════════════════════════
DNA-STIL & TON (Leitplanken)
═══════════════════════════════════════════════════════════════════
SOUND: ${tonality || 'Sachlich-technisch'}
BLACKLIST (VERBOTEN): ${blacklist || 'Keine'}
NUTZE FOLGENDEN KONTEXT: ${keyMessages || ''}

${companyData ? `
═══════════════════════════════════════════════════════════════════
FIRMENSTAMMDATEN (EXAKT ÜBERNEHMEN!)
═══════════════════════════════════════════════════════════════════
${companyData}

WICHTIG: Verwende den Firmenstandort aus diesen Daten für den Lead!
` : ''}
`;
}

function extractKeyMessagesForTargetGroup(dnaSynthese: string, targetGroup?: string): string | null {
  const allMessages = extractKeyMessages(dnaSynthese);
  if (!allMessages || !targetGroup) return allMessages;
  return allMessages.split('\n')
    .filter(line => line.includes(`FÜR: ${targetGroup}`) || !line.includes('FÜR:'))
    .join('\n');
}

/**
 * Extrahiert Firmenstammdaten aus der DNA-Synthese
 * Sucht nach "📍 FIRMENSTAMMDATEN" Block
 */
function extractCompanyData(dnaSynthese: string): string | null {
  // Pattern für Firmenstammdaten-Block
  const pattern = /📍\s*FIRMENSTAMMDATEN[^:]*:?\s*([\s\S]*?)(?=\n\n[A-Z📋💬🎯]|$)/i;
  const match = dnaSynthese.match(pattern);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: Suche nach "Adresse:" Zeile
  const addressMatch = dnaSynthese.match(/Adresse:\s*([^\n]+)/i);
  if (addressMatch) {
    return `Adresse: ${addressMatch[1].trim()}`;
  }

  return null;
}
