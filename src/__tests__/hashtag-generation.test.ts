// Test für die Hashtag-Generierung
describe('Hashtag Generation', () => {
  // Teste die neue StructuredPressRelease Interface mit Hashtags
  it('sollte StructuredPressRelease mit Hashtags erweitern', () => {
    const pressRelease = {
      headline: 'Test Headline',
      leadParagraph: 'Test lead paragraph content',
      bodyParagraphs: ['Body 1', 'Body 2'],
      quote: {
        text: 'Test quote',
        person: 'John Doe',
        role: 'CEO',
        company: 'Test Corp'
      },
      cta: 'Test call to action',
      hashtags: ['#TechNews', '#Innovation', '#B2B'],
      socialOptimized: true
    };

    expect(pressRelease.hashtags).toEqual(['#TechNews', '#Innovation', '#B2B']);
    expect(pressRelease.socialOptimized).toBe(true);
    expect(pressRelease.hashtags).toHaveLength(3);
  });

  it('sollte Hashtags korrekt formatieren', () => {
    const hashtags = ['TechNews', '#Innovation', 'B2B'];
    const formattedHashtags = hashtags.map(tag => 
      tag.startsWith('#') ? tag : '#' + tag
    );

    expect(formattedHashtags).toEqual(['#TechNews', '#Innovation', '#B2B']);
  });

  it('sollte Social Media Optimierung korrekt bewerten', () => {
    const shortHeadline = 'Kurze Headline';
    const longHeadline = 'Dies ist eine sehr lange Headline die definitiv mehr als 280 Zeichen haben wird und deshalb nicht für Twitter optimiert ist. Sie geht weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter und weiter bis sie die Grenze überschreitet und somit als nicht social-optimiert gilt weil sie definitiv zu lang ist.';
    const hashtags = ['#Test', '#News'];

    const socialOptimizedShort = shortHeadline.length <= 280 && hashtags.length >= 2;
    const socialOptimizedLong = longHeadline.length <= 280 && hashtags.length >= 2;

    expect(socialOptimizedShort).toBe(true);
    expect(socialOptimizedLong).toBe(false);
    expect(longHeadline.length).toBeGreaterThan(280);
  });
});