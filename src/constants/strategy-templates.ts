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
    content: `# Unternehmensprofil & Senderanalyse

## Firmenprofil
### Mission & Vision
*Hier Mission und Vision des Unternehmens eintragen.*

### Werte
*Welche Werte leiten das Handeln des Unternehmens?*

### Alleinstellungsmerkmale (USPs)
*Was macht das Unternehmen und seine Produkte/Dienstleistungen einzigartig?*

## Hintergrundinformationen
- **Gründungsjahr:**
- **Gründer/CEO:**
- **Unternehmensgröße & Standort:**
- **Primäre Produkte/Dienstleistungen:**`
  },
  'situation-analysis': {
    title: 'Situationsanalyse',
    description: 'Eine fundierte Analyse der aktuellen Marktposition, des Wettbewerbsumfelds sowie der internen Stärken und Schwächen.',
    content: `# Situationsanalyse

## Ist-Zustand & Marktposition
### Aktuelle Marktsituation
*Wie ist die aktuelle Lage in Ihrer Branche? Trends, Entwicklungen.*

### Wichtigste Stärken (Strengths)
*Was sind die internen Stärken Ihres Unternehmens?*

### Größte Schwächen (Weaknesses)
*Wo gibt es interne Verbesserungspotenziale?*

### Chancen (Opportunities)
*Welche externen Chancen ergeben sich aus dem Markt?*

### Risiken (Risks)
*Welche externen Risiken könnten das Geschäft beeinträchtigen?*

## Wettbewerbsanalyse
### Hauptkonkurrenten
*Listen Sie Ihre 3-5 wichtigsten Wettbewerber auf.*

### PR-Aktivitäten der Konkurrenz
*Welche PR-Maßnahmen setzen Ihre Wettbewerber um?*

### Unterschiede zur Konkurrenz
*Wie heben Sie sich von der Konkurrenz ab?*`
  },
  'audience-analysis': {
    title: 'Zielgruppenanalyse',
    description: 'Erstellen Sie detaillierte Profile Ihrer Zielgruppen, um die Kommunikation präzise auf ihre Bedürfnisse abzustimmen.',
    content: `# Zielgruppenanalyse

## Primäre Zielgruppe
- **Demografische Merkmale:** (Alter, Geschlecht, Wohnort, Beruf, Einkommen...)
- **Psychografische Merkmale:** (Werte, Interessen, Lebensstil, Meinungen...)
- **Mediennutzung:** (Welche Kanäle, soziale Netzwerke, Publikationen werden genutzt?)
- **Probleme & Bedürfnisse (Pain Points):** (Welche Probleme löst Ihr Angebot für diese Gruppe?)
- **Gewünschte Reaktion (Call to Action):** (Was soll die Zielgruppe nach dem Kontakt mit Ihrer Botschaft tun?)

## Sekundäre Zielgruppe
- **Demografische Merkmale:**
- **Psychografische Merkmale:**
- **Mediennutzung:**
- **Probleme & Bedürfnisse (Pain Points):**
- **Gewünschte Reaktion (Call to Action):**`
  },
  'core-messages': {
    title: 'Kernbotschaften & Kommunikationsziele',
    description: 'Definieren Sie die zentralen Aussagen und die übergeordneten Ziele, die durch die PR-Aktivität erreicht werden sollen.',
    content: `# Kernbotschaften & Kommunikationsziele

## Kommunikationsziele
*Definieren Sie mindestens 3 klar messbare Ziele.*
1. **Ziel 1:** (z.B. Steigerung der Markenbekanntheit in der Zielgruppe X um 15% bis Q4 2025)
2. **Ziel 2:**
3. **Ziel 3:**

## Kernbotschaften
*Formulieren Sie mindestens 3 zentrale Aussagen, die konsistent in der Kommunikation verwendet werden.*
1. **Botschaft 1:**
2. **Botschaft 2:**
3. **Botschaft 3:**`
  }
};