// src/__tests__/editor/HashtagExtension.test.ts
/**
 * Tests für die Hashtag-Extension
 * Social-Media-optimierte Pressemitteilungen
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HashtagExtension } from '../../components/editor/HashtagExtension';
import { extractHashtags, isValidHashtag } from '../../types/hashtag';

describe('HashtagExtension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        HashtagExtension
      ],
      content: '',
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  describe('Grundfunktionalität', () => {
    it('sollte als Mark-Extension registriert werden', () => {
      expect(editor.extensionManager.extensions.find(ext => ext.name === 'hashtag')).toBeDefined();
    });

    it('sollte Hashtag-Commands bereitstellen', () => {
      expect(typeof editor.commands.setHashtag).toBe('function');
      expect(typeof editor.commands.toggleHashtag).toBe('function');
      expect(typeof editor.commands.unsetHashtag).toBe('function');
    });

    it('sollte Keyboard-Shortcut Strg+Shift+H unterstützen', () => {
      const content = 'Test #HashtagText hier';
      editor.commands.setContent(content);
      
      // Wähle "#HashtagText" aus
      editor.commands.setTextSelection({ from: 6, to: 17 });
      
      // Simuliere Keyboard-Shortcut
      const result = editor.commands.toggleHashtag();
      expect(result).toBe(true);
    });
  });

  describe('Hashtag-Parsing', () => {
    it('sollte HTML mit data-type="hashtag" parsen', () => {
      const html = '<span data-type="hashtag">#TestHashtag</span>';
      editor.commands.setContent(html);
      
      const hasHashtagMark = editor.isActive('hashtag');
      expect(hasHashtagMark).toBe(true);
    });

    it('sollte automatische Hashtag-Erkennung funktionieren', () => {
      // Test wird erweitert wenn Auto-Detection implementiert ist
      const content = 'Das ist ein #TestHashtag in Text';
      editor.commands.setContent(content);
      
      // TODO: Prüfe ob #TestHashtag automatisch erkannt wird
      // expect(editor.getHTML()).toContain('data-type="hashtag"');
    });
  });

  describe('HTML-Rendering', () => {
    it('sollte korrekte CSS-Klassen rendern', () => {
      editor.commands.setContent('#TestHashtag');
      editor.commands.selectAll();
      editor.commands.setHashtag();
      
      const html = editor.getHTML();
      expect(html).toContain('data-type="hashtag"');
      expect(html).toContain('text-blue-600');
      expect(html).toContain('font-semibold');
      expect(html).toContain('cursor-pointer');
      expect(html).toContain('hover:text-blue-800');
    });

    it('sollte Transition-Klassen enthalten', () => {
      editor.commands.setContent('#TestHashtag');
      editor.commands.selectAll();
      editor.commands.setHashtag();
      
      const html = editor.getHTML();
      expect(html).toContain('transition-colors');
      expect(html).toContain('duration-200');
    });
  });

  describe('Hashtag-Pattern-Erkennung', () => {
    it('sollte deutsche Umlaute unterstützen', () => {
      const hashtags = ['#TechNähe', '#Größe', '#Fußball'];
      hashtags.forEach(hashtag => {
        expect(isValidHashtag(hashtag.substring(1))).toBe(true);
      });
    });

    it('sollte Zahlen und Unterstriche erlauben', () => {
      const hashtags = ['#B2B_Marketing', '#Tech2024', '#Event_123'];
      hashtags.forEach(hashtag => {
        expect(isValidHashtag(hashtag.substring(1))).toBe(true);
      });
    });

    it('sollte Längen-Validierung durchführen', () => {
      expect(isValidHashtag('a')).toBe(false); // Zu kurz
      expect(isValidHashtag('ab')).toBe(true); // Mindestlänge
      expect(isValidHashtag('a'.repeat(50))).toBe(true); // Maximallänge
      expect(isValidHashtag('a'.repeat(51))).toBe(false); // Zu lang
    });

    it('sollte ungültige Zeichen ablehnen', () => {
      const invalidHashtags = ['#test-hashtag', '#test.hashtag', '#test hashtag', '#test@hashtag'];
      invalidHashtags.forEach(hashtag => {
        expect(isValidHashtag(hashtag.substring(1))).toBe(false);
      });
    });
  });

  describe('Command-Tests', () => {
    it('sollte Hashtag setzen können', () => {
      editor.commands.setContent('TestText');
      editor.commands.selectAll();
      
      const result = editor.commands.setHashtag();
      expect(result).toBe(true);
      expect(editor.isActive('hashtag')).toBe(true);
    });

    it('sollte Hashtag togglen können', () => {
      editor.commands.setContent('TestText');
      editor.commands.selectAll();
      
      // Aktivieren
      editor.commands.toggleHashtag();
      expect(editor.isActive('hashtag')).toBe(true);
      
      // Deaktivieren
      editor.commands.toggleHashtag();
      expect(editor.isActive('hashtag')).toBe(false);
    });

    it('sollte Hashtag entfernen können', () => {
      editor.commands.setContent('TestText');
      editor.commands.selectAll();
      editor.commands.setHashtag();
      
      expect(editor.isActive('hashtag')).toBe(true);
      
      editor.commands.unsetHashtag();
      expect(editor.isActive('hashtag')).toBe(false);
    });
  });

  describe('Integration mit anderen Extensions', () => {
    it('sollte nicht mit Link-Extension interferieren', () => {
      // Simuliert Konflikt-Test zwischen Hashtag und Link
      const content = '<a href="http://example.com">#TestLink</a>';
      editor.commands.setContent(content);
      
      // Beide sollten koexistieren können
      // TODO: Erweiterte Kompatibilitäts-Tests
    });
  });

  describe('Performance-Tests', () => {
    it('sollte bei großen Dokumenten performant sein', () => {
      const largeContent = 'Text mit #Hashtag '.repeat(1000);
      
      const startTime = performance.now();
      editor.commands.setContent(largeContent);
      const endTime = performance.now();
      
      // Sollte unter 1 Sekunde sein
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});

describe('Hashtag-Utility-Functions', () => {
  describe('extractHashtags', () => {
    it('sollte Hashtags aus Text extrahieren', () => {
      const text = 'Das ist ein #TestHashtag und noch #Zweiter in Text';
      const hashtags = extractHashtags(text);
      
      expect(hashtags).toHaveLength(2);
      expect(hashtags[0].text).toBe('TestHashtag');
      expect(hashtags[0].fullText).toBe('#TestHashtag');
      expect(hashtags[1].text).toBe('Zweiter');
      expect(hashtags[1].fullText).toBe('#Zweiter');
    });

    it('sollte Positionen korrekt bestimmen', () => {
      const text = 'Start #FirstHashtag middle #SecondHashtag end';
      const hashtags = extractHashtags(text);
      
      expect(hashtags[0].position).toBe(6); // Position von '#FirstHashtag'
      expect(hashtags[1].position).toBe(27); // Position von '#SecondHashtag'
    });

    it('sollte deutsche Umlaute in Extraktion handhaben', () => {
      const text = 'Test #TechNähe und #Größe hier';
      const hashtags = extractHashtags(text);
      
      expect(hashtags).toHaveLength(2);
      expect(hashtags[0].text).toBe('TechNähe');
      expect(hashtags[1].text).toBe('Größe');
    });

    it('sollte leeren Array bei keinen Hashtags zurückgeben', () => {
      const text = 'Kein Hashtag hier';
      const hashtags = extractHashtags(text);
      
      expect(hashtags).toHaveLength(0);
    });
  });

  describe('isValidHashtag', () => {
    it('sollte gültige deutsche Hashtags validieren', () => {
      const validHashtags = [
        'TechNews',
        'Größe',
        'Fußball',
        'B2B_Marketing',
        'Event2024',
        'Test_123',
        'Nahrungsergänzungsmittel' // Lang aber gültig
      ];
      
      validHashtags.forEach(hashtag => {
        expect(isValidHashtag(hashtag)).toBe(true);
      });
    });

    it('sollte ungültige Hashtags ablehnen', () => {
      const invalidHashtags = [
        'a', // Zu kurz
        'test-hashtag', // Bindestriche
        'test.hashtag', // Punkte
        'test hashtag', // Leerzeichen
        'test@hashtag', // Sonderzeichen
        'a'.repeat(51) // Zu lang
      ];
      
      invalidHashtags.forEach(hashtag => {
        expect(isValidHashtag(hashtag)).toBe(false);
      });
    });
  });
});