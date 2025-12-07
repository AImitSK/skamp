// src/app/api/ai/translate/route.ts
// API Route für KI-gestützte Pressemitteilungs-Übersetzung mit Glossar-Unterstützung

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { translatePressReleaseFlow } from '@/lib/ai/flows/translate-press-release';
import { glossaryAdminService } from '@/lib/firebase-admin/glossary-admin-service';
import { translationAdminService } from '@/lib/firebase-admin/translation-admin-service';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';
import { LanguageCode } from '@/types/international';
import { GlossaryEntry } from '@/lib/ai/schemas/translate-press-release-schemas';

/**
 * Request-Interface für Übersetzungs-Anfragen
 */
interface TranslateRequest {
  /** Projekt-ID für die Übersetzung */
  projectId: string;
  /** Optional: Kampagnen-ID */
  campaignId?: string;
  /** Titel der Pressemitteilung */
  title: string;
  /** HTML-Content der Pressemitteilung */
  content: string;
  /** Quellsprache (ISO 639-1, z.B. 'de') */
  sourceLanguage: LanguageCode;
  /** Zielsprache (ISO 639-1, z.B. 'en') */
  targetLanguage: LanguageCode;
  /** Optional: Kunden-ID für Glossar-Einträge */
  customerId?: string;
  /** Optional: Glossar verwenden (default: true) */
  useGlossary?: boolean;
  /** Optional: Tonalität (default: 'professional') */
  tone?: 'formal' | 'professional' | 'neutral';
  /** Optional: HTML-Formatierung beibehalten (default: true) */
  preserveFormatting?: boolean;
  /** Optional: Aktuelle Version des Originals (für Outdated-Tracking) */
  sourceVersion?: number;
}

/**
 * POST /api/ai/translate
 *
 * Übersetzt eine Pressemitteilung in die Zielsprache mit optionaler Glossar-Unterstützung.
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/ai/translate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     projectId: 'proj-123',
 *     title: 'Pressemitteilung Titel',
 *     content: '<p>Inhalt der PM...</p>',
 *     sourceLanguage: 'de',
 *     targetLanguage: 'en',
 *     customerId: 'company-456'
 *   })
 * });
 * ```
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data: TranslateRequest = await req.json();

      // ══════════════════════════════════════════════════════════════
      // 1. INPUT-VALIDIERUNG
      // ══════════════════════════════════════════════════════════════

      const {
        projectId,
        campaignId,
        title,
        content,
        sourceLanguage,
        targetLanguage,
        customerId,
        useGlossary = true,
        tone = 'professional',
        preserveFormatting = true,
        sourceVersion = 1
      } = data;

      // Pflichtfelder prüfen
      if (!projectId) {
        return NextResponse.json(
          { error: 'projectId ist erforderlich' },
          { status: 400 }
        );
      }

      if (!title || title.trim() === '') {
        return NextResponse.json(
          { error: 'title ist erforderlich' },
          { status: 400 }
        );
      }

      if (!content || content.trim() === '') {
        return NextResponse.json(
          { error: 'content ist erforderlich' },
          { status: 400 }
        );
      }

      if (!sourceLanguage || !targetLanguage) {
        return NextResponse.json(
          { error: 'sourceLanguage und targetLanguage sind erforderlich' },
          { status: 400 }
        );
      }

      if (sourceLanguage === targetLanguage) {
        return NextResponse.json(
          { error: 'Quell- und Zielsprache dürfen nicht identisch sein' },
          { status: 400 }
        );
      }

      console.log('🌐 Übersetzungs-Request erhalten', {
        projectId,
        sourceLanguage,
        targetLanguage,
        contentLength: content.length,
        titleLength: title.length,
        useGlossary,
        customerId,
        organizationId: auth.organizationId
      });

      // ══════════════════════════════════════════════════════════════
      // 2. AI-LIMIT PRÜFEN
      // ══════════════════════════════════════════════════════════════

      const estimatedWords = estimateAIWords(title + content, 1200); // Übersetzung braucht etwas mehr

      try {
        const limitCheck = await checkAILimit(auth.organizationId, estimatedWords);

        if (!limitCheck.allowed) {
          return NextResponse.json(
            {
              error: `AI-Limit erreicht! Du hast bereits ${limitCheck.current} von ${limitCheck.limit} AI-Wörtern verwendet. Noch verfügbar: ${limitCheck.remaining} Wörter.`,
              limitInfo: {
                current: limitCheck.current,
                limit: limitCheck.limit,
                remaining: limitCheck.remaining,
                wouldExceed: limitCheck.wouldExceed,
                requestedAmount: estimatedWords
              }
            },
            { status: 429 }
          );
        }
      } catch (limitError) {
        console.error('❌ Error checking AI limit:', limitError);
        return NextResponse.json(
          { error: 'Fehler beim Prüfen des AI-Limits. Bitte kontaktiere den Support.' },
          { status: 500 }
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 3. GLOSSAR-EINTRÄGE LADEN (optional)
      // ══════════════════════════════════════════════════════════════

      let glossaryEntries: GlossaryEntry[] = [];

      if (useGlossary && customerId) {
        try {
          const customerGlossary = await glossaryAdminService.getApprovedForLanguages(
            auth.organizationId,
            customerId,
            sourceLanguage,
            targetLanguage
          );

          // Konvertiere zu GlossaryEntry für den Flow
          glossaryEntries = customerGlossary.map(entry => ({
            id: entry.id,
            source: entry.translations[sourceLanguage],
            target: entry.translations[targetLanguage],
            context: entry.context || null
          }));

          console.log('📚 Glossar geladen', {
            approvedWithBothLanguages: glossaryEntries.length,
            customerId
          });
        } catch (glossaryError) {
          console.warn('⚠️ Glossar konnte nicht geladen werden:', glossaryError);
          // Weiter ohne Glossar - kein harter Fehler
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 4. GENKIT FLOW AUFRUFEN
      // ══════════════════════════════════════════════════════════════

      console.log('🚀 Starte Übersetzungs-Flow', {
        sourceLanguage,
        targetLanguage,
        glossaryCount: glossaryEntries.length,
        tone,
        preserveFormatting
      });

      const translationResult = await translatePressReleaseFlow({
        content,
        title,
        sourceLanguage,
        targetLanguage,
        glossaryEntries: glossaryEntries.length > 0 ? glossaryEntries : null,
        tone,
        preserveFormatting,
        customerId
      });

      console.log('✅ Übersetzung erfolgreich', {
        translatedTitleLength: translationResult.translatedTitle.length,
        translatedContentLength: translationResult.translatedContent.length,
        glossaryUsed: translationResult.glossaryUsed.length,
        confidence: translationResult.confidence
      });

      // ══════════════════════════════════════════════════════════════
      // 5. IN FIRESTORE SPEICHERN (Upsert - Update oder Create)
      // ══════════════════════════════════════════════════════════════

      const savedTranslation = await translationAdminService.upsert(
        auth.organizationId,
        {
          projectId,
          campaignId,
          language: targetLanguage,
          title: translationResult.translatedTitle,
          content: translationResult.translatedContent,
          modelUsed: translationResult.modelUsed,
          glossaryEntriesUsed: translationResult.glossaryUsed,
          sourceVersion
        }
      );

      console.log('💾 Übersetzung gespeichert', {
        translationId: savedTranslation.id,
        projectId,
        language: targetLanguage
      });

      // ══════════════════════════════════════════════════════════════
      // 6. AI-USAGE TRACKEN
      // ══════════════════════════════════════════════════════════════

      try {
        const inputText = title + content;
        const outputText = translationResult.translatedTitle + translationResult.translatedContent;
        await trackAIUsage(auth.organizationId, inputText, outputText);
      } catch (trackingError) {
        console.error('⚠️ Failed to track AI usage:', trackingError);
        // Weiter - kein harter Fehler
      }

      // ══════════════════════════════════════════════════════════════
      // 7. RESPONSE
      // ══════════════════════════════════════════════════════════════

      return NextResponse.json({
        success: true,
        translation: {
          id: savedTranslation.id,
          projectId,
          language: targetLanguage,
          title: translationResult.translatedTitle,
          content: translationResult.translatedContent,
          status: 'generated',
          isOutdated: false
        },
        stats: {
          sourceLanguage,
          targetLanguage,
          originalCharCount: translationResult.stats.originalCharCount,
          translatedCharCount: translationResult.stats.translatedCharCount,
          glossaryMatchCount: translationResult.stats.glossaryMatchCount,
          confidence: translationResult.confidence
        },
        meta: {
          aiProvider: 'genkit',
          model: translationResult.modelUsed,
          timestamp: translationResult.timestamp,
          glossaryUsed: translationResult.glossaryUsed
        }
      });

    } catch (error: any) {
      console.error('❌ Übersetzungs-Fehler:', error);

      const errorMessage = error.message || 'Unbekannter Fehler bei der Übersetzung';

      return NextResponse.json(
        { error: `Fehler bei der Übersetzung: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

/**
 * OPTIONS für CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
