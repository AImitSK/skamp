'use client';

import React from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export interface ValidationError {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  column?: number;
  fix?: string;
}

interface TemplateValidatorProps {
  htmlContent: string;
  cssContent: string;
  variables: Array<{
    name: string;
    required: boolean;
    type: 'text' | 'html' | 'image' | 'date';
  }>;
  onValidationChange: (errors: ValidationError[], isValid: boolean) => void;
  className?: string;
}

export class TemplateValidationService {
  static validateTemplate(
    htmlContent: string, 
    cssContent: string, 
    variables: Array<{ name: string; required: boolean; type: string }>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // HTML Validation
    errors.push(...this.validateHTML(htmlContent));
    
    // CSS Validation  
    errors.push(...this.validateCSS(cssContent));
    
    // Variable Validation
    errors.push(...this.validateVariables(htmlContent, variables));
    
    // Template Structure Validation
    errors.push(...this.validateTemplateStructure(htmlContent));
    
    return errors;
  }

  private static validateHTML(htmlContent: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!htmlContent || !htmlContent.trim()) {
      errors.push({
        type: 'error',
        code: 'HTML_EMPTY',
        message: 'HTML-Inhalt darf nicht leer sein',
        fix: 'Fügen Sie HTML-Inhalt hinzu'
      });
      return errors;
    }

    // Prüfe DOCTYPE
    if (!htmlContent.includes('<!DOCTYPE')) {
      errors.push({
        type: 'warning',
        code: 'HTML_NO_DOCTYPE',
        message: 'DOCTYPE-Deklaration fehlt',
        fix: 'Fügen Sie <!DOCTYPE html> am Anfang hinzu'
      });
    }

    // Prüfe grundlegende HTML-Struktur
    if (!htmlContent.includes('<html')) {
      errors.push({
        type: 'error',
        code: 'HTML_NO_HTML_TAG',
        message: '<html>-Tag fehlt',
        fix: 'Fügen Sie <html>-Tag hinzu'
      });
    }

    if (!htmlContent.includes('<head')) {
      errors.push({
        type: 'error',
        code: 'HTML_NO_HEAD_TAG',
        message: '<head>-Tag fehlt',
        fix: 'Fügen Sie <head>-Section hinzu'
      });
    }

    if (!htmlContent.includes('<body')) {
      errors.push({
        type: 'error',
        code: 'HTML_NO_BODY_TAG',
        message: '<body>-Tag fehlt',
        fix: 'Fügen Sie <body>-Section hinzu'
      });
    }

    // Prüfe auf unclosed Tags (vereinfachte Prüfung)
    const unclosedTags = this.findUnclosedTags(htmlContent);
    unclosedTags.forEach(tag => {
      errors.push({
        type: 'error',
        code: 'HTML_UNCLOSED_TAG',
        message: `Nicht geschlossener Tag: <${tag}>`,
        fix: `Fügen Sie </${tag}> hinzu`
      });
    });

    // Prüfe auf gefährliche Inhalte
    const dangerousPatterns = [
      { pattern: /<script/i, message: 'JavaScript-Code gefunden', type: 'error' as const },
      { pattern: /javascript:/i, message: 'JavaScript-URL gefunden', type: 'error' as const },
      { pattern: /on\w+\s*=/i, message: 'Event-Handler gefunden', type: 'warning' as const },
    ];

    dangerousPatterns.forEach(({ pattern, message, type }) => {
      if (pattern.test(htmlContent)) {
        errors.push({
          type,
          code: 'HTML_SECURITY_RISK',
          message: `Sicherheitsrisiko: ${message}`,
          fix: 'Entfernen Sie unsichere Inhalte'
        });
      }
    });

    // Prüfe Meta-Tags für PDF-Optimierung
    if (!htmlContent.includes('charset=')) {
      errors.push({
        type: 'warning',
        code: 'HTML_NO_CHARSET',
        message: 'Charset-Deklaration fehlt',
        fix: 'Fügen Sie <meta charset="UTF-8"> hinzu'
      });
    }

    return errors;
  }

  private static validateCSS(cssContent: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!cssContent || !cssContent.trim()) {
      errors.push({
        type: 'info',
        code: 'CSS_EMPTY',
        message: 'CSS-Inhalt ist leer',
        fix: 'Fügen Sie CSS-Styles für bessere Darstellung hinzu'
      });
      return errors;
    }

    // Prüfe grundlegende CSS-Syntax
    const openBraces = (cssContent.match(/\{/g) || []).length;
    const closeBraces = (cssContent.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push({
        type: 'error',
        code: 'CSS_UNBALANCED_BRACES',
        message: 'Ungleiche Anzahl von öffnenden und schließenden geschweiften Klammern',
        fix: 'Prüfen Sie CSS-Syntax auf fehlende Klammern'
      });
    }

    // Prüfe auf problematische CSS-Properties für PDF
    const problematicProperties = [
      'position: fixed',
      'position: sticky', 
      'transform:',
      'animation:',
      '@keyframes'
    ];

    problematicProperties.forEach(property => {
      if (cssContent.includes(property)) {
        errors.push({
          type: 'warning',
          code: 'CSS_PDF_PROBLEMATIC',
          message: `Problematisch für PDF: ${property}`,
          fix: 'Verwenden Sie PDF-kompatible CSS-Properties'
        });
      }
    });

    // Prüfe auf Print-Media-Queries
    if (!cssContent.includes('@media print')) {
      errors.push({
        type: 'info',
        code: 'CSS_NO_PRINT_STYLES',
        message: 'Keine Print-spezifischen Styles definiert',
        fix: 'Fügen Sie @media print { ... } für bessere PDF-Darstellung hinzu'
      });
    }

    // Prüfe auf absolute Einheiten
    const relativeUnits = ['em', 'rem', '%', 'vh', 'vw'];
    const hasOnlyAbsoluteUnits = !relativeUnits.some(unit => 
      cssContent.includes(unit)
    );

    if (hasOnlyAbsoluteUnits && cssContent.includes('px')) {
      errors.push({
        type: 'warning',
        code: 'CSS_ONLY_ABSOLUTE_UNITS',
        message: 'Nur absolute Einheiten (px) verwendet',
        fix: 'Verwenden Sie relative Einheiten (em, rem, %) für bessere Skalierung'
      });
    }

    return errors;
  }

  private static validateVariables(
    htmlContent: string, 
    variables: Array<{ name: string; required: boolean; type: string }>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Extrahiere verwendete Variablen aus HTML
    const usedVariables = this.extractVariablesFromHTML(htmlContent);
    const definedVariableNames = variables.map(v => v.name);

    // Prüfe auf undefinierte Variablen
    usedVariables.forEach(variableName => {
      if (!definedVariableNames.includes(variableName)) {
        errors.push({
          type: 'error',
          code: 'VAR_UNDEFINED',
          message: `Variable '${variableName}' ist nicht definiert`,
          fix: `Definieren Sie die Variable '${variableName}' oder entfernen Sie sie aus dem HTML`
        });
      }
    });

    // Prüfe auf nicht verwendete erforderliche Variablen
    variables.forEach(variable => {
      if (variable.required && !usedVariables.includes(variable.name)) {
        errors.push({
          type: 'warning',
          code: 'VAR_REQUIRED_UNUSED',
          message: `Erforderliche Variable '${variable.name}' wird nicht verwendet`,
          fix: `Verwenden Sie {{${variable.name}}} im HTML oder markieren Sie die Variable als optional`
        });
      }
    });

    // Prüfe auf doppelte Variable-Definitionen
    const duplicateNames = definedVariableNames.filter((name, index) => 
      definedVariableNames.indexOf(name) !== index
    );
    
    [...new Set(duplicateNames)].forEach(name => {
      errors.push({
        type: 'error',
        code: 'VAR_DUPLICATE',
        message: `Doppelte Variable-Definition: '${name}'`,
        fix: `Entfernen Sie eine der '${name}' Variable-Definitionen`
      });
    });

    // Prüfe Variable-Namen-Konventionen
    variables.forEach(variable => {
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variable.name)) {
        errors.push({
          type: 'warning',
          code: 'VAR_NAMING_CONVENTION',
          message: `Variable '${variable.name}' folgt nicht der Namenskonvention`,
          fix: 'Verwenden Sie nur Buchstaben und Zahlen, beginnend mit einem Buchstaben'
        });
      }
    });

    return errors;
  }

  private static validateTemplateStructure(htmlContent: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Prüfe auf grundlegende Template-Elemente
    const recommendedElements = [
      { element: 'title', message: 'Titel-Element für bessere Dokumentstruktur' },
      { element: 'meta name="viewport"', message: 'Viewport-Meta-Tag für responsive Design' },
    ];

    recommendedElements.forEach(({ element, message }) => {
      if (!htmlContent.includes(`<${element}`)) {
        errors.push({
          type: 'info',
          code: 'TEMPLATE_MISSING_ELEMENT',
          message: `Empfohlenes Element fehlt: <${element}>`,
          fix: message
        });
      }
    });

    // Prüfe auf Template-spezifische Struktur
    if (!htmlContent.includes('{{')) {
      errors.push({
        type: 'warning',
        code: 'TEMPLATE_NO_VARIABLES',
        message: 'Keine Template-Variablen gefunden',
        fix: 'Fügen Sie {{variableName}} für dynamische Inhalte hinzu'
      });
    }

    // Prüfe auf sinnvolle Seitenlayout-Struktur
    const layoutElements = ['header', 'main', 'footer', 'section', 'article'];
    const hasLayoutElements = layoutElements.some(element => 
      htmlContent.includes(`<${element}`)
    );

    if (!hasLayoutElements) {
      errors.push({
        type: 'info',
        code: 'TEMPLATE_NO_SEMANTIC_LAYOUT',
        message: 'Keine semantischen Layout-Elemente gefunden',
        fix: 'Verwenden Sie <header>, <main>, <footer> für bessere Dokumentstruktur'
      });
    }

    return errors;
  }

  private static extractVariablesFromHTML(html: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = variableRegex.exec(html)) !== null) {
      const variableName = match[1].trim();
      if (!matches.includes(variableName)) {
        matches.push(variableName);
      }
    }
    
    return matches;
  }

  private static findUnclosedTags(html: string): string[] {
    const selfClosingTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);

    const openTags: string[] = [];
    const unclosedTags: string[] = [];

    // Vereinfachte Tag-Erkennung
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      const isClosingTag = match[0].startsWith('</');
      const isSelfClosing = selfClosingTags.has(tagName) || match[0].endsWith('/>');

      if (isSelfClosing) {
        continue;
      }

      if (isClosingTag) {
        const lastOpenTag = openTags.pop();
        if (lastOpenTag !== tagName) {
          if (lastOpenTag) {
            unclosedTags.push(lastOpenTag);
          }
        }
      } else {
        openTags.push(tagName);
      }
    }

    // Alle verbleibenden offenen Tags sind unclosed
    unclosedTags.push(...openTags);

    return [...new Set(unclosedTags)]; // Remove duplicates
  }
}

export default function TemplateValidator({ 
  htmlContent, 
  cssContent, 
  variables, 
  onValidationChange, 
  className = '' 
}: TemplateValidatorProps) {
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const validationErrors = TemplateValidationService.validateTemplate(
      htmlContent, 
      cssContent, 
      variables
    );
    
    setErrors(validationErrors);
    
    const hasErrors = validationErrors.some(error => error.type === 'error');
    onValidationChange(validationErrors, !hasErrors);
  }, [htmlContent, cssContent, variables, onValidationChange]);

  const errorCount = errors.filter(e => e.type === 'error').length;
  const warningCount = errors.filter(e => e.type === 'warning').length;
  const infoCount = errors.filter(e => e.type === 'info').length;

  const getIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'error':
        return <XMarkIcon className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeColor = (type: ValidationError['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  if (errors.length === 0) {
    return (
      <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-700 font-medium">Template ist gültig</span>
        </div>
        <p className="text-green-600 text-sm mt-1">
          Keine Fehler oder Warnungen gefunden
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Summary */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {errorCount > 0 && (
                <span className="flex items-center text-red-600 text-sm font-medium">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  {errorCount} Fehler
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center text-yellow-600 text-sm font-medium">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {warningCount} Warnungen
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center text-blue-600 text-sm font-medium">
                  <InformationCircleIcon className="h-4 w-4 mr-1" />
                  {infoCount} Infos
                </span>
              )}
            </div>
          </div>
          
          <button className="text-gray-400 hover:text-gray-600">
            <svg
              className={`h-5 w-5 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Detailed Errors */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {errors.map((error, index) => (
              <div
                key={index}
                className={`p-3 border rounded-md ${getTypeColor(error.type)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    {getIcon(error.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {error.message}
                      </h4>
                      <span className="text-xs font-mono bg-white bg-opacity-50 px-2 py-1 rounded">
                        {error.code}
                      </span>
                    </div>
                    {error.line && (
                      <p className="text-sm mt-1">
                        Zeile {error.line}{error.column && `, Spalte ${error.column}`}
                      </p>
                    )}
                    {error.fix && (
                      <p className="text-sm mt-2 font-medium">
                        Lösung: {error.fix}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}