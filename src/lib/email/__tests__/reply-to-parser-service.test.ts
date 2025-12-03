// src/lib/email/__tests__/reply-to-parser-service.test.ts
import { replyToParserService } from '../reply-to-parser-service';

describe('ReplyToParserService', () => {
  describe('parse()', () => {
    it('parst Domain-Postfach korrekt', async () => {
      const result = await replyToParserService.parse('example@inbox.sk-online-marketing.de');

      expect(result.type).toBe('domain');
      expect(result.domain).toBe('example');
      expect(result.domainId).toBe('domain-example');
    });

    it('parst Projekt-Postfach mit einfachem Format korrekt', async () => {
      // Format: {localPart}-{projectId}
      // Beispiel: presse-abc123 -> localPart="presse", projectId="abc123"
      const result = await replyToParserService.parse('presse-abc123@inbox.sk-online-marketing.de');

      expect(result.type).toBe('project');
      expect(result.localPart).toBe('presse');
      expect(result.projectId).toBe('abc123');
    });

    it('parst Projekt-Postfach mit komplexem localPart korrekt', async () => {
      // Format: {multi-part-localPart}-{projectId}
      // Beispiel: presse-news-team-xyz789 -> localPart="presse-news-team", projectId="xyz789"
      const result = await replyToParserService.parse('presse-news-team-xyz789@inbox.sk-online-marketing.de');

      expect(result.type).toBe('project');
      expect(result.localPart).toBe('presse-news-team');
      expect(result.projectId).toBe('xyz789');
    });

    it('wirft Fehler bei ungültiger Domain', async () => {
      await expect(
        replyToParserService.parse('test@gmail.com')
      ).rejects.toThrow('Invalid inbox domain');
    });

    it('parst Domain-Postfach auch wenn es nicht existiert', async () => {
      // parse() validiert nur das Format, nicht die Existenz
      const result = await replyToParserService.parse('unknown@inbox.sk-online-marketing.de');

      expect(result.type).toBe('domain');
      expect(result.domain).toBe('unknown');
      expect(result.domainId).toBe('domain-unknown');
    });

    it('parst Projekt-Postfach auch wenn Projekt nicht existiert', async () => {
      // parse() validiert nur das Format, nicht die Existenz
      const result = await replyToParserService.parse('presse-invalid-proj@inbox.sk-online-marketing.de');

      expect(result.type).toBe('project');
      expect(result.localPart).toBe('presse-invalid');
      expect(result.projectId).toBe('proj');
    });
  });
});
