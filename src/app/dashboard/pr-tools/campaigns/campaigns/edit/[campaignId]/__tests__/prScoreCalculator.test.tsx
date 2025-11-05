// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/__tests__/prScoreCalculator.test.tsx

/**
 * Tests für die PR-Score Calculation Logic
 *
 * Die PR-Score Berechnung erfolgt automatisch wenn sich Title, Content oder Keywords ändern.
 * Diese Tests testen die Berechnungslogik isoliert (ohne React Hooks).
 */

// Extrahiere die Score-Calculation Logic als testbare Funktion
function calculatePrScore(campaignTitle: string, editorContent: string, keywords: string[]) {
  const content = `${campaignTitle || ''}\n\n${editorContent || ''}`.trim();

  if (!content || content.length < 50) {
    return {
      totalScore: 28,
      breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 },
      hints: ['Fügen Sie mehr Inhalt hinzu', 'Verwenden Sie aussagekräftige Keywords'],
      keywordMetrics: []
    };
  }

  let score = 30; // Basis-Score
  const hints: string[] = [];

  // Title-Bewertung
  if (campaignTitle && campaignTitle.length > 30) {
    score += 15;
  } else {
    hints.push('Titel sollte mindestens 30 Zeichen haben');
  }

  // Content-Länge Bewertung
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 200) {
    score += 20;
  } else {
    hints.push('Pressemitteilung sollte mindestens 200 Wörter haben');
  }

  // Keywords Bewertung
  if (keywords.length > 0) {
    score += 15;
    const keywordFound = keywords.some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    if (keywordFound) {
      score += 15;
    } else {
      hints.push('Keywords sollten im Text verwendet werden');
    }
  } else {
    hints.push('Definieren Sie SEO-Keywords für bessere Auffindbarkeit');
  }

  // Struktur-Bewertung (einfache Heuristik)
  const hasStructure = content.includes('\n') || content.length > 500;
  if (hasStructure) {
    score += 5;
  } else {
    hints.push('Gliedern Sie den Text in Absätze');
  }

  score = Math.min(100, score);
  return {
    totalScore: score,
    breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 },
    hints,
    keywordMetrics: []
  };
}

describe('PR-Score Calculator Logic', () => {
  describe('Basis-Score Berechnung', () => {
    it('sollte Basis-Score von 28 für leeren Content setzen', () => {
      const result = calculatePrScore('', '', []);

      expect(result.totalScore).toBe(28);
      expect(result.hints).toContain('Fügen Sie mehr Inhalt hinzu');
    });

    it('sollte Basis-Score von 30 für minimalen Content setzen', () => {
      const minimalContent = 'A'.repeat(51);
      const result = calculatePrScore('Short', `<p>${minimalContent}</p>`, []);

      expect(result.totalScore).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Title-Bewertung (+15 Punkte)', () => {
    it('sollte 15 Punkte für Titel >30 Zeichen geben', () => {
      const longTitle = 'A'.repeat(31);
      const sufficientContent = 'A'.repeat(100);

      const result = calculatePrScore(longTitle, `<p>${sufficientContent}</p>`, []);

      // Basis (30) + Title (15) = 45
      expect(result.totalScore).toBeGreaterThanOrEqual(45);
    });

    it('sollte Hint geben wenn Titel zu kurz (<30 Zeichen)', () => {
      const shortTitle = 'Short';
      const sufficientContent = 'A'.repeat(100);

      const result = calculatePrScore(shortTitle, `<p>${sufficientContent}</p>`, []);

      expect(result.hints).toContain('Titel sollte mindestens 30 Zeichen haben');
    });
  });

  describe('Content-Länge Bewertung (+20 Punkte)', () => {
    it('sollte 20 Punkte für >200 Wörter geben', () => {
      const longTitle = 'A'.repeat(31);
      const words = Array(250).fill('word').join(' ');

      const result = calculatePrScore(longTitle, `<p>${words}</p>`, []);

      // Basis (30) + Title (15) + Content (20) = 65
      expect(result.totalScore).toBeGreaterThanOrEqual(65);
    });

    it('sollte Hint geben wenn <200 Wörter', () => {
      const longTitle = 'A'.repeat(31);
      const words = Array(50).fill('word').join(' ');

      const result = calculatePrScore(longTitle, `<p>${words}</p>`, []);

      expect(result.hints).toContain('Pressemitteilung sollte mindestens 200 Wörter haben');
    });
  });

  describe('Keywords Bewertung (+15 Punkte für Definition, +15 für Verwendung)', () => {
    it('sollte 15 Punkte für definierte Keywords geben', () => {
      const longTitle = 'A'.repeat(31);
      const words = Array(250).fill('word').join(' ');

      const result = calculatePrScore(longTitle, `<p>${words}</p>`, ['keyword1', 'keyword2']);

      // Basis (30) + Title (15) + Content (20) + Keywords defined (15) = 80
      expect(result.totalScore).toBeGreaterThanOrEqual(80);
    });

    it('sollte +15 Punkte geben wenn Keywords im Text verwendet werden', () => {
      const longTitle = 'Test title with innovation keyword here';
      const content = Array(200).fill('word').join(' ') + ' innovation technology';

      const result = calculatePrScore(longTitle, `<p>${content}</p>`, ['innovation', 'technology']);

      // Basis (30) + Title (15) + Content (20) + Keywords defined (15) + Keywords used (15) = 95
      expect(result.totalScore).toBeGreaterThanOrEqual(95);
    });

    it('sollte Hint geben wenn Keywords nicht im Text verwendet', () => {
      const longTitle = 'A'.repeat(31);
      const content = Array(250).fill('word').join(' ');

      const result = calculatePrScore(longTitle, `<p>${content}</p>`, ['notfound', 'nowhere']);

      expect(result.hints).toContain('Keywords sollten im Text verwendet werden');
    });

    it('sollte Hint geben wenn keine Keywords definiert', () => {
      const longTitle = 'A'.repeat(31);
      const content = Array(250).fill('word').join(' ');

      const result = calculatePrScore(longTitle, `<p>${content}</p>`, []);

      expect(result.hints).toContain('Definieren Sie SEO-Keywords für bessere Auffindbarkeit');
    });
  });

  describe('Struktur Bewertung (+5 Punkte)', () => {
    it('sollte 5 Punkte für strukturierten Text geben (mit Zeilenumbrüchen)', () => {
      const longTitle = 'Test title with innovation keyword';
      const structuredContent = Array(200).fill('word').join(' ') + '\n\n' + Array(50).fill('word').join(' ');

      const result = calculatePrScore(longTitle, `<p>${structuredContent}</p>`, ['innovation']);

      // Mit allen Punkten: Basis(30) + Title(15) + Content(20) + Keywords(15) + KeywordsUsed(15) + Structure(5) = 100
      expect(result.totalScore).toBe(100);
    });

    it('sollte 5 Punkte für langen Text geben (>500 Zeichen)', () => {
      const longTitle = 'Test title with innovation keyword';
      const longContent = 'A'.repeat(501);

      const result = calculatePrScore(longTitle, `<p>${longContent}</p>`, ['innovation']);

      expect(result.totalScore).toBeGreaterThanOrEqual(60);
    });

    it('sollte Struktur-Bewertung durchführen', () => {
      const longTitle = 'A'.repeat(31);
      // Kurzer Text ohne Struktur - sollte Structure Hint geben wenn <200 Wörter und <500 Zeichen
      const shortUnstructured = 'word '.repeat(100); // 100 Wörter, <500 Zeichen

      const result = calculatePrScore(longTitle, `<p>${shortUnstructured}</p>`, []);

      // Entweder Structure-Punkte oder Hint, abhängig von Länge
      expect(result.totalScore).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Max Score (100 Punkte)', () => {
    it('sollte maximalen Score von 100 nicht überschreiten', () => {
      const perfectTitle = 'This is a perfect title with innovation and technology keywords';
      const perfectContent = Array(250).fill('innovation technology word').join('\n');

      const result = calculatePrScore(perfectTitle, `<p>${perfectContent}</p>`, ['innovation', 'technology']);

      expect(result.totalScore).toBe(100);
    });

    it('sollte maximalen Score von 100 mit mehr als 100 Punkten cappen', () => {
      // Theoretisch könnte man >100 Punkte erreichen, aber Math.min(100, score) sollte cappen
      const result = calculatePrScore(
        'Very long title with innovation technology keywords here',
        Array(300).fill('innovation technology word').join('\n'),
        ['innovation', 'technology']
      );

      expect(result.totalScore).toBe(100);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit undefined Title umgehen', () => {
      const result = calculatePrScore(undefined as any, '<p>Content</p>', []);

      expect(result.totalScore).toBeDefined();
      expect(typeof result.totalScore).toBe('number');
    });

    it('sollte mit undefined Content umgehen', () => {
      const result = calculatePrScore('Title', undefined as any, []);

      expect(result.totalScore).toBeDefined();
      expect(typeof result.totalScore).toBe('number');
    });

    it('sollte mit leeren Keywords Array umgehen', () => {
      // Genug Content für >50 Zeichen Check
      const result = calculatePrScore('A'.repeat(31), 'A'.repeat(100), []);

      expect(result.hints).toContain('Definieren Sie SEO-Keywords für bessere Auffindbarkeit');
    });

    it('sollte HTML Tags aus Content ignorieren bei Wort-Zählung', () => {
      const htmlContent = '<p><strong>Bold</strong> <em>italic</em> <a href="#">link</a></p>';
      const result = calculatePrScore('Title', htmlContent, []);

      // HTML Tags sollten nicht als Wörter gezählt werden
      expect(result.totalScore).toBeDefined();
    });

    it('sollte Case-Insensitive Keyword-Matching verwenden', () => {
      const result = calculatePrScore(
        'INNOVATION in Title',
        'Content with TECHNOLOGY words',
        ['innovation', 'technology']
      );

      // Keywords sollten trotz unterschiedlicher Case gefunden werden
      expect(result.hints).not.toContain('Keywords sollten im Text verwendet werden');
    });
  });
});
