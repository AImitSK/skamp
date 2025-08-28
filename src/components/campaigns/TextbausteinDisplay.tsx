// src/components/campaigns/TextbausteinDisplay.tsx - Wiederverwendbare Textbaustein-Darstellung
"use client";

import { useState } from "react";
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  TagIcon
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

interface TextbausteinDisplayProps {
  textbausteine: any[];
  isReadOnly?: boolean;
  isCustomerView?: boolean;
  showSimplified?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function TextbausteinDisplay({
  textbausteine,
  isReadOnly = false,
  isCustomerView = false,
  showSimplified = false,
  maxDisplay = isCustomerView ? 3 : 5,
  className = ""
}: TextbausteinDisplayProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  if (!textbausteine || textbausteine.length === 0) {
    return null;
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
            <span className="truncate">
              {isCustomerView ? "Verwendete Textbausteine" : "Textbausteine"}
            </span>
            <Badge color="blue" className="text-xs ml-2 flex-shrink-0">
              {textbausteine.length}
            </Badge>
          </h3>
          
          {hasMore && !isCustomerView && (
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
        {/* Customer-View Hinweis - vereinfacht */}
        {isCustomerView && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                <DocumentTextIcon className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-900 text-sm mb-1">
                  Professionelle Textbausteine verwendet
                </h4>
                <p className="text-sm text-green-800 mb-3">
                  {textbausteine.length} bewährte PR-Textbausteine sorgen für eine 
                  konsistente und professionelle Darstellung Ihrer Pressemitteilung.
                </p>
                <div className="flex flex-wrap gap-2">
                  {textbausteine.map((baustein, index) => (
                    <div key={index} className="bg-white px-3 py-1 rounded-full border border-green-200">
                      <span className="text-xs text-green-700 font-medium">
                        {baustein.type === 'boilerplate' ? 'Standard-Textbaustein' :
                         baustein.type === 'header' ? 'Header' :
                         baustein.type === 'footer' ? 'Footer' :
                         baustein.position === 'header' ? 'Kopfbereich' :
                         baustein.position === 'footer' ? 'Fußbereich' :
                         `Element ${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-600 mt-3">
                  Diese Elemente sind bereits in Ihrer Pressemitteilung integriert und 
                  sorgen für optimale Lesbarkeit und professionelle Wirkung.
                </p>
              </div>
            </div>
          </div>
        )}

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