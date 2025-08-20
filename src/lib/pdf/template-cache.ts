// src/lib/pdf/template-cache.ts - Performance-Optimiertes Caching-System für PDF-Templates

import { PDFTemplate } from '@/types/pdf-template';

/**
 * Cache-Konfiguration
 */
interface CacheConfig {
  maxSize: number; // Maximale Anzahl cached Items
  ttl: number; // Time-to-live in Millisekunden
  cleanupInterval: number; // Cleanup-Intervall in Millisekunden
}

/**
 * Cache-Entry mit Metadaten
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  size: number; // Geschätzte Größe in Bytes
}

/**
 * Cache-Statistiken
 */
interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number; // Geschätzte Gesamtgröße in Bytes
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Erweiterte Multi-Level-Cache-Implementation für PDF-Templates
 * Unterstützt Template-Caching, HTML-Caching und CSS-Caching
 */
class TemplateCache {
  private templateCache = new Map<string, CacheEntry<PDFTemplate>>();
  private htmlCache = new Map<string, CacheEntry<string>>();
  private cssCache = new Map<string, CacheEntry<string>>();
  
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    cleanups: 0
  };
  
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 100, // 100 Templates/HTMLs/CSS
      ttl: config.ttl || 30 * 60 * 1000, // 30 Minuten
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000 // 5 Minuten
    };

    // Automatisches Cleanup starten
    this.startCleanup();
    
    console.log('🗄️ Template-Cache initialisiert:', this.config);
  }

  // === TEMPLATE-CACHE ===

  /**
   * Template cachen
   */
  setTemplate(key: string, template: PDFTemplate): void {
    const entry: CacheEntry<PDFTemplate> = {
      data: template,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      size: this.estimateTemplateSize(template)
    };

    this.templateCache.set(key, entry);
    this.enforceMaxSize(this.templateCache);
    
    console.log(`📦 Template gecacht: ${key} (${entry.size} bytes)`);
  }

  /**
   * Template aus Cache abrufen
   */
  getTemplate(key: string): PDFTemplate | null {
    const entry = this.templateCache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // TTL prüfen
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.templateCache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Cache-Hit: Metadaten aktualisieren
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Template-Cache prüfen
   */
  hasTemplate(key: string): boolean {
    const entry = this.templateCache.get(key);
    if (!entry) return false;
    
    // TTL prüfen
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.templateCache.delete(key);
      return false;
    }
    
    return true;
  }

  // === HTML-CACHE ===

  /**
   * Gerenderte HTML cachen
   */
  setHtml(key: string, html: string): void {
    const entry: CacheEntry<string> = {
      data: html,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      size: new Blob([html]).size
    };

    this.htmlCache.set(key, entry);
    this.enforceMaxSize(this.htmlCache);
    
    console.log(`📄 HTML gecacht: ${key} (${entry.size} bytes)`);
  }

  /**
   * HTML aus Cache abrufen
   */
  getHtml(key: string): string | null {
    const entry = this.htmlCache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // TTL prüfen
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.htmlCache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Cache-Hit: Metadaten aktualisieren
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * HTML-Cache-Key generieren
   */
  generateHtmlCacheKey(
    templateId: string, 
    mockDataHash: string, 
    customizationsHash?: string
  ): string {
    return `html_${templateId}_${mockDataHash}_${customizationsHash || 'none'}`;
  }

  // === CSS-CACHE ===

  /**
   * Generierte CSS cachen
   */
  setCss(key: string, css: string): void {
    const entry: CacheEntry<string> = {
      data: css,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      size: new Blob([css]).size
    };

    this.cssCache.set(key, entry);
    this.enforceMaxSize(this.cssCache);
    
    console.log(`🎨 CSS gecacht: ${key} (${entry.size} bytes)`);
  }

  /**
   * CSS aus Cache abrufen
   */
  getCss(key: string): string | null {
    const entry = this.cssCache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // TTL prüfen
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cssCache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Cache-Hit: Metadaten aktualisieren
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * CSS-Cache-Key generieren
   */
  generateCssCacheKey(templateId: string, templateVersion: string): string {
    return `css_${templateId}_${templateVersion}`;
  }

  // === CACHE-MANAGEMENT ===

  /**
   * Maximale Cache-Größe durchsetzen (LRU-Eviction)
   */
  private enforceMaxSize<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size <= this.config.maxSize) return;

    // Sortiere nach lastAccessed (LRU)
    const entries = Array.from(cache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    // Entferne älteste Einträge
    const toRemove = cache.size - this.config.maxSize;
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      cache.delete(key);
      console.log(`🗑️ Cache-Eintrag entfernt (LRU): ${key}`);
    }
  }

  /**
   * Abgelaufene Cache-Einträge bereinigen
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Template-Cache bereinigen
    for (const [key, entry] of this.templateCache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.templateCache.delete(key);
        cleanedCount++;
      }
    }

    // HTML-Cache bereinigen
    for (const [key, entry] of this.htmlCache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.htmlCache.delete(key);
        cleanedCount++;
      }
    }

    // CSS-Cache bereinigen
    for (const [key, entry] of this.cssCache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cssCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.cleanups++;
      console.log(`🧹 Cache-Cleanup: ${cleanedCount} Einträge entfernt`);
    }
  }

  /**
   * Automatisches Cleanup starten
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cache-Statistiken abrufen
   */
  getStats(): CacheStats {
    const totalEntries = this.templateCache.size + this.htmlCache.size + this.cssCache.size;
    const totalRequests = this.stats.hits + this.stats.misses;
    
    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    // Größen und Zeitstempel berechnen
    [this.templateCache, this.htmlCache, this.cssCache].forEach(cache => {
      for (const entry of cache.values()) {
        totalSize += entry.size;
        oldestEntry = Math.min(oldestEntry, entry.timestamp);
        newestEntry = Math.max(newestEntry, entry.timestamp);
      }
    });

    return {
      size: totalEntries,
      maxSize: this.config.maxSize * 3, // 3 Caches
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      totalSize,
      oldestEntry: oldestEntry === Date.now() ? 0 : oldestEntry,
      newestEntry
    };
  }

  /**
   * Detaillierte Cache-Analyse
   */
  analyze(): {
    templateCache: any;
    htmlCache: any;
    cssCache: any;
    performance: any;
  } {
    const stats = this.getStats();
    
    return {
      templateCache: {
        size: this.templateCache.size,
        entries: Array.from(this.templateCache.entries()).map(([key, entry]) => ({
          key,
          age: Date.now() - entry.timestamp,
          lastAccessed: Date.now() - entry.lastAccessed,
          accessCount: entry.accessCount,
          size: entry.size
        }))
      },
      htmlCache: {
        size: this.htmlCache.size,
        averageSize: this.calculateAverageSize(this.htmlCache)
      },
      cssCache: {
        size: this.cssCache.size,
        averageSize: this.calculateAverageSize(this.cssCache)
      },
      performance: {
        hitRate: stats.hitRate,
        totalSize: stats.totalSize,
        cleanupRuns: this.stats.cleanups
      }
    };
  }

  /**
   * Alle Caches bereinigen
   */
  clear(): void {
    this.templateCache.clear();
    this.htmlCache.clear();
    this.cssCache.clear();
    
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.cleanups = 0;
    
    console.log('🧹 Alle Caches bereinigt');
  }

  /**
   * Spezifischen Cache bereinigen
   */
  clearCache(type: 'template' | 'html' | 'css' | 'all'): void {
    switch (type) {
      case 'template':
        this.templateCache.clear();
        console.log('🧹 Template-Cache bereinigt');
        break;
      case 'html':
        this.htmlCache.clear();
        console.log('🧹 HTML-Cache bereinigt');
        break;
      case 'css':
        this.cssCache.clear();
        console.log('🧹 CSS-Cache bereinigt');
        break;
      case 'all':
        this.clear();
        break;
    }
  }

  /**
   * Cache warm-up mit häufig verwendeten Templates
   */
  async warmUp(frequentTemplateIds: string[]): Promise<void> {
    console.log('🔥 Cache Warm-Up gestartet...');
    
    // Hier könnten Templates vorgeladen werden
    // Das ist abhängig von der konkreten Implementation des Template-Services
    
    console.log(`🔥 Cache Warm-Up abgeschlossen für ${frequentTemplateIds.length} Templates`);
  }

  /**
   * Cache-Memory-Pressure-Management
   */
  handleMemoryPressure(): void {
    const stats = this.getStats();
    
    if (stats.totalSize > 50 * 1024 * 1024) { // 50MB
      console.log('⚠️ Memory-Pressure erkannt, reduziere Cache-Größe...');
      
      // Reduziere Cache-Größe um 50%
      this.config.maxSize = Math.max(10, Math.floor(this.config.maxSize * 0.5));
      
      // Forciere Cleanup
      this.enforceMaxSize(this.templateCache);
      this.enforceMaxSize(this.htmlCache);
      this.enforceMaxSize(this.cssCache);
      
      console.log(`✅ Cache-Größe reduziert auf ${this.config.maxSize} pro Cache`);
    }
  }

  /**
   * Cleanup stoppen
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
    console.log('💀 Template-Cache zerstört');
  }

  // === PRIVATE HELPER ===

  /**
   * Template-Größe schätzen
   */
  private estimateTemplateSize(template: PDFTemplate): number {
    try {
      return new Blob([JSON.stringify(template)]).size;
    } catch {
      return 1024; // 1KB Fallback
    }
  }

  /**
   * Durchschnittliche Cache-Größe berechnen
   */
  private calculateAverageSize<T>(cache: Map<string, CacheEntry<T>>): number {
    if (cache.size === 0) return 0;
    
    const totalSize = Array.from(cache.values()).reduce(
      (sum, entry) => sum + entry.size, 
      0
    );
    
    return Math.round(totalSize / cache.size);
  }

  /**
   * Hash für Objekte generieren (einfache Implementation)
   */
  static generateHash(obj: any): string {
    try {
      const str = JSON.stringify(obj);
      let hash = 0;
      
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return Math.abs(hash).toString(36);
    } catch {
      return Date.now().toString(36);
    }
  }
}

// Export Singleton-Instanz
export const templateCache = new TemplateCache({
  maxSize: 50, // 50 Templates/HTMLs/CSS pro Cache
  ttl: 15 * 60 * 1000, // 15 Minuten
  cleanupInterval: 3 * 60 * 1000 // 3 Minuten Cleanup-Intervall
});

// Export Klasse für Tests
export { TemplateCache };
export type { CacheStats, CacheConfig };