// src/components/pr/ai/structured-generation/utils/template-categorizer.ts
/**
 * Utils für Template-Kategorisierung und Beschreibungs-Extraktion
 *
 * Extrahiert aus StructuredGenerationModal.tsx für bessere Wiederverwendbarkeit.
 */

import { AITemplate } from '@/types/ai';

/**
 * Kategorisiert ein Template basierend auf dem Titel
 *
 * Analysiert den Template-Titel und ordnet ihn einer passenden Kategorie zu.
 *
 * @param title - Der Titel des Templates
 * @returns Die zugehörige Template-Kategorie
 *
 * @example
 * ```typescript
 * categorizeTemplate('Produktlaunch') // → 'product'
 * categorizeTemplate('Partner-Ankündigung') // → 'partnership'
 * categorizeTemplate('Quartalszahlen') // → 'finance'
 * ```
 */
export function categorizeTemplate(title: string): AITemplate['category'] {
  if (title.includes('Produkt')) return 'product';
  if (title.includes('Partner')) return 'partnership';
  if (title.includes('Finanz')) return 'finance';
  if (title.includes('Auszeichnung') || title.includes('Award')) return 'corporate';
  if (title.includes('Führung') || title.includes('Personal')) return 'corporate';
  if (title.includes('Event')) return 'event';
  if (title.includes('Forschung') || title.includes('Studie')) return 'research';
  return 'corporate';
}

/**
 * Extrahiert eine Beschreibung aus einem Template-Prompt
 *
 * Versucht, die erste Zeile des Prompts als Beschreibung zu nutzen.
 * Wenn die Zeile ein Kolon enthält, wird der Teil nach dem Kolon verwendet.
 * Andernfalls werden die ersten 100 Zeichen zurückgegeben.
 *
 * @param prompt - Der vollständige Template-Prompt
 * @returns Eine kurze Beschreibung des Templates
 *
 * @example
 * ```typescript
 * extractDescription('Ziel: Produktlaunch ankündigen\n...') // → 'Produktlaunch ankündigen'
 * extractDescription('Erstelle eine PM für...') // → 'Erstelle eine PM für...' (gekürzt auf 100 Zeichen)
 * ```
 */
export function extractDescription(prompt: string): string {
  const lines = prompt.split('\n');
  const firstLine = lines[0];

  if (firstLine.includes(':')) {
    return firstLine.split(':')[1].trim();
  }

  return firstLine.substring(0, 100) + '...';
}
