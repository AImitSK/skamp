'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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

// Translation helper type
type TranslationFunction = (key: string, values?: Record<string, any>) => string;

// Default German translations for server-side usage
const defaultTranslations: Record<string, any> = {
  'html.empty.message': 'HTML-Inhalt darf nicht leer sein',
  'html.empty.fix': 'Fügen Sie HTML-Inhalt hinzu',
  'html.noDoctype.message': 'DOCTYPE-Deklaration fehlt',
  'html.noDoctype.fix': 'Fügen Sie <!DOCTYPE html> am Anfang hinzu',
  'html.noHtmlTag.message': '<html>-Tag fehlt',
  'html.noHtmlTag.fix': 'Fügen Sie <html>-Tag hinzu',
  'html.noHeadTag.message': '<head>-Tag fehlt',
  'html.noHeadTag.fix': 'Fügen Sie <head>-Section hinzu',
  'html.noBodyTag.message': '<body>-Tag fehlt',
  'html.noBodyTag.fix': 'Fügen Sie <body>-Section hinzu',
  'html.unclosedTag.message': 'Nicht geschlossener Tag: <{tag}>',
  'html.unclosedTag.fix': 'Fügen Sie </{tag}> hinzu',
  'html.security.risk': 'Sicherheitsrisiko: {detail}',
  'html.security.fix': 'Entfernen Sie unsichere Inhalte',
  'html.security.scriptFound': 'JavaScript-Code gefunden',
  'html.security.javascriptUrl': 'JavaScript-URL gefunden',
  'html.security.eventHandler': 'Event-Handler gefunden',
  'html.noCharset.message': 'Charset-Deklaration fehlt',
  'html.noCharset.fix': 'Fügen Sie <meta charset="UTF-8"> hinzu',
  'css.empty.message': 'CSS-Inhalt ist leer',
  'css.empty.fix': 'Fügen Sie CSS-Styles für bessere Darstellung hinzu',
  'css.unbalancedBraces.message': 'Ungleiche Anzahl von öffnenden und schließenden geschweiften Klammern',
  'css.unbalancedBraces.fix': 'Prüfen Sie CSS-Syntax auf fehlende Klammern',
  'css.pdfProblematic.message': 'Problematisch für PDF: {property}',
  'css.pdfProblematic.fix': 'Verwenden Sie PDF-kompatible CSS-Properties',
  'css.noPrintStyles.message': 'Keine Print-spezifischen Styles definiert',
  'css.noPrintStyles.fix': 'Fügen Sie @media print { ... } für bessere PDF-Darstellung hinzu',
  'css.onlyAbsoluteUnits.message': 'Nur absolute Einheiten (px) verwendet',
  'css.onlyAbsoluteUnits.fix': 'Verwenden Sie relative Einheiten (em, rem, %) für bessere Skalierung',
  'variables.undefined.message': "Variable '{variableName}' ist nicht definiert",
  'variables.undefined.fix': "Definieren Sie die Variable '{variableName}' oder entfernen Sie sie aus dem HTML",
  'variables.requiredUnused.message': "Erforderliche Variable '{variableName}' wird nicht verwendet",
  'variables.requiredUnused.fix': "Verwenden Sie {{{{variableName}}}} im HTML oder markieren Sie die Variable als optional",
  'variables.duplicate.message': "Doppelte Variable-Definition: '{name}'",
  'variables.duplicate.fix': "Entfernen Sie eine der '{name}' Variable-Definitionen",
  'variables.namingConvention.message': "Variable '{variableName}' folgt nicht der Namenskonvention",
  'variables.namingConvention.fix': 'Verwenden Sie nur Buchstaben und Zahlen, beginnend mit einem Buchstaben',
  'structure.missingElement.message': 'Empfohlenes Element fehlt: <{element}>',
  'structure.titleElement.fix': 'Titel-Element für bessere Dokumentstruktur',
  'structure.viewportMeta.fix': 'Viewport-Meta-Tag für responsive Design',
  'structure.noVariables.message': 'Keine Template-Variablen gefunden',
  'structure.noVariables.fix': 'Fügen Sie {{variableName}} für dynamische Inhalte hinzu',
  'structure.noSemanticLayout.message': 'Keine semantischen Layout-Elemente gefunden',
  'structure.noSemanticLayout.fix': 'Verwenden Sie <header>, <main>, <footer> für bessere Dokumentstruktur',
};

// Helper function to interpolate variables in translation strings
function interpolate(template: string, values?: Record<string, any>): string {
  if (!values) return template;
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
}

export class TemplateValidationService {
  // Overload signatures
  static validateTemplate(
    htmlContent: string,
    cssContent: string,
    variables: Array<{ name: string; required: boolean; type: string }>
  ): ValidationError[];
  static validateTemplate(
    htmlContent: string,
    cssContent: string,
    variables: Array<{ name: string; required: boolean; type: string }>,
    t: TranslationFunction
  ): ValidationError[];

  // Implementation
  static validateTemplate(
    htmlContent: string,
    cssContent: string,
    variables: Array<{ name: string; required: boolean; type: string }>,
    t?: TranslationFunction
  ): ValidationError[] {
    // Use default translations if no translation function is provided
    const translate: TranslationFunction = t || ((key: string, values?: Record<string, any>) => {
      const template = defaultTranslations[key] || key;
      return interpolate(template, values);
    });

    const errors: ValidationError[] = [];

    // HTML Validation
    errors.push(...this.validateHTML(htmlContent, translate));

    // CSS Validation
    errors.push(...this.validateCSS(cssContent, translate));

    // Variable Validation
    errors.push(...this.validateVariables(htmlContent, variables, translate));

    // Template Structure Validation
    errors.push(...this.validateTemplateStructure(htmlContent, translate));

    return errors;
  }

  private static validateHTML(htmlContent: string, t: TranslationFunction): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!htmlContent || !htmlContent.trim()) {
      errors.push({
        type: 'error',
        code: 'HTML_EMPTY',
        message: t('html.empty.message'),
        fix: t('html.empty.fix')
      });
      return errors;
    }

    // Prüfe DOCTYPE
    if (!htmlContent.includes('<!DOCTYPE')) {
      errors.push({
        type: 'warning',
        code: 'HTML_NO_DOCTYPE',
        message: t('html.noDoctype.message'),
        fix: t('html.noDoctype.fix')
      });
    }

    // Prüfe grundlegende HTML-Struktur
    if (!htmlContent.includes('<html')) {
      errors.push({
        type: 'error',
        code: 'HTML_NO_HTML_TAG',
        message: t('html.noHtmlTag.message'),
        fix: t('html.noHtmlTag.fix')
      });
    }

    if (!htmlContent.includes('<head')) {
      errors.push({
        type: 'error',
        code: 'HTML_NO_HEAD_TAG',
        message: t('html.noHeadTag.message'),
        fix: t('html.noHeadTag.fix')
      });
    }

    if (!htmlContent.includes('<body')) {
      errors.push({
        type: 'error',
        code: 'HTML_NO_BODY_TAG',
        message: t('html.noBodyTag.message'),
        fix: t('html.noBodyTag.fix')
      });
    }

    // Prüfe auf unclosed Tags (vereinfachte Prüfung)
    const unclosedTags = this.findUnclosedTags(htmlContent);
    unclosedTags.forEach(tag => {
      errors.push({
        type: 'error',
        code: 'HTML_UNCLOSED_TAG',
        message: t('html.unclosedTag.message', { tag }),
        fix: t('html.unclosedTag.fix', { tag })
      });
    });

    // Prüfe auf gefährliche Inhalte
    const dangerousPatterns = [
      { pattern: /<script/i, messageKey: 'html.security.scriptFound', type: 'error' as const },
      { pattern: /javascript:/i, messageKey: 'html.security.javascriptUrl', type: 'error' as const },
      { pattern: /on\w+\s*=/i, messageKey: 'html.security.eventHandler', type: 'warning' as const },
    ];

    dangerousPatterns.forEach(({ pattern, messageKey, type }) => {
      if (pattern.test(htmlContent)) {
        errors.push({
          type,
          code: 'HTML_SECURITY_RISK',
          message: t('html.security.risk', { detail: t(messageKey) }),
          fix: t('html.security.fix')
        });
      }
    });

    // Prüfe Meta-Tags für PDF-Optimierung
    if (!htmlContent.includes('charset=')) {
      errors.push({
        type: 'warning',
        code: 'HTML_NO_CHARSET',
        message: t('html.noCharset.message'),
        fix: t('html.noCharset.fix')
      });
    }

    return errors;
  }

  private static validateCSS(cssContent: string, t: TranslationFunction): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!cssContent || !cssContent.trim()) {
      errors.push({
        type: 'info',
        code: 'CSS_EMPTY',
        message: t('css.empty.message'),
        fix: t('css.empty.fix')
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
        message: t('css.unbalancedBraces.message'),
        fix: t('css.unbalancedBraces.fix')
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
          message: t('css.pdfProblematic.message', { property }),
          fix: t('css.pdfProblematic.fix')
        });
      }
    });

    // Prüfe auf Print-Media-Queries
    if (!cssContent.includes('@media print')) {
      errors.push({
        type: 'info',
        code: 'CSS_NO_PRINT_STYLES',
        message: t('css.noPrintStyles.message'),
        fix: t('css.noPrintStyles.fix')
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
        message: t('css.onlyAbsoluteUnits.message'),
        fix: t('css.onlyAbsoluteUnits.fix')
      });
    }

    return errors;
  }

  private static validateVariables(
    htmlContent: string,
    variables: Array<{ name: string; required: boolean; type: string }>,
    t: TranslationFunction
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
          message: t('variables.undefined.message', { variableName }),
          fix: t('variables.undefined.fix', { variableName })
        });
      }
    });

    // Prüfe auf nicht verwendete erforderliche Variablen
    variables.forEach(variable => {
      if (variable.required && !usedVariables.includes(variable.name)) {
        errors.push({
          type: 'warning',
          code: 'VAR_REQUIRED_UNUSED',
          message: t('variables.requiredUnused.message', { variableName: variable.name }),
          fix: t('variables.requiredUnused.fix', { variableName: variable.name })
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
        message: t('variables.duplicate.message', { name }),
        fix: t('variables.duplicate.fix', { name })
      });
    });

    // Prüfe Variable-Namen-Konventionen
    variables.forEach(variable => {
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variable.name)) {
        errors.push({
          type: 'warning',
          code: 'VAR_NAMING_CONVENTION',
          message: t('variables.namingConvention.message', { variableName: variable.name }),
          fix: t('variables.namingConvention.fix')
        });
      }
    });

    return errors;
  }

  private static validateTemplateStructure(htmlContent: string, t: TranslationFunction): ValidationError[] {
    const errors: ValidationError[] = [];

    // Prüfe auf grundlegende Template-Elemente
    const recommendedElements = [
      { element: 'title', fixKey: 'structure.titleElement.fix' },
      { element: 'meta name="viewport"', fixKey: 'structure.viewportMeta.fix' },
    ];

    recommendedElements.forEach(({ element, fixKey }) => {
      if (!htmlContent.includes(`<${element}`)) {
        errors.push({
          type: 'info',
          code: 'TEMPLATE_MISSING_ELEMENT',
          message: t('structure.missingElement.message', { element }),
          fix: t(fixKey)
        });
      }
    });

    // Prüfe auf Template-spezifische Struktur
    if (!htmlContent.includes('{{')) {
      errors.push({
        type: 'warning',
        code: 'TEMPLATE_NO_VARIABLES',
        message: t('structure.noVariables.message'),
        fix: t('structure.noVariables.fix')
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
        message: t('structure.noSemanticLayout.message'),
        fix: t('structure.noSemanticLayout.fix')
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
  const t = useTranslations('templates.validator');
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const validationErrors = TemplateValidationService.validateTemplate(
      htmlContent,
      cssContent,
      variables,
      t
    );

    setErrors(validationErrors);

    const hasErrors = validationErrors.some(error => error.type === 'error');
    onValidationChange(validationErrors, !hasErrors);
  }, [htmlContent, cssContent, variables, onValidationChange, t]);

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
          <span className="text-green-700 font-medium">{t('ui.valid')}</span>
        </div>
        <p className="text-green-600 text-sm mt-1">
          {t('ui.noIssues')}
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
                  {t('ui.errorCount', { count: errorCount })}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center text-yellow-600 text-sm font-medium">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {t('ui.warningCount', { count: warningCount })}
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center text-blue-600 text-sm font-medium">
                  <InformationCircleIcon className="h-4 w-4 mr-1" />
                  {t('ui.infoCount', { count: infoCount })}
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
                        {t('ui.line', { line: error.line })}{error.column && `, ${t('ui.column', { column: error.column })}`}
                      </p>
                    )}
                    {error.fix && (
                      <p className="text-sm mt-2 font-medium">
                        {t('ui.solution')}: {error.fix}
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