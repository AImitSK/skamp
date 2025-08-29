// src/components/campaigns/TextbausteinDisplay.tsx - Wiederverwendbare Textbaustein-Darstellung
"use client";

import { useState, useEffect } from "react";
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  TagIcon
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { Boilerplate } from "@/types/crm-enhanced";
import clsx from "clsx";

interface TextbausteinDisplayProps {
  textbausteine: any[]; // IDs oder bereits geladene Textbausteine
  organizationId?: string; // Für das Laden der Textbausteine
  isReadOnly?: boolean;
  isCustomerView?: boolean;
  showSimplified?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function TextbausteinDisplay({
  textbausteine,
  organizationId,
  isReadOnly = false,
  isCustomerView = false,
  showSimplified = false,
  maxDisplay = isCustomerView ? 3 : 5,
  className = ""
}: TextbausteinDisplayProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [loadedBoilerplates, setLoadedBoilerplates] = useState<Boilerplate[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Lade Textbausteine wenn IDs übergeben wurden
  useEffect(() => {
    if (!textbausteine || textbausteine.length === 0) {
      setLoadedBoilerplates([]);
      return;
    }
    
    // Prüfe ob bereits geladene Boilerplates oder nur IDs
    const hasContent = textbausteine.some(item => item.content || item.name);
    if (hasContent) {
      // Bereits geladene Daten
      setLoadedBoilerplates(textbausteine);
      return;
    }
    
    // Lade Boilerplates anhand der IDs
    if (organizationId) {
      setLoading(true);
      const boilerplateIds = textbausteine.filter(item => typeof item === 'string' || item.id);
      const ids = boilerplateIds.map(item => typeof item === 'string' ? item : item.id);
      
      boilerplatesService.getByIds(ids)
        .then(setLoadedBoilerplates)
        .catch(error => {
          console.error('Fehler beim Laden der Textbausteine:', error);
          setLoadedBoilerplates([]);
        })
        .finally(() => setLoading(false));
    }
  }, [textbausteine, organizationId]);
  
  if (!textbausteine || textbausteine.length === 0) {
    return null;
  }
  
  if (loading) {
    return (
      <div className={clsx("space-y-6", className)}>
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  
  const toggleItemExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const displayedTextbausteine = isExpanded ? textbausteine : textbausteine.slice(0, maxDisplay);
  const hasMore = textbausteine.length > maxDisplay;

  // Für Customer-View: Einfache Ausgabe der Textbausteine direkt im Text
  if (isCustomerView) {
    return (
      <div className={clsx("space-y-6", className)}>
        {loadedBoilerplates.map((boilerplate, index) => (
          <div key={boilerplate.id || index}>
            <h3 className="font-semibold text-gray-900 mb-3">
              {boilerplate.name || `Textbaustein ${index + 1}`}
            </h3>
            {boilerplate.content && (
              <div 
                className="prose max-w-none text-gray-700 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: boilerplate.content 
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx(
      "bg-white rounded-lg border border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <span className="truncate">Textbausteine</span>
            <Badge color="blue" className="text-xs ml-2 flex-shrink-0">
              {textbausteine.length}
            </Badge>
          </h3>
          
          {hasMore && (
            <Button
              onClick={toggleExpanded}
              className="text-gray-500 hover:text-gray-700"
              plain
            >
              {isExpanded ? (
                <>
                  <ChevronDownIcon className="h-4 w-4 mr-1" />
                  Weniger anzeigen
                </>
              ) : (
                <>
                  <ChevronRightIcon className="h-4 w-4 mr-1" />
                  Alle {textbausteine.length} anzeigen
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">

        {/* Textbausteine Liste - nur für Agency-View wenn Content verfügbar */}
        {!isCustomerView && (
          <div className="space-y-4">
            {displayedTextbausteine.map((baustein, index) => {
            const isItemExpanded = expandedItems.has(index);
            const shouldTruncate = !isCustomerView && baustein.content && baustein.content.length > 150;
            
            return (
              <div
                key={index}
                className={clsx(
                  "border border-gray-200 rounded-lg",
                  isCustomerView ? "bg-gray-50" : "bg-white",
                  !isReadOnly && "hover:bg-gray-50 transition-colors"
                )}
              >
                <div className="p-4">
                  {/* Textbaustein Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className={clsx(
                        "font-medium",
                        isCustomerView ? "text-gray-900 text-sm" : "text-gray-900"
                      )}>
                        {baustein.title || baustein.name || baustein.customTitle || 
                         (isCustomerView ? (
                           baustein.type === 'boilerplate' ? 'Standard-Textbaustein' :
                           baustein.type === 'header' ? 'Header-Element' :
                           baustein.type === 'footer' ? 'Footer-Element' :
                           baustein.type === 'quote' ? 'Zitat' :
                           `Textbaustein ${index + 1}`
                         ) : `${baustein.type}-Element`)}
                      </h4>
                      
                      {/* Kategorie/Typ */}
                      {baustein.category && !showSimplified && (
                        <div className="flex items-center gap-1 mt-1">
                          <TagIcon className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{baustein.category}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Typ-Badge */}
                    {baustein.type && !showSimplified && (
                      <Badge 
                        color={baustein.type === 'boilerplate' ? 'blue' : 'zinc'} 
                        className="text-xs"
                      >
                        {baustein.type === 'boilerplate' ? 'Standard' : 'Custom'}
                      </Badge>
                    )}
                  </div>

                  {/* Textbaustein Inhalt */}
                  {(baustein.content || baustein.text || baustein.id) && (
                    <div className="mt-2">
                      <div className={clsx(
                        "text-gray-700 leading-relaxed",
                        isCustomerView ? "text-sm" : "text-sm",
                        shouldTruncate && !isItemExpanded && "line-clamp-3"
                      )}>
                        {(() => {
                          const content = baustein.content || baustein.text;
                          if (content) {
                            return typeof content === 'string' ? (
                              <p>{content}</p>
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: content }} />
                            );
                          } else if (isCustomerView) {
                            // Customer-View: Freundliche Beschreibung statt technische IDs
                            const typeLabels = {
                              'boilerplate': 'Standard-Textbaustein',
                              'header': 'Header-Element', 
                              'footer': 'Footer-Element',
                              'quote': 'Zitat',
                              'main': 'Haupttext-Element'
                            };
                            const typeLabel = typeLabels[baustein.type as keyof typeof typeLabels] || 'Textbaustein';
                            
                            return (
                              <div className="text-gray-700">
                                <p className="mb-2">
                                  <span className="font-medium">{typeLabel}</span>
                                  {baustein.position && (
                                    <span className="text-gray-500 text-sm ml-2">
                                      ({baustein.position === 'header' ? 'Kopfbereich' : 
                                        baustein.position === 'footer' ? 'Fußbereich' : 
                                        baustein.position})
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                  Dieser Textbaustein sorgt für eine professionelle und konsistente 
                                  Darstellung Ihrer Pressemitteilung gemäß bewährten PR-Standards.
                                </p>
                              </div>
                            );
                          } else {
                            // Agency-View: Technische Details
                            return (
                              <p className="text-gray-500 italic text-sm">
                                ID: {baustein.id} ({baustein.type || 'unbekannt'})
                                {baustein.position && ` - ${baustein.position}`}
                              </p>
                            );
                          }
                        })()}
                      </div>
                      
                      {/* Erweitern/Einklappen Button */}
                      {shouldTruncate && !isCustomerView && (
                        <Button
                          onClick={() => toggleItemExpanded(index)}
                          className="mt-2 text-[#005fab] hover:text-[#004a8c] text-sm"
                          plain
                        >
                          {isItemExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Keywords/Tags (nur Agency-View) */}
                  {baustein.keywords && !isCustomerView && !showSimplified && baustein.keywords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Keywords:</div>
                      <div className="flex flex-wrap gap-1">
                        {baustein.keywords.slice(0, 5).map((keyword: string, kidx: number) => (
                          <span
                            key={kidx}
                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                        {baustein.keywords.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{baustein.keywords.length - 5} weitere
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* "Mehr anzeigen" für Customer-View - entfernt da nicht mehr benötigt */}
        {hasMore && isCustomerView && !isExpanded && (
          <div className="mt-4 text-center">
            <Button
              onClick={toggleExpanded}
              className="text-[#005fab] hover:text-[#004a8c]"
              plain
            >
              {textbausteine.length - maxDisplay} weitere Textbausteine anzeigen
            </Button>
          </div>
        )}

        {/* Customer-View Zusammenfassung */}
        {isCustomerView && showSimplified && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <strong>{textbausteine.length}</strong> Textbausteine wurden für 
              eine konsistente und professionelle Darstellung verwendet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}