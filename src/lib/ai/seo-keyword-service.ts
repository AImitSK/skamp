// src/lib/ai/seo-keyword-service.ts
// Auto-Keyword-Detection Service für SEO-Features

interface KeywordDetectionOptions {
  maxKeywords?: number;
  minWordLength?: number;
  excludeCommonWords?: boolean;
  debounceMs?: number;
}

interface KeywordResult {
  keywords: string[];
  confidence: number;
  detectedAt: Date;
  textLength: number;
}

interface KeywordAnalytics {
  keyword: string;
  density: number;
  occurrences: number;
  positions: number[];
}

// Neue Interfaces für Pro-Keyword-Metriken
export interface PerKeywordMetrics {
  keyword: string;
  
  // Basis-Metriken (ohne KI)
  density: number;              // 0.5-2% optimal für PR
  occurrences: number;
  inHeadline: boolean;
  inFirstParagraph: boolean;
  distribution: 'gut' | 'mittel' | 'schlecht';
  
  // KI-Metriken (nur bei Aktualisieren)
  semanticRelevance?: number;   // 0-100
  contextQuality?: number;       // 0-100
  relatedTermsFound?: string[];
  keywordStrength?: 'stark' | 'mittel' | 'schwach';
}

// PR-spezifische Metriken
export interface PRMetrics {
  // Headline-Qualität
  headlineLength: number;
  headlineHasKeywords: boolean;
  headlineHasActiveVerb: boolean;
  
  // Lead-Analyse (erste 150 Zeichen)
  leadLength: number;
  leadHasNumbers: boolean;
  leadKeywordMentions: number;
  
  // Zitat-Erkennung
  quoteCount: number;
  avgQuoteLength: number;
  
  // Call-to-Action (im Text)
  hasActionVerbs: boolean;
  hasLearnMore: boolean;
  
  // Struktur
  avgParagraphLength: number;
  hasBulletPoints: boolean;
  hasSubheadings: boolean;
  
  // Konkretheit
  numberCount: number;
  hasSpecificDates: boolean;
  hasCompanyNames: boolean;
}

class SEOKeywordService {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, KeywordResult> = new Map();
  private readonly defaultOptions: Required<KeywordDetectionOptions> = {
    maxKeywords: 5,
    minWordLength: 3,
    excludeCommonWords: true,
    debounceMs: 2000
  };

  /**
   * Automatische Keyword-Erkennung aus Text via KI
   */
  async detectKeywords(
    text: string, 
    options: KeywordDetectionOptions = {}
  ): Promise<KeywordResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Validierung
    if (!text || text.trim().length < 50) {
      return {
        keywords: [],
        confidence: 0,
        detectedAt: new Date(),
        textLength: text.length
      };
    }

    // Cache-Check
    const cacheKey = this.generateCacheKey(text, opts);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // KI-Prompt für Keyword-Erkennung
      const prompt = this.buildKeywordDetectionPrompt(text, opts);
      
      // Removed verbose logging for better performance
      
      // API-Call zur bestehenden KI-Integration
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          mode: 'generate', // Required by API route
          context: {
            tone: 'professional'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`KI-API Fehler: ${response.status}`);
      }

      const data = await response.json();
      const rawKeywords = data.generatedText || data.content || data.text || '';
      
      console.log('🎯 SEO Service: Raw API response:', { 
        fullResponse: data, 
        rawKeywords,
        success: data.success 
      });
      
      // Parse und validiere Keywords
      const keywords = this.parseAndValidateKeywords(rawKeywords, opts);
      const confidence = this.calculateConfidence(keywords, text);

      // Keyword detection completed successfully

      const result: KeywordResult = {
        keywords,
        confidence,
        detectedAt: new Date(),
        textLength: text.length
      };

      // Cache-Speicherung (5 Minuten)
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

      return result;

    } catch (error) {
      console.error('Keyword-Detection Fehler:', error);
      
      // Fallback: Einfache Keyword-Extraktion ohne KI
      const fallbackKeywords = this.extractKeywordsFallback(text, opts);
      
      return {
        keywords: fallbackKeywords,
        confidence: 0.3, // Niedrige Confidence für Fallback
        detectedAt: new Date(),
        textLength: text.length
      };
    }
  }

  /**
   * Debounced Keyword-Detection für Live-Eingabe
   */
  async detectKeywordsDebounced(
    text: string,
    sessionId: string,
    callback: (result: KeywordResult) => void,
    options: KeywordDetectionOptions = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const result = await this.detectKeywords(text, opts);
        callback(result);
      } catch (error) {
        console.error('Debounced keyword detection error:', error);
        callback({
          keywords: [],
          confidence: 0,
          detectedAt: new Date(),
          textLength: text.length
        });
      } finally {
        this.debounceTimers.delete(sessionId);
      }
    }, opts.debounceMs);

    this.debounceTimers.set(sessionId, timer);
  }

  /**
   * Berechne Keyword-Dichte und Analytik
   */
  analyzeKeywords(text: string, keywords: string[]): KeywordAnalytics[] {
    // HTML-Tags entfernen für korrekte Wortzählung
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    
    // Keyword analysis in progress

    return keywords.map(keyword => {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${this.escapeRegex(keywordLower)}\\b`, 'gi');
      const matches = [...cleanText.matchAll(regex)];
      const density = totalWords > 0 ? (matches.length / totalWords) * 100 : 0;
      
      // Keyword metrics calculated
      
      // Filter unrealistic keyword density values
      if (density > 15) {
        console.log(`⚙️ PR-SEO: Filtering unrealistic density for "${keyword}": ${density.toFixed(1)}%`);
        return null; // This will be filtered out
      }
      
      return {
        keyword,
        density,
        occurrences: matches.length,
        positions: matches.map(match => match.index || 0)
      };
    }).filter(result => result !== null);
  }

  /**
   * Berechne deutsche Textlesbarkeit (angepasster Flesch-Index)
   */
  calculateReadability(text: string): { score: number; level: string } {
    if (!text || text.length < 10) {
      return { score: 0, level: 'Unbekannt' };
    }

    // Text bereinigen
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Sätze zählen (. ! ? als Satzende)
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    
    // Wörter zählen
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Silben zählen (vereinfachte deutsche Silbenzählung)
    let syllableCount = 0;
    words.forEach(word => {
      syllableCount += this.countGermanSyllables(word);
    });
    
    if (sentenceCount === 0 || wordCount === 0) {
      return { score: 0, level: 'Unbekannt' };
    }
    
    // ASL = Durchschnittliche Satzlänge
    const averageSentenceLength = wordCount / sentenceCount;
    
    // ASW = Durchschnittliche Silben pro Wort
    const averageSyllablesPerWord = syllableCount / wordCount;
    
    // Deutsche Flesch-Formel: 180 - (ASL × 1.0) - (ASW × 58.5)
    const fleschScore = 180 - (averageSentenceLength * 1.0) - (averageSyllablesPerWord * 58.5);
    
    // Score auf 0-100 begrenzen
    const normalizedScore = Math.max(0, Math.min(100, fleschScore));
    
    // Level bestimmen
    let level: string;
    if (normalizedScore >= 90) level = 'Sehr leicht';
    else if (normalizedScore >= 80) level = 'Leicht';
    else if (normalizedScore >= 65) level = 'Normal';
    else if (normalizedScore >= 50) level = 'Etwas schwer';
    else if (normalizedScore >= 30) level = 'Schwer';
    else level = 'Sehr schwer';
    
    return { score: Math.round(normalizedScore), level };
  }

  /**
   * Vereinfachte deutsche Silbenzählung
   */
  private countGermanSyllables(word: string): number {
    if (!word || word.length === 0) return 0;
    
    const cleanWord = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
    if (cleanWord.length === 0) return 1;
    
    // Deutsche Vokale (inkl. Umlaute)
    const vowels = 'aeiouäöüy';
    let syllables = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i];
      const isVowel = vowels.includes(char);
      
      if (isVowel && !previousWasVowel) {
        syllables++;
      }
      
      previousWasVowel = isVowel;
    }
    
    // Deutsche Sonderregeln
    if (cleanWord.endsWith('e') && syllables > 1) {
      syllables--; // Stummes -e
    }
    
    if (cleanWord.endsWith('le') && syllables > 1) {
      syllables++; // -le zählt als Silbe
    }
    
    // Mindestens 1 Silbe
    return Math.max(1, syllables);
  }

  /**
   * Generiere konkrete SEO-Empfehlungen basierend auf Analyse
   */
  generateRecommendations(text: string, keywords: string[], title?: string): string[] {
    const recommendations: string[] = [];
    
    if (!text || text.length < 50) {
      recommendations.push("📝 Schreibe mindestens 50 Zeichen Text für eine aussagekräftige Analyse");
      return recommendations;
    }

    const analytics = this.analyzeKeywords(text, keywords);
    const readability = this.calculateReadability(text);
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
    
    // 1. Keyword-Dichte Empfehlungen
    if (keywords.length === 0) {
      recommendations.push("🎯 Füge 2-3 relevante Keywords hinzu für bessere SEO-Bewertung");
    } else {
      // Filter unrealistische Keyword-Dichten (>15% deutet auf häufige Wörter hin)
      const validAnalytics = analytics.filter(a => a.density <= 15);
      const problematicKeywords = analytics.filter(a => a.density > 15);
      
      if (problematicKeywords.length > 0) {
        recommendations.push(`⚠️ Zu häufige Keywords entfernen: "${problematicKeywords.map(k => k.keyword).join('", "')}" (${problematicKeywords[0].density.toFixed(1)}% Dichte)`);
      }
      
      if (validAnalytics.length > 0) {
        const avgDensity = validAnalytics.reduce((sum, a) => sum + a.density, 0) / validAnalytics.length;
        
        if (avgDensity < 0.5) {
          recommendations.push(`📊 Erhöhe Keyword-Dichte von ${avgDensity.toFixed(1)}% auf 1-2%`);
        } else if (avgDensity > 4) {
          recommendations.push(`⚠️ Reduziere Keyword-Dichte von ${avgDensity.toFixed(1)}% auf unter 3%`);
        }
      }

      // Keyword im Titel prüfen
      if (title && keywords.length > 0) {
        const titleLower = title.toLowerCase();
        const missingInTitle = keywords.filter(k => !titleLower.includes(k.toLowerCase()));
        if (missingInTitle.length > 0) {
          recommendations.push(`🎯 Verwende "${missingInTitle[0]}" im Titel für bessere SEO-Wirkung`);
        }
      }
    }

    // 2. Spezifische Lesbarkeits-Empfehlungen
    if (readability.score < 50) {
      // Konkrete Verbesserungsvorschläge je nach Lesbarkeits-Level
      if (readability.level === 'Sehr schwer') {
        recommendations.push(`📖 Text vereinfachen: Verwende einfachere Wörter und kürzere Sätze (Lesbarkeit: ${readability.score})`);
      } else if (readability.level === 'Schwer') {
        recommendations.push(`📝 Sätze kürzen und Fremdwörter erklären (Lesbarkeit: ${readability.score}, Ziel: 60+)`);
      } else {
        recommendations.push(`📚 Mehr Bindewörter und aktive Sprache verwenden (Lesbarkeit: ${readability.score}, Ziel: 60+)`);
      }
    }
    
    // Konkrete Satzlängen-Analyse
    const cleanTextForSentences = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = cleanTextForSentences.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const avgSentenceLength = wordCount / sentences.length;
      if (avgSentenceLength > 25) {
        recommendations.push(`✂️ Teile lange Sätze auf: ${Math.round(avgSentenceLength)} Wörter/Satz → maximal 20 Wörter`);
      } else if (avgSentenceLength > 20) {
        recommendations.push(`📝 Sätze etwas kürzen: ${Math.round(avgSentenceLength)} Wörter/Satz → optimal 12-15 Wörter`);
      }
      
      // Prüfe sehr lange Einzelsätze
      const longSentences = sentences.filter(s => s.split(/\s+/).length > 30).length;
      if (longSentences > 0) {
        recommendations.push(`🔍 ${longSentences} sehr lange Sätze (>30 Wörter) aufteilen oder mit Punkten strukturieren`);
      }
    }

    // 3. Text-Länge Empfehlungen
    if (wordCount < 150) {
      recommendations.push(`📏 Schreibe mindestens ${150 - wordCount} weitere Wörter für bessere SEO-Bewertung`);
    } else if (wordCount > 800) {
      recommendations.push(`✂️ Kürze den Text um ca. ${wordCount - 600} Wörter für optimale Länge`);
    }

    // 4. Spezifische Strukturelle Empfehlungen
    const textWithoutHtml = text.replace(/<[^>]*>/g, ' ').trim();
    const conjunctions = (textWithoutHtml.match(/\b(und|oder|aber|denn|jedoch|außerdem|zudem|darüber hinaus|deshalb|daher|trotzdem|dennoch)\b/gi) || []).length;
    const conjunctionRatio = conjunctions / wordCount * 100;
    
    if (conjunctionRatio < 1.5) {
      recommendations.push(`🔗 Mehr Verbindungswörter verwenden: "jedoch", "außerdem", "deshalb" (aktuell ${conjunctionRatio.toFixed(1)}%)`);
    }
    
    // Passiv-Konstruktionen prüfen
    const passiveIndicators = (textWithoutHtml.match(/\b(wird|wurden|worden|geworden)\s+\w+/gi) || []).length;
    const passiveRatio = passiveIndicators / sentences.length * 100;
    
    if (passiveRatio > 20) {
      recommendations.push(`🎯 Weniger Passiv-Konstruktionen: ${Math.round(passiveRatio)}% → unter 15% für aktivere Sprache`);
    }
    
    // Füllwörter prüfen
    const fillerWords = (textWithoutHtml.match(/\b(eigentlich|sozusagen|gewissermaßen|quasi|irgendwie|ziemlich|relativ|durchaus)\b/gi) || []).length;
    if (fillerWords > wordCount * 0.02) {
      recommendations.push(`💪 ${fillerWords} Füllwörter entfernen: "eigentlich", "sozusagen", "irgendwie" schwächen den Text`);
    }

    // 5. Positive Bestätigung wenn alles gut ist
    if (recommendations.length === 0) {
      recommendations.push("✅ Ausgezeichnet! Dein Text erfüllt alle SEO-Kriterien optimal");
    }

    return recommendations.slice(0, 5); // Max 5 Empfehlungen
  }

  /**
   * KI-Analyse für einzelnes Keyword
   */
  async analyzeKeywordWithAI(keyword: string, text: string): Promise<PerKeywordMetrics> {
    // Erst Basis-Metriken berechnen (ohne KI)
    const basicMetrics = this.calculateBasicKeywordMetrics(keyword, text);
    
    try {
      // KI-Analyse für semantische Relevanz
      const prompt = `Analysiere das Keyword "${keyword}" im folgenden PR-Text.

Bewerte:
1. Semantische Relevanz (0-100): Wie zentral ist das Keyword für den Text?
2. Kontext-Qualität (0-100): Wie natürlich ist das Keyword eingebunden?
3. Verwandte Begriffe: Nenne 3 thematisch verwandte Begriffe aus dem Text.

Antworte NUR im Format:
RELEVANZ: [Zahl]
QUALITÄT: [Zahl]
BEGRIFFE: [Begriff1, Begriff2, Begriff3]

Text (erste 1000 Zeichen): ${text.substring(0, 1000)}`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: 'generate'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.generatedText || '';
        
        // Parse KI-Antwort
        const relevanceMatch = result.match(/RELEVANZ:\s*(\d+)/);
        const qualityMatch = result.match(/QUALITÄT:\s*(\d+)/);
        const termsMatch = result.match(/BEGRIFFE:\s*(.+)/);
        
        const semanticRelevance = relevanceMatch ? parseInt(relevanceMatch[1]) : undefined;
        const contextQuality = qualityMatch ? parseInt(qualityMatch[1]) : undefined;
        const relatedTerms = termsMatch ? 
          termsMatch[1].split(',').map(t => t.trim()).slice(0, 3) : 
          undefined;
        
        // Keyword-Stärke basierend auf Scores
        let keywordStrength: 'stark' | 'mittel' | 'schwach' = 'mittel';
        if (semanticRelevance && semanticRelevance >= 70) keywordStrength = 'stark';
        else if (semanticRelevance && semanticRelevance < 40) keywordStrength = 'schwach';
        
        return {
          ...basicMetrics,
          semanticRelevance,
          contextQuality,
          relatedTermsFound: relatedTerms,
          keywordStrength
        };
      }
    } catch (error) {
      console.error('KI-Analyse fehlgeschlagen:', error);
    }
    
    // Fallback: Nur Basis-Metriken
    return basicMetrics;
  }

  /**
   * Basis-Metriken für Keyword (ohne KI)
   */
  private calculateBasicKeywordMetrics(keyword: string, text: string): PerKeywordMetrics {
    const cleanText = text.replace(/<[^>]*>/g, ' ').toLowerCase();
    const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Vorkommen zählen
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
    const matches = [...cleanText.matchAll(regex)];
    const occurrences = matches.length;
    const density = (occurrences / wordCount) * 100;
    
    // Headline prüfen (erste Zeile oder <h1>)
    const firstLine = text.split('\n')[0] || '';
    const inHeadline = firstLine.toLowerCase().includes(keyword.toLowerCase());
    
    // Erste 150 Zeichen prüfen (Lead)
    const first150 = cleanText.substring(0, 150);
    const inFirstParagraph = first150.includes(keyword.toLowerCase());
    
    // Verteilung bewerten
    let distribution: 'gut' | 'mittel' | 'schlecht' = 'schlecht';
    if (occurrences >= 3) {
      const positions = matches.map(m => m.index || 0);
      const textLength = cleanText.length;
      const firstThird = positions.filter(p => p < textLength / 3).length;
      const middleThird = positions.filter(p => p >= textLength / 3 && p < (textLength * 2) / 3).length;
      const lastThird = positions.filter(p => p >= (textLength * 2) / 3).length;
      
      if (firstThird > 0 && middleThird > 0 && lastThird > 0) {
        distribution = 'gut';
      } else if (firstThird > 0 || lastThird > 0) {
        distribution = 'mittel';
      }
    }
    
    return {
      keyword,
      density,
      occurrences,
      inHeadline,
      inFirstParagraph,
      distribution
    };
  }

  /**
   * PR-spezifische Metriken berechnen
   */
  calculatePRMetrics(text: string, headline?: string): PRMetrics {
    const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
    const lines = text.split('\n').filter(l => l.trim());
    
    // Headline-Analyse
    const headlineText = headline || lines[0] || '';
    const headlineLength = headlineText.length;
    const activeVerbs = ['startet', 'präsentiert', 'entwickelt', 'führt ein', 'erweitert', 'optimiert', 'lanciert'];
    const headlineHasActiveVerb = activeVerbs.some(v => headlineText.toLowerCase().includes(v));
    
    // Lead-Analyse (erste 150 Zeichen)
    const leadText = cleanText.substring(0, 150);
    const leadHasNumbers = /\d+/.test(leadText);
    
    // Zitat-Erkennung
    const quotes = [
      ...text.matchAll(/"([^"]{50,300})"/g),
      ...text.matchAll(/„([^"]{50,300})"/g),
      ...text.matchAll(/<blockquote>(.*?)<\/blockquote>/g)
    ];
    const quoteCount = quotes.length;
    const avgQuoteLength = quotes.length > 0 
      ? quotes.reduce((sum, q) => sum + q[1].length, 0) / quotes.length 
      : 0;
    
    // Call-to-Action
    const actionPhrases = ['besuchen sie', 'erfahren sie mehr', 'kontaktieren sie', 'weitere informationen', 'jetzt anmelden'];
    const hasActionVerbs = actionPhrases.some(p => cleanText.toLowerCase().includes(p));
    const hasLearnMore = cleanText.toLowerCase().includes('weitere informationen') || 
                         cleanText.toLowerCase().includes('mehr erfahren');
    
    // Struktur
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
    const avgParagraphLength = paragraphs.length > 0
      ? paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length
      : 0;
    const hasBulletPoints = /[•\-\*]\s+.+/.test(text) || /<li>/.test(text);
    const hasSubheadings = /<h[2-6]>/.test(text) || /^##\s+/m.test(text);
    
    // Konkretheit
    const numbers = text.match(/\d+/g) || [];
    const numberCount = numbers.length;
    const datePattern = /\d{1,2}\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|\d{1,2}\.)\s*\d{2,4}/gi;
    const hasSpecificDates = datePattern.test(text);
    const hasCompanyNames = /GmbH|AG|SE|KG|OHG|Ltd|Inc|Corp/i.test(text);
    
    return {
      headlineLength,
      headlineHasKeywords: false, // Wird später mit Keywords gefüllt
      headlineHasActiveVerb,
      leadLength: leadText.length,
      leadHasNumbers,
      leadKeywordMentions: 0, // Wird später mit Keywords gefüllt
      quoteCount,
      avgQuoteLength: Math.round(avgQuoteLength),
      hasActionVerbs,
      hasLearnMore,
      avgParagraphLength: Math.round(avgParagraphLength),
      hasBulletPoints,
      hasSubheadings,
      numberCount,
      hasSpecificDates,
      hasCompanyNames
    };
  }

  /**
   * Neuer PR-optimierter Score
   */
  calculatePRScore(
    text: string, 
    perKeywordMetrics: PerKeywordMetrics[], 
    prMetrics: PRMetrics
  ): { totalScore: number; breakdown: any; recommendations: string[] } {
    let breakdown = {
      headline: 0,
      keywords: 0,
      structure: 0,
      relevance: 0,
      concreteness: 0,
      engagement: 0
    };
    
    // 25% Headline & Lead-Qualität
    if (prMetrics.headlineLength >= 60 && prMetrics.headlineLength <= 80) breakdown.headline += 10;
    if (prMetrics.headlineHasActiveVerb) breakdown.headline += 10;
    if (prMetrics.leadHasNumbers) breakdown.headline += 5;
    
    // 20% Keyword-Performance (Durchschnitt beider)
    if (perKeywordMetrics.length > 0) {
      const avgDensity = perKeywordMetrics.reduce((sum, m) => sum + m.density, 0) / perKeywordMetrics.length;
      if (avgDensity >= 0.5 && avgDensity <= 2) breakdown.keywords += 10;
      
      const allInHeadline = perKeywordMetrics.every(m => m.inHeadline);
      if (allInHeadline) breakdown.keywords += 5;
      
      const allInLead = perKeywordMetrics.every(m => m.inFirstParagraph);
      if (allInLead) breakdown.keywords += 5;
    }
    
    // 20% Struktur & Lesbarkeit
    if (prMetrics.avgParagraphLength <= 50) breakdown.structure += 10;
    if (prMetrics.hasBulletPoints || prMetrics.hasSubheadings) breakdown.structure += 10;
    
    // 15% Semantische Relevanz (wenn KI-Daten vorhanden)
    if (perKeywordMetrics.some(m => m.semanticRelevance !== undefined)) {
      const avgRelevance = perKeywordMetrics
        .filter(m => m.semanticRelevance !== undefined)
        .reduce((sum, m) => sum + (m.semanticRelevance || 0), 0) / perKeywordMetrics.length;
      breakdown.relevance = Math.round(avgRelevance * 0.15);
    }
    
    // 10% Konkretheit
    if (prMetrics.numberCount >= 3) breakdown.concreteness += 5;
    if (prMetrics.hasSpecificDates) breakdown.concreteness += 3;
    if (prMetrics.hasCompanyNames) breakdown.concreteness += 2;
    
    // 10% Zitate & CTA
    if (prMetrics.quoteCount >= 1) breakdown.engagement += 5;
    if (prMetrics.hasActionVerbs || prMetrics.hasLearnMore) breakdown.engagement += 5;
    
    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    
    // Empfehlungen generieren
    const recommendations: string[] = [];
    
    if (breakdown.headline < 15) {
      recommendations.push('📝 Optimiere die Headline: 60-80 Zeichen mit aktivem Verb');
    }
    if (breakdown.keywords < 10) {
      recommendations.push('🎯 Keywords besser verteilen: In Headline und erstem Absatz platzieren');
    }
    if (prMetrics.quoteCount === 0) {
      recommendations.push('💬 Füge ein Zitat hinzu für mehr Glaubwürdigkeit');
    }
    if (!prMetrics.hasActionVerbs) {
      recommendations.push('🎬 Call-to-Action ergänzen: "Erfahren Sie mehr..." oder "Besuchen Sie..."');
    }
    
    return { totalScore, breakdown, recommendations };
  }

  /**
   * Alter Score (für Rückwärtskompatibilität)
   */
  calculateSEOScore(text: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;

    const analytics = this.analyzeKeywords(text, keywords);
    const wordCount = text.split(/\s+/).length;
    
    let score = 0;
    
    // Faktor 1: Keyword-Dichte (optimal 1-3%)
    const avgDensity = analytics.reduce((sum, a) => sum + a.density, 0) / analytics.length;
    if (avgDensity >= 1 && avgDensity <= 3) {
      score += 40; // 40% für optimale Dichte
    } else if (avgDensity > 0 && avgDensity < 5) {
      score += 20; // 20% für akzeptable Dichte
    }
    
    // Faktor 2: Text-Länge (optimal 300-800 Wörter)
    if (wordCount >= 300 && wordCount <= 800) {
      score += 30; // 30% für optimale Länge
    } else if (wordCount >= 200 && wordCount <= 1000) {
      score += 15; // 15% für akzeptable Länge
    }
    
    // Faktor 3: Keyword-Verteilung
    const hasGoodDistribution = analytics.every(a => a.occurrences >= 1);
    if (hasGoodDistribution) {
      score += 20; // 20% für gute Verteilung
    }
    
    // Faktor 4: Anzahl Keywords (optimal 3-5)
    if (keywords.length >= 3 && keywords.length <= 5) {
      score += 10; // 10% für optimale Anzahl
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Cleanup-Methoden
   */
  clearCache(): void {
    this.cache.clear();
  }

  clearDebounceTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  // Private Hilfsmethoden

  private buildKeywordDetectionPrompt(text: string, options: Required<KeywordDetectionOptions>): string {
    return `Du bist ein SEO-Spezialist. Analysiere den folgenden Text und extrahiere die wichtigsten Keywords.

AUFGABE: Extrahiere GENAU ${options.maxKeywords} SEO-Keywords aus dem Text.

KRITISCHE REGELN:
- Antworte NUR mit den Keywords
- KEINE Erklärungen, KEINE Sätze, KEINE Pressemitteilung schreiben!
- Trenne Keywords nur mit Komma
- Maximal 3 Wörter pro Keyword
- Fokus auf: Unternehmensnamen, Produkte, Branchen-Begriffe

BEISPIEL ANTWORT:
Softwareentwicklung, Digitale Transformation, KI-Technologie, Startup Berlin, Cloud Computing

TEXT ZUR ANALYSE:
${text}

DEINE ANTWORT (nur Keywords mit Komma):`;
  }

  private parseAndValidateKeywords(rawKeywords: string, options: Required<KeywordDetectionOptions>): string[] {
    if (!rawKeywords) return [];

    console.log('🔧 Parsing raw keywords:', rawKeywords.substring(0, 200) + '...');

    // Bereinige den Text komplett
    let cleanText = rawKeywords
      .replace(/<[^>]*>/g, '') // HTML-Tags entfernen
      .replace(/\*\*/g, '') // Markdown Bold entfernen
      .replace(/\n+/g, ' ') // Zeilenumbrüche zu Leerzeichen
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen
      .trim();

    // AGGRESSIVES PARSING für verschiedene AI-Antworten
    let keywords: string[] = [];
    
    // 1. Prüfe ob es Komma-getrennte Keywords sind (erwünscht)
    if (cleanText.includes(',') && cleanText.length < 200) {
      keywords = cleanText
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }
    
    // 2. Falls langer Text oder keine Kommas: Suche nach Keyword-Pattern
    else if (cleanText.length > 100 || keywords.length === 0) {
      console.log('⚠️ Long response or no commas, extracting patterns...');
      
      // Suche nach typischen Keyword-Mustern
      const patterns = [
        // Nach "Keywords:" oder "Antwort:"
        /(?:keywords?|antwort|ausgabe):\s*(.+)/i,
        // Letzte Zeile wenn sie kurz ist und Kommas hat
        /([^.!?]*(?:,\s*[^.!?]*){2,})\s*$/,
        // Zeile mit mehreren Begriffen getrennt durch Komma
        /^([^.!?]*,\s*[^.!?]*,.*?)$/m
      ];
      
      for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match && match[1]) {
          keywords = match[1]
            .split(/[,;]/)
            .map(k => k.trim())
            .filter(k => k.length > 0);
          if (keywords.length >= 2) break;
        }
      }
      
      // 3. Fallback: Häufigste Wörter extrahieren
      if (keywords.length === 0) {
        console.log('⚠️ No keyword patterns found, using fallback...');
        return this.extractKeywordsFallback(cleanText, options);
      }
    }

    // Keywords validieren und filtern
    const validKeywords = keywords
      .filter(k => k.length >= options.minWordLength)
      .filter(k => k.length <= 50) // Max 50 Zeichen pro Keyword
      .filter(k => k.split(' ').length <= 3) // Max 3 Wörter pro Keyword
      .filter(k => !k.includes('.') || k.endsWith('.de')) // Keine Sätze, außer Domains
      .filter(k => !k.match(/^(der|die|das|und|oder|aber|mit|für|auf|von|zu|in|an|bei)\s/i)) // Keine Füllwörter am Anfang
      .filter(k => !this.isLikelyGeneratedContent(k))
      .filter(k => options.excludeCommonWords ? !this.isCommonWord(k, true) : true)
      .slice(0, options.maxKeywords);

    console.log('🎯 PR-SEO Keywords parsed:', validKeywords.length > 0 ? validKeywords.join(', ') : 'none');
    return [...new Set(validKeywords)]; // Remove duplicates
  }
  
  private isLikelyGeneratedContent(text: string): boolean {
    const indicators = [
      'pressemitteilung', 'heute bekannt gegeben', 'freut sich',
      'mitteilen zu können', 'ist stolz', 'gibt bekannt',
      'weitere informationen', 'über das unternehmen',
      'für weitere fragen', 'kontaktieren sie'
    ];
    
    const lowerText = text.toLowerCase();
    return indicators.some(indicator => lowerText.includes(indicator));
  }

  private extractKeywordsFallback(text: string, options: Required<KeywordDetectionOptions>): string[] {
    // Einfache Fallback-Extraktion ohne KI
    const words = text
      .toLowerCase()
      .replace(/[^\w\säöüß]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= options.minWordLength)
      .filter(word => !this.isCommonWord(word, options.excludeCommonWords));

    // Häufigkeits-Analyse
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Sortiere nach Häufigkeit und nimm die Top-Keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, options.maxKeywords)
      .map(([word]) => word);
  }

  private isCommonWord(word: string, exclude: boolean): boolean {
    if (!exclude) return false;

    const commonWords = [
      'der', 'die', 'das', 'und', 'oder', 'aber', 'wenn', 'dann',
      'mit', 'für', 'auf', 'von', 'zu', 'in', 'an', 'bei', 'über',
      'unter', 'durch', 'um', 'nach', 'vor', 'seit', 'bis', 'gegen',
      'ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden',
      'kann', 'könnte', 'soll', 'sollte', 'muss', 'müssen',
      'this', 'that', 'the', 'and', 'or', 'but', 'with', 'for'
    ];

    return commonWords.includes(word.toLowerCase());
  }

  private calculateConfidence(keywords: string[], text: string): number {
    if (keywords.length === 0) return 0;

    // Confidence basierend auf verschiedenen Faktoren
    let confidence = 0.5; // Base confidence

    // Faktor 1: Anzahl gefundener Keywords
    if (keywords.length >= 3) confidence += 0.2;
    if (keywords.length >= 5) confidence += 0.1;

    // Faktor 2: Durchschnittliche Keyword-Länge (längere Keywords = specifischer)
    const avgLength = keywords.reduce((sum, k) => sum + k.length, 0) / keywords.length;
    if (avgLength > 10) confidence += 0.2;

    // Faktor 3: Text-Länge (mehr Text = bessere Analyse)
    if (text.length > 500) confidence += 0.1;
    if (text.length > 1000) confidence += 0.1;

    return Math.min(1, Math.max(0, confidence));
  }

  private generateCacheKey(text: string, options: Required<KeywordDetectionOptions>): string {
    const textHash = this.simpleHash(text);
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `${textHash}-${optionsHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Singleton-Export
export const seoKeywordService = new SEOKeywordService();
export type { 
  KeywordDetectionOptions, 
  KeywordResult, 
  KeywordAnalytics,
  PerKeywordMetrics,
  PRMetrics
};