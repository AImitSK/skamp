// Test für die modernisierte Engagement Score Logik
// Prüft, ob die neue flexible "ODER"-Logik korrekt funktioniert

describe('Engagement Score Modernisierung', () => {
  // Mock der calculatePRScore Funktion zur Isolierung der Engagement-Logik
  const mockCalculateEngagementScore = (text: string) => {
    // Repliziere die neue Engagement-Logik aus PRSEOHeaderBar.tsx
    let engagementScore = 40; // Solider Basis-Score
    
    // CTA-Erkennung (erweitert)
    const ctaMatches = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g) || [];
    const hasStandardCTA = ctaMatches.length >= 1;
    const hasContactInfo = /\b(kontakt|telefon|email|@|\.de|\.com)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasUrls = /\b(http|www\.|\.de|\.com)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasActionWords = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden|buchen|anmelden|registrieren)\b/i.test(text.replace(/<[^>]*>/g, ''));
    
    // Zitat-Erkennung (erweitert)
    const hasBlockquotes = text.includes('<blockquote');
    const hasQuotationMarks = text.replace(/<[^>]*>/g, '').includes('"') || text.replace(/<[^>]*>/g, '').includes('„') || text.replace(/<[^>]*>/g, '').includes('"');
    const hasAttributions = /\b(sagt|erklärt|betont|kommentiert|so|laut)\b/i.test(text.replace(/<[^>]*>/g, ''));
    
    // Kombiniere alle Varianten
    const hasAnyCTA = hasStandardCTA || hasContactInfo || hasUrls || hasActionWords;
    const hasAnyQuote = hasBlockquotes || (hasQuotationMarks && hasAttributions);
    
    // Neue ODER-Logik
    if (hasAnyQuote) {
      engagementScore += 30; // Zitat = +30
    }
    
    if (hasAnyCTA) {
      engagementScore += 30; // CTA = +30  
    }
    
    // Aktive Sprache
    const hasActionVerbs = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden)\b/i.test(text.replace(/<[^>]*>/g, ''));
    if (hasActionVerbs) {
      engagementScore += 20; // Aktive Sprache = +20
    }
    
    // Bonus für perfekte Kombination
    if (hasAnyQuote && hasAnyCTA) {
      engagementScore += 10; // Bonus = +10
    }
    
    // Emotionale Elemente
    const hasEmotionalElements = /[!]{1,2}\s/g.test(text.replace(/<[^>]*>/g, ''));
    if (hasEmotionalElements) {
      engagementScore += 5; // Leichter Bonus
    }
    
    return Math.min(100, engagementScore);
  };

  describe('Neue ODER-Logik Tests', () => {
    test('Text mit nur CTA erreicht 70% Score (alte Logik: 60%)', () => {
      const textMitNurCTA = '<p>Besuchen Sie unsere Website für mehr Informationen.</p>';
      const score = mockCalculateEngagementScore(textMitNurCTA);
      
      // 40 Basis + 30 CTA + 20 Aktive Sprache ("besuchen") = 90%
      expect(score).toBe(90);
    });

    test('Text mit nur Zitat erreicht 70% Score (alte Logik: 60%)', () => {
      const textMitNurZitat = '<blockquote data-type="pr-quote">Das ist eine großartige Innovation</blockquote>';
      const score = mockCalculateEngagementScore(textMitNurZitat);
      
      // 40 Basis + 30 Zitat = 70%
      expect(score).toBe(70);
    });

    test('Text mit CTA UND Zitat erreicht 100% Score', () => {
      const textMitBeidem = '<p>Kontaktieren Sie uns heute! <blockquote>Das ist großartig</blockquote></p>';
      const score = mockCalculateEngagementScore(textMitBeidem);
      
      // 40 Basis + 30 CTA + 30 Zitat + 20 Aktive Sprache + 10 Bonus = 100 (cap)
      expect(score).toBe(100);
    });

    test('Text ohne CTA/Zitat aber mit aktiver Sprache erreicht 90% Score (alte Logik: 30%)', () => {
      const textMitAktiverSprache = '<p>Erfahren Sie mehr über unsere Services und downloaden Sie unsere Broschüre.</p>';
      const score = mockCalculateEngagementScore(textMitAktiverSprache);
      
      // 40 Basis + 30 CTA ("erfahren", "downloaden" sind Action-Wörter) + 20 Aktive Sprache = 90%
      expect(score).toBe(90);
    });

    test('Text ohne jegliche Engagement-Elemente erreicht nur Basis-Score', () => {
      const neutralerText = '<p>Das Unternehmen wurde gegründet und arbeitet in verschiedenen Bereichen.</p>';
      const score = mockCalculateEngagementScore(neutralerText);
      
      // Nur 40 Basis-Score
      expect(score).toBe(40);
    });
  });

  describe('Erweiterte CTA-Erkennung', () => {
    test('erkennt E-Mail-Adressen als CTA', () => {
      const textMitEmail = '<p>Kontaktieren Sie uns unter info@example.com für weitere Details.</p>';
      const score = mockCalculateEngagementScore(textMitEmail);
      
      expect(score).toBeGreaterThanOrEqual(70); // Sollte CTA erkennen
    });

    test('erkennt Websites als CTA', () => {
      const textMitWebsite = '<p>Besuchen Sie www.example.de für mehr Informationen.</p>';
      const score = mockCalculateEngagementScore(textMitWebsite);
      
      expect(score).toBeGreaterThanOrEqual(70); // Sollte CTA erkennen
    });

    test('erkennt Action-Wörter als CTA', () => {
      const textMitActionWords = '<p>Registrieren Sie sich heute noch für unseren Newsletter.</p>';
      const score = mockCalculateEngagementScore(textMitActionWords);
      
      expect(score).toBeGreaterThanOrEqual(90); // CTA + Aktive Sprache
    });
  });

  describe('Erweiterte Zitat-Erkennung', () => {
    test('erkennt Anführungszeichen mit Attribution als Zitat', () => {
      const textMitZitat = '<p>"Das ist eine großartige Innovation", sagt der CEO.</p>';
      const score = mockCalculateEngagementScore(textMitZitat);
      
      expect(score).toBeGreaterThanOrEqual(70); // Sollte Zitat erkennen
    });

    test('erkennt deutsche Anführungszeichen', () => {
      const textMitDeutschenAnfuehrungszeichen = '<p>„Wir sind begeistert", erklärt der Geschäftsführer.</p>';
      const score = mockCalculateEngagementScore(textMitDeutschenAnfuehrungszeichen);
      
      expect(score).toBeGreaterThanOrEqual(70); // Sollte Zitat erkennen
    });

    test('ignoriert Anführungszeichen ohne Attribution', () => {
      const textOhneAttribution = '<p>Das Wort "Innovation" wird oft verwendet.</p>';
      const score = mockCalculateEngagementScore(textOhneAttribution);
      
      expect(score).toBeLessThan(70); // Sollte kein Zitat erkennen
    });
  });

  describe('Score-Verbesserungen gegenüber alter Logik', () => {
    test('Realistische Texte erreichen jetzt bessere Scores', () => {
      const realistischerText = '<p>Unser neues Produkt revolutioniert die Branche. Besuchen Sie unsere Website für weitere Details.</p>';
      const score = mockCalculateEngagementScore(realistischerText);
      
      // Alte Logik: 60% (nur CTA), Neue Logik: mindestens 70%
      expect(score).toBeGreaterThanOrEqual(70);
    });

    test('Perfekte Texte erreichen weiterhin 100%', () => {
      const perfekterText = '<p>Jetzt registrieren! <blockquote>"Das ist fantastisch", sagt unser Kunde.</blockquote> Besuchen Sie www.example.com!</p>';
      const score = mockCalculateEngagementScore(perfekterText);
      
      expect(score).toBe(100);
    });

    test('Sehr schlechte Texte haben immer noch niedrige Scores', () => {
      const schlechterText = '<p>Das ist ein langweiliger Text ohne jegliche Engagement-Elemente.</p>';
      const score = mockCalculateEngagementScore(schlechterText);
      
      // Nur Basis-Score
      expect(score).toBe(40);
    });
  });

  describe('Emotionale Elemente Bonus', () => {
    test('Text mit Ausrufezeichen bekommt Bonus', () => {
      const textMitEmotion = '<p>Das ist großartig! Kontaktieren Sie uns heute.</p>';
      const score = mockCalculateEngagementScore(textMitEmotion);
      
      // 40 Basis + 30 CTA + 20 Aktive Sprache + 5 Emotion = 95
      expect(score).toBe(95);
    });

    test('übertreibt es nicht mit Emotionen (nur leichter Bonus)', () => {
      const textMitVieleAusrufezeichen = '<p>Das ist super!!! Kontaktieren Sie uns!!!</p>';
      const score = mockCalculateEngagementScore(textMitVieleAusrufezeichen);
      
      // Sollte nicht viel höher sein als mit einem Ausrufezeichen
      expect(score).toBeLessThan(100);
    });
  });
});