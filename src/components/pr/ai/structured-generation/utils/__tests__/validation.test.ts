// src/components/pr/ai/structured-generation/utils/__tests__/validation.test.ts
/**
 * Tests für Validierungs-Utilities
 */

import {
  validateStandardMode,
  validateExpertMode,
  validateInput,
  type ValidationResult
} from '../validation';
import { GenerationContext, DocumentContext } from '@/types/ai';

describe('validateStandardMode', () => {
  describe('Valid Input', () => {
    it('sollte valid sein wenn alle Felder ausgefüllt sind', () => {
      const context: GenerationContext = {
        tone: 'modern',
        audience: 'b2b',
        industry: 'Tech',
        companyName: 'Test GmbH'
      };

      const result = validateStandardMode('Produktlaunch', context);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('sollte valid sein mit minimal erforderlichen Feldern', () => {
      const context: GenerationContext = {
        tone: 'formal',
        audience: 'consumer'
      };

      const result = validateStandardMode('Test', context);

      expect(result.isValid).toBe(true);
    });

    it('sollte valid sein mit Whitespace im Prompt (wird getrimmt)', () => {
      const context: GenerationContext = {
        tone: 'modern',
        audience: 'b2b'
      };

      const result = validateStandardMode('   Produktlaunch   ', context);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid Prompt', () => {
    it('sollte invalid sein wenn Prompt leer ist', () => {
      const context: GenerationContext = {
        tone: 'modern',
        audience: 'b2b'
      };

      const result = validateStandardMode('', context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte beschreibe das Thema der Pressemitteilung.');
    });

    it('sollte invalid sein wenn Prompt nur Whitespace enthält', () => {
      const context: GenerationContext = {
        tone: 'modern',
        audience: 'b2b'
      };

      const result = validateStandardMode('   ', context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte beschreibe das Thema der Pressemitteilung.');
    });
  });

  describe('Invalid Context', () => {
    it('sollte invalid sein wenn tone fehlt', () => {
      const context: GenerationContext = {
        audience: 'b2b'
      };

      const result = validateStandardMode('Produktlaunch', context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte wähle Tonalität und Zielgruppe aus.');
    });

    it('sollte invalid sein wenn audience fehlt', () => {
      const context: GenerationContext = {
        tone: 'modern'
      };

      const result = validateStandardMode('Produktlaunch', context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte wähle Tonalität und Zielgruppe aus.');
    });

    it('sollte invalid sein wenn beide fehlen', () => {
      const context: GenerationContext = {};

      const result = validateStandardMode('Produktlaunch', context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte wähle Tonalität und Zielgruppe aus.');
    });
  });
});

describe('validateExpertMode', () => {
  describe('Valid Input', () => {
    it('sollte valid sein mit 1 Dokument', () => {
      const docs: DocumentContext[] = [
        {
          id: 'doc1',
          fileName: 'test.celero-doc',
          plainText: 'Test',
          excerpt: 'Test',
          wordCount: 100,
          createdAt: new Date()
        }
      ];

      const result = validateExpertMode(docs);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('sollte valid sein mit mehreren Dokumenten', () => {
      const docs: DocumentContext[] = [
        {
          id: 'doc1',
          fileName: 'test1.celero-doc',
          plainText: 'Test 1',
          excerpt: 'Test 1',
          wordCount: 100,
          createdAt: new Date()
        },
        {
          id: 'doc2',
          fileName: 'test2.celero-doc',
          plainText: 'Test 2',
          excerpt: 'Test 2',
          wordCount: 200,
          createdAt: new Date()
        },
        {
          id: 'doc3',
          fileName: 'test3.celero-doc',
          plainText: 'Test 3',
          excerpt: 'Test 3',
          wordCount: 300,
          createdAt: new Date()
        }
      ];

      const result = validateExpertMode(docs);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid Input', () => {
    it('sollte invalid sein mit leerem Array', () => {
      const result = validateExpertMode([]);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte füge mindestens 1 Planungsdokument hinzu.');
    });
  });
});

describe('validateInput', () => {
  describe('Standard-Modus', () => {
    it('sollte validateStandardMode aufrufen', () => {
      const context: GenerationContext = {
        tone: 'modern',
        audience: 'b2b'
      };

      const result = validateInput('standard', 'Test', context, []);

      expect(result.isValid).toBe(true);
    });

    it('sollte Fehler von validateStandardMode zurückgeben', () => {
      const context: GenerationContext = {};

      const result = validateInput('standard', '', context, []);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte beschreibe das Thema der Pressemitteilung.');
    });
  });

  describe('Expert-Modus', () => {
    it('sollte validateExpertMode aufrufen', () => {
      const docs: DocumentContext[] = [
        {
          id: 'doc1',
          fileName: 'test.celero-doc',
          plainText: 'Test',
          excerpt: 'Test',
          wordCount: 100,
          createdAt: new Date()
        }
      ];

      const result = validateInput('expert', '', {}, docs);

      expect(result.isValid).toBe(true);
    });

    it('sollte Fehler von validateExpertMode zurückgeben', () => {
      const result = validateInput('expert', 'Test', {}, []);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bitte füge mindestens 1 Planungsdokument hinzu.');
    });

    it('sollte Prompt ignorieren im Expert-Modus', () => {
      const docs: DocumentContext[] = [
        {
          id: 'doc1',
          fileName: 'test.celero-doc',
          plainText: 'Test',
          excerpt: 'Test',
          wordCount: 100,
          createdAt: new Date()
        }
      ];

      const result = validateInput('expert', '', {}, docs);

      expect(result.isValid).toBe(true);
    });
  });
});
