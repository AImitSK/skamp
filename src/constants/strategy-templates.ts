// src/constants/strategy-templates.ts
export type TemplateType = 'blank' | 'table' | 'company-profile' | 'situation-analysis' | 'audience-analysis' | 'core-messages';

export interface StrategyTemplate {
  title: string;
  description: string;
  content: string;
}

export const STRATEGY_TEMPLATES: Record<TemplateType, StrategyTemplate> = {
  'blank': {
    title: 'Neues Dokument erstellen',
    description: 'Beginnen Sie mit einem leeren Blatt für Ihre Notizen und Ideen.',
    content: ''
  },
  'table': {
    title: 'Leere Tabelle erstellen',
    description: 'Strukturieren Sie Ihre Daten in einer einfachen Tabelle.',
    content: `# Neue Tabelle

| Spalte 1 | Spalte 2 | Spalte 3 |
|----------|----------|----------|
|          |          |          |
|          |          |          |
|          |          |          |`
  },
  'company-profile': {
    title: 'Unternehmensprofil & Senderanalyse',
    description: 'Erfassen Sie die Kernfakten des Absenders, die als Grundlage für die gesamte Kommunikation dienen.',
    content: `<h1>Unternehmensprofil & Senderanalyse</h1>
<h2>Firmenprofil</h2>
<h3>Mission & Vision</h3>
<p><em>Hier Mission und Vision des Unternehmens eintragen.</em></p>
<h3>Werte</h3>
<p><em>Welche Werte leiten das Handeln des Unternehmens?</em></p>
<h3>Alleinstellungsmerkmale (USPs)</h3>
<p><em>Was macht das Unternehmen und seine Produkte/Dienstleistungen einzigartig?</em></p>
<h2>Hintergrundinformationen</h2>
<ul>
<li><strong>Gründungsjahr:</strong></li>
<li><strong>Gründer/CEO:</strong></li>
<li><strong>Unternehmensgröße & Standort:</strong></li>
<li><strong>Primäre Produkte/Dienstleistungen:</strong></li>
</ul>`
  },
  'situation-analysis': {
    title: 'Situationsanalyse',
    description: 'Eine fundierte Analyse der aktuellen Marktposition, des Wettbewerbsumfelds sowie der internen Stärken und Schwächen.',
    content: `<h1>Situationsanalyse</h1>
<h2>Ist-Zustand & Marktposition</h2>
<h3>Aktuelle Marktsituation</h3>
<p><em>Wie ist die aktuelle Lage in Ihrer Branche? Trends, Entwicklungen.</em></p>
<h3>Wichtigste Stärken (Strengths)</h3>
<p><em>Was sind die internen Stärken Ihres Unternehmens?</em></p>
<h3>Größte Schwächen (Weaknesses)</h3>
<p><em>Wo gibt es interne Verbesserungspotenziale?</em></p>
<h3>Chancen (Opportunities)</h3>
<p><em>Welche externen Chancen ergeben sich aus dem Markt?</em></p>
<h3>Risiken (Risks)</h3>
<p><em>Welche externen Risiken könnten das Geschäft beeinträchtigen?</em></p>
<h2>Wettbewerbsanalyse</h2>
<h3>Hauptkonkurrenten</h3>
<p><em>Listen Sie Ihre 3-5 wichtigsten Wettbewerber auf.</em></p>
<h3>PR-Aktivitäten der Konkurrenz</h3>
<p><em>Welche PR-Maßnahmen setzen Ihre Wettbewerber um?</em></p>
<h3>Unterschiede zur Konkurrenz</h3>
<p><em>Wie heben Sie sich von der Konkurrenz ab?</em></p>`
  },
  'audience-analysis': {
    title: 'Zielgruppenanalyse',
    description: 'Erstellen Sie detaillierte Profile Ihrer Zielgruppen, um die Kommunikation präzise auf ihre Bedürfnisse abzustimmen.',
    content: `<h1>Zielgruppenanalyse</h1>
<h2>Primäre Zielgruppe</h2>
<ul>
<li><strong>Demografische Merkmale:</strong> (Alter, Geschlecht, Wohnort, Beruf, Einkommen...)</li>
<li><strong>Psychografische Merkmale:</strong> (Werte, Interessen, Lebensstil, Meinungen...)</li>
<li><strong>Mediennutzung:</strong> (Welche Kanäle, soziale Netzwerke, Publikationen werden genutzt?)</li>
<li><strong>Probleme & Bedürfnisse (Pain Points):</strong> (Welche Probleme löst Ihr Angebot für diese Gruppe?)</li>
<li><strong>Gewünschte Reaktion (Call to Action):</strong> (Was soll die Zielgruppe nach dem Kontakt mit Ihrer Botschaft tun?)</li>
</ul>
<h2>Sekundäre Zielgruppe</h2>
<ul>
<li><strong>Demografische Merkmale:</strong></li>
<li><strong>Psychografische Merkmale:</strong></li>
<li><strong>Mediennutzung:</strong></li>
<li><strong>Probleme & Bedürfnisse (Pain Points):</strong></li>
<li><strong>Gewünschte Reaktion (Call to Action):</strong></li>
</ul>`
  },
  'core-messages': {
    title: 'Kernbotschaften & Kommunikationsziele',
    description: 'Definieren Sie die zentralen Aussagen und die übergeordneten Ziele, die durch die PR-Aktivität erreicht werden sollen.',
    content: `<h1>Kernbotschaften & Kommunikationsziele</h1>
<h2>Kommunikationsziele</h2>
<p><em>Definieren Sie mindestens 3 klar messbare Ziele.</em></p>
<ol>
<li><strong>Ziel 1:</strong> (z.B. Steigerung der Markenbekanntheit in der Zielgruppe X um 15% bis Q4 2025)</li>
<li><strong>Ziel 2:</strong></li>
<li><strong>Ziel 3:</strong></li>
</ol>
<h2>Kernbotschaften</h2>
<p><em>Formulieren Sie mindestens 3 zentrale Aussagen, die konsistent in der Kommunikation verwendet werden.</em></p>
<ol>
<li><strong>Botschaft 1:</strong></li>
<li><strong>Botschaft 2:</strong></li>
<li><strong>Botschaft 3:</strong></li>
</ol>`
  }
};