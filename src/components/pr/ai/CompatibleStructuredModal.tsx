// src/components/pr/ai/CompatibleStructuredModal.tsx - KORRIGIERT
"use client";

import React from 'react';
import { AIServiceAdapter, LegacyGenerationResult } from '@/lib/ai/interface-adapters';
import { GenerationResult as EnhancedGenerationResult } from '@/types/ai';

// Temporärer Placeholder für StructuredGenerationModal
const StructuredGenerationModalPlaceholder = ({ onClose, onGenerate }: any) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">KI-Assistent (Placeholder)</h3>
        <p className="mb-4">StructuredGenerationModal wird später implementiert</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">
            Schließen
          </button>
          <button 
            onClick={() => {
              // Test-Result für Development
              const testResult: EnhancedGenerationResult = {
                headline: "Test Headline",
                content: "<h1>Test Headline</h1><p>Test content</p>",
                structured: {
                  headline: "Test Headline",
                  leadParagraph: "Test lead paragraph",
                  bodyParagraphs: ["Test body paragraph"],
                  quote: {
                    text: "Test quote",
                    person: "Test Person",
                    role: "CEO",
                    company: "Test Company"
                  },
                  boilerplate: "Test boilerplate"
                },
                metadata: {
                  generatedBy: "test",
                  timestamp: new Date().toISOString()
                }
              };
              onGenerate(testResult);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Generierung
          </button>
        </div>
      </div>
    </div>
  );
};

interface Props {
  onClose: () => void;
  onGenerate: (result: LegacyGenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
}

/**
 * Wrapper-Komponente für Legacy Campaign Pages
 * Konvertiert zwischen Enhanced und Legacy Interfaces
 */
export default function CompatibleStructuredModal({ 
  onClose, 
  onGenerate, 
  existingContent 
}: Props) {
  
  const handleEnhancedGenerate = (enhancedResult: EnhancedGenerationResult) => {
    console.log('🔄 Converting Enhanced to Legacy format...');
    
    if (!enhancedResult.structured) {
      console.error('❌ Enhanced result missing structured data');
      return;
    }
    
    try {
      // Konvertiere Enhanced Result zu Legacy Format
      const legacyResult = AIServiceAdapter.enhancedToLegacy(enhancedResult);
      
      console.log('✅ Conversion successful:', {
        enhanced: enhancedResult.structured.headline,
        legacy: legacyResult.headline
      });
      
      // Rufe Legacy Handler auf
      onGenerate(legacyResult);
      
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      
      // Fallback: Erstelle manuell Legacy-kompatibles Result
      const fallbackResult: LegacyGenerationResult = {
        headline: enhancedResult.structured.headline,
        content: enhancedResult.content,
        structured: {
          headline: enhancedResult.structured.headline,
          leadParagraph: enhancedResult.structured.leadParagraph,
          bodyParagraphs: enhancedResult.structured.bodyParagraphs,
          quote: enhancedResult.structured.quote, // KORRIGIERT: quote statt quotes
          boilerplate: enhancedResult.structured.boilerplate
        },
        metadata: {
          generatedBy: enhancedResult.metadata?.generatedBy || 'enhanced-service',
          timestamp: enhancedResult.metadata?.timestamp || new Date().toISOString(),
          context: enhancedResult.metadata?.context ? {
            industry: enhancedResult.metadata.context.industry,
            tone: enhancedResult.metadata.context.tone,
            audience: enhancedResult.metadata.context.audience
          } : undefined
        }
      };
      
      onGenerate(fallbackResult);
    }
  };

  return (
    <StructuredGenerationModalPlaceholder
      onClose={onClose}
      onGenerate={handleEnhancedGenerate}
      existingContent={existingContent}
    />
  );
}

// Export auch als Named Export für Flexibilität
export { CompatibleStructuredModal };