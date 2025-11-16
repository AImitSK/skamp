import type { MediaClipping } from '@/types/monitoring';
import type { TimelineData } from '../types';

/**
 * Timeline Builder für Monitoring Reports
 *
 * Aggregiert Clippings nach Datum für Timeline-Visualisierung
 */
export class TimelineBuilder {
  /**
   * Baut Timeline aus Clippings
   *
   * Gruppiert Clippings nach Veröffentlichungsdatum und berechnet:
   * - Anzahl Clippings pro Tag
   * - Gesamt-Reichweite pro Tag
   *
   * @param clippings - Media Clippings
   * @returns Timeline Data (sortiert nach Datum)
   */
  buildTimeline(clippings: MediaClipping[]): TimelineData[] {
    // Gruppierung nach Datum
    const groupedByDate = clippings.reduce((acc, clipping) => {
      if (!clipping.publishedAt || !clipping.publishedAt.toDate) {
        return acc;
      }

      const date = clipping.publishedAt.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = { date, clippings: 0, reach: 0 };
      }

      acc[date].clippings += 1;
      acc[date].reach += clipping.reach || 0;

      return acc;
    }, {} as Record<string, TimelineData>);

    // Nach Datum sortieren
    return Object.values(groupedByDate).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Aggregiert Timeline nach Wochen (optional, für lange Zeiträume)
   *
   * @param clippings - Media Clippings
   * @returns Timeline Data (wöchentlich)
   */
  buildWeeklyTimeline(clippings: MediaClipping[]): TimelineData[] {
    const groupedByWeek = clippings.reduce((acc, clipping) => {
      if (!clipping.publishedAt || !clipping.publishedAt.toDate) {
        return acc;
      }

      const date = clipping.publishedAt.toDate();
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[weekKey]) {
        acc[weekKey] = { date: weekKey, clippings: 0, reach: 0 };
      }

      acc[weekKey].clippings += 1;
      acc[weekKey].reach += clipping.reach || 0;

      return acc;
    }, {} as Record<string, TimelineData>);

    return Object.values(groupedByWeek).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Hilfsfunktion: Berechnet Wochenanfang (Montag)
   */
  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Montag
    return new Date(date.setDate(diff));
  }
}

// Singleton Export
export const timelineBuilder = new TimelineBuilder();
