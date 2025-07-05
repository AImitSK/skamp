// src/components/pr/campaign/CampaignContentComposer.tsx
"use client";

import { useState, useEffect } from 'react';
import { RichTextEditor } from '@/components/RichTextEditor';
import IntelligentBoilerplateSection, { BoilerplateSection } from './IntelligentBoilerplateSection';
import { processBoilerplates } from '@/lib/boilerplate-processor';
import { Field, Label } from '@/components/fieldset';
import { Input } from '@/components/input';

interface CampaignContentComposerProps {
  userId: string;
  clientId?: string;
  clientName?: string;
  title: string;
  onTitleChange: (title: string) => void;
  mainContent: string;
  onMainContentChange: (content: string) => void;
  onFullContentChange: (fullContent: string) => void;
  onBoilerplateSectionsChange?: (sections: BoilerplateSection[]) => void; // NEU
  initialBoilerplateSections?: BoilerplateSection[]; // NEU
}

export default function CampaignContentComposer({
  userId,
  clientId,
  clientName,
  title,
  onTitleChange,
  mainContent,
  onMainContentChange,
  onFullContentChange,
  onBoilerplateSectionsChange,
  initialBoilerplateSections = []
}: CampaignContentComposerProps) {
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>(initialBoilerplateSections);
  const [processedContent, setProcessedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Update parent when sections change
  const handleBoilerplateSectionsChange = (sections: BoilerplateSection[]) => {
    setBoilerplateSections(sections);
    if (onBoilerplateSectionsChange) {
      onBoilerplateSectionsChange(sections);
    }
  };

  // Process content whenever sections or main content changes
  useEffect(() => {
    const composeFullContent = async () => {
      const context = {
        company: { 
          name: clientName || '',
          // Weitere Firmendaten können hier ergänzt werden
        },
        date: { 
          today: new Date(),
          year: new Date().getFullYear()
        },
        campaign: { 
          title 
        }
      };

      const composed = await processBoilerplates(
        boilerplateSections,
        mainContent,
        context
      );

      setProcessedContent(composed);
      onFullContentChange(composed);
    };

    composeFullContent();
  }, [boilerplateSections, mainContent, title, clientName]);

  return (
    <div className="space-y-6">
      {/* Title Input */}
      <Field>
        <Label>Titel der Pressemitteilung *</Label>
        <Input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="z.B. Neue Partnerschaft revolutioniert die Branche"
          required
        />
      </Field>

      {/* Boilerplate Sections */}
      <div className="bg-gray-50 rounded-lg p-4">
        <IntelligentBoilerplateSection
          userId={userId}
          clientId={clientId}
          clientName={clientName}
          onContentChange={handleBoilerplateSectionsChange}
          initialSections={boilerplateSections}
        />
      </div>

      {/* Main Content Editor */}
      <Field>
        <Label>Hauptinhalt der Pressemitteilung *</Label>
        <div className="mt-2 border rounded-lg">
          <RichTextEditor
            content={mainContent}
            onChange={onMainContentChange}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Schreibe hier den individuellen Inhalt deiner Pressemitteilung. Die Textbausteine werden automatisch an den entsprechenden Stellen eingefügt.
        </p>
      </Field>

      {/* Preview Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-2"
        >
          <span>{showPreview ? '▼' : '▶'}</span>
          Vorschau der vollständigen Pressemitteilung
        </button>
        
        {showPreview && (
          <div className="mt-4 p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Vorschau</h3>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: processedContent || '<p class="text-gray-500">Noch kein Inhalt vorhanden</p>' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}