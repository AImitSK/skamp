// src/lib/ai/prompts/press-release/expert-builder.ts
// EXPERT BUILDER: Fokus auf Lead-Schutz und Zitat-Echtheit

import {
  extractTonalityOverride,
  extractBlacklist,
  extractKeyMessages
} from '../ai-sequence';

export interface DNAContact {
  id: string;
  name: string;
  position: string;
  expertise?: string;
}

export interface FaktenMatrix {
  hook: { event: string; location: string; date: string; };
  details: { delta: string; evidence: string; };
  quote: { speakerId: string; rawStatement: string; };
}

/**
 * VERBESSERUNG: Einführung der "Inhalts-Hierarchie"
 * News (Ebene 3) führt den Text an, DNA (Ebene 1) gibt den Sound.
 */
export function buildExpertPrompt(
  dnaSynthese: string,
  faktenMatrix: FaktenMatrix,
  dnaContacts: DNAContact[],
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3'
): string {
  const tonality = extractTonalityOverride(dnaSynthese);
  const blacklist = extractBlacklist(dnaSynthese);
  const keyMessages = extractKeyMessagesForTargetGroup(dnaSynthese, targetGroup);

  // Zitatgeber-Mapping
  const speaker = dnaContacts.find(c => c.id === faktenMatrix.quote.speakerId) || {
    name: "Sprecher",
    position: "Geschäftsführung"
  };

  return `
═══════════════════════════════════════════════════════════════════
MISSION: NEWS-FOKUS (Priorität 1)
═══════════════════════════════════════════════════════════════════
Deine Hauptaufgabe ist die Meldung über das AKTUELLE EREIGNIS.
Allgemeine Informationen aus der MARKEN-DNA dienen nur als Hintergrund.

═══════════════════════════════════════════════════════════════════
FAKTEN FÜR DIESE PRESSEMELDUNG
═══════════════════════════════════════════════════════════════════

**Ereignis:** ${faktenMatrix.hook.event}
**Ort:** ${faktenMatrix.hook.location}
**Datum:** ${faktenMatrix.hook.date}
**Das Delta:** ${faktenMatrix.details.delta}
**Beweis-Daten:** ${faktenMatrix.details.evidence}

═══════════════════════════════════════════════════════════════════
ZITATGEBER (FEST - NICHT ÄNDERN!)
═══════════════════════════════════════════════════════════════════

Name: ${speaker.name}
Position: ${speaker.position}
Kern-Aussage für Zitat: ${faktenMatrix.quote.rawStatement}

${tonality ? `
═══════════════════════════════════════════════════════════════════
TONALITÄT (aus DNA)
═══════════════════════════════════════════════════════════════════
${tonality}
` : ''}

${keyMessages ? `
═══════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN FÜR ${targetGroup || 'ALLE'}
═══════════════════════════════════════════════════════════════════
${keyMessages}
` : ''}

${blacklist ? `
═══════════════════════════════════════════════════════════════════
🚫 BLACKLIST (NIEMALS VERWENDEN)
═══════════════════════════════════════════════════════════════════
${blacklist}
` : ''}

═══════════════════════════════════════════════════════════════════
PRÄZISIONSHINWEIS
═══════════════════════════════════════════════════════════════════
Schreibe den Lead-Absatz (Zeile 2) EXAKT über das EREIGNIS und das DELTA.
Wiederhole keine allgemeinen Firmenfloskeln im Lead.
`;
}

function extractKeyMessagesForTargetGroup(dnaSynthese: string, targetGroup?: string): string | null {
  const allMessages = extractKeyMessages(dnaSynthese);
  if (!allMessages || !targetGroup) return allMessages;
  return allMessages.split('\n')
    .filter(line => line.includes(`FÜR: ${targetGroup}`) || !line.includes('FÜR:'))
    .join('\n');
}
