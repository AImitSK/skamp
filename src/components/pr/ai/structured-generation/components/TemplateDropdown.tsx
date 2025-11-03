// src/components/pr/ai/structured-generation/components/TemplateDropdown.tsx
/**
 * Template-Auswahl Dropdown Component
 *
 * Dropdown-Component zur Auswahl von AI-Templates mit
 * Kategorisierung, Icons und Click-Outside-Handling.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  BookOpenIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  HandRaisedIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { AITemplate } from '@/types/ai';
import clsx from 'clsx';
import { type TemplateDropdownProps } from '../types';

/**
 * Icon-Mapping für Template-Kategorien
 */
const categoryIcons: Record<string, any> = {
  product: RocketLaunchIcon,
  partnership: HandRaisedIcon,
  finance: CurrencyDollarIcon,
  corporate: BuildingOfficeIcon,
  event: CalendarIcon,
  research: BeakerIcon
};

/**
 * Template-Auswahl Dropdown
 *
 * Zeigt verfügbare AI-Templates in einem Dropdown an.
 * Features:
 * - Kategorisierte Icons
 * - Click-Outside zum Schließen
 * - Loading- und Empty-States
 * - Optimiert mit React.memo
 *
 * @example
 * ```tsx
 * <TemplateDropdown
 *   templates={templates}
 *   onSelect={handleTemplateSelect}
 *   loading={loading}
 *   selectedTemplate={selectedTemplate}
 * />
 * ```
 */
const TemplateDropdown = React.memo(function TemplateDropdown({
  templates,
  onSelect,
  loading,
  selectedTemplate
}: TemplateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (template: AITemplate) => {
    onSelect(template);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full px-4 py-3 text-left bg-white border rounded-lg shadow-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-[#005fab]",
          "hover:border-gray-400 cursor-pointer",
          isOpen ? "border-[#005fab] ring-2 ring-[#005fab]" : "border-gray-300"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-5 w-5 text-gray-400" />
            <div>
              {selectedTemplate ? (
                <>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {(() => {
                      const Icon = categoryIcons[selectedTemplate.category] || DocumentTextIcon;
                      return <Icon className="h-4 w-4 inline-block" />;
                    })()}
                    {selectedTemplate.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Template ausgewählt</div>
                </>
              ) : (
                <>
                  <div className="font-medium text-gray-700">Template verwenden (optional)</div>
                  <div className="text-xs text-gray-500 mt-1">Wähle aus bewährten Vorlagen</div>
                </>
              )}
            </div>
          </div>
          <ChevronDownIcon className={clsx(
            "h-5 w-5 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-[500px] overflow-hidden animate-fade-in-down">
            {/* Templates List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Templates werden geladen...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Keine Templates gefunden</p>
                </div>
              ) : (
                <div className="py-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {(() => {
                            const Icon = categoryIcons[template.category] || DocumentTextIcon;
                            return <Icon className="h-6 w-6 text-gray-700" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {template.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {template.description || template.prompt.substring(0, 100) + '...'}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge color="zinc" className="text-xs">
                              {template.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Klicken zum Verwenden
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                {templates.length} Templates verfügbar
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default TemplateDropdown;
