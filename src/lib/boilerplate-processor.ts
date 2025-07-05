// src/lib/boilerplate-processor.ts
import { BoilerplateSection } from '@/components/pr/campaign/IntelligentBoilerplateSection';

export async function processBoilerplates(
  sections: BoilerplateSection[],
  mainContent: string,
  context: any
): Promise<string> {
  // Group sections by position
  const headerSections = sections.filter(s => s.position === 'header' && !s.isCollapsed).sort((a, b) => a.order - b.order);
  const customSections = sections.filter(s => s.position === 'custom' && !s.isCollapsed).sort((a, b) => a.order - b.order);
  const footerSections = sections.filter(s => s.position === 'footer' && !s.isCollapsed).sort((a, b) => a.order - b.order);

  const parts: string[] = [];

  // Add header sections
  for (const section of headerSections) {
    if (section.boilerplate) {
      const processed = processVariables(section.boilerplate.content, context);
      parts.push(`<div class="boilerplate-header">${processed}</div>`);
    }
  }

  // Add separator after headers if any exist
  if (headerSections.length > 0 && (mainContent || customSections.length > 0)) {
    parts.push('<hr class="my-6" />');
  }

  // Add main content with custom sections
  if (mainContent) {
    parts.push(`<div class="main-content">${mainContent}</div>`);
  }

  // Add custom sections after main content
  for (const section of customSections) {
    if (section.boilerplate) {
      const processed = processVariables(section.boilerplate.content, context);
      parts.push(`<div class="boilerplate-custom mt-4">${processed}</div>`);
    }
  }

  // Add separator before footers if any exist
  if (footerSections.length > 0 && (parts.length > 0)) {
    parts.push('<hr class="my-6" />');
  }

  // Add footer sections
  for (const section of footerSections) {
    if (section.boilerplate) {
      const processed = processVariables(section.boilerplate.content, context);
      parts.push(`<div class="boilerplate-footer">${processed}</div>`);
    }
  }

  return parts.join('\n\n');
}

export function processVariables(template: string, context: any): string {
  const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
  
  return template.replace(VARIABLE_REGEX, (match: string, variable: string) => {
    // Trim whitespace
    variable = variable.trim();
    
    // Handle filters
    if (variable.includes('|')) {
      const [varPath, ...filters] = variable.split('|').map((s: string) => s.trim());
      const value = getNestedValue(context, varPath);
      return applyFilters(value, filters) || match;
    }
    
    // Simple variable replacement
    const value = getNestedValue(context, variable);
    return value !== undefined && value !== null ? String(value) : match;
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current: any, key: string) => {
    return current?.[key];
  }, obj);
}

function applyFilters(value: any, filters: string[]): string {
  let result = value;
  
  for (const filter of filters) {
    const [filterName, ...args] = filter.split(':').map((s: string) => s.trim());
    
    switch (filterName) {
      case 'format':
        if (result instanceof Date) {
          const format = args[0]?.replace(/['"]/g, '') || 'DD.MM.YYYY';
          result = formatDate(result, format);
        }
        break;
        
      case 'uppercase':
        result = String(result).toUpperCase();
        break;
        
      case 'lowercase':
        result = String(result).toLowerCase();
        break;
        
      case 'capitalize':
        result = capitalize(String(result));
        break;
        
      case 'default':
        if (!result) {
          result = args[0]?.replace(/['"]/g, '') || '';
        }
        break;
    }
  }
  
  return String(result);
}

function formatDate(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('MMMM', monthNames[date.getMonth()])
    .replace('YYYY', year.toString())
    .replace('YY', year.toString().slice(-2));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Export additional utilities
export const boilerplateUtils = {
  // Extract all variables from a template
  extractVariables(template: string): string[] {
    const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = VARIABLE_REGEX.exec(template)) !== null) {
      const variable = match[1].split('|')[0].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  },
  
  // Validate if all required variables are present in context
  validateContext(template: string, context: any): {
    valid: boolean;
    missingVariables: string[];
  } {
    const variables = this.extractVariables(template);
    const missingVariables: string[] = [];
    
    for (const variable of variables) {
      const value = getNestedValue(context, variable);
      if (value === undefined || value === null) {
        missingVariables.push(variable);
      }
    }
    
    return {
      valid: missingVariables.length === 0,
      missingVariables
    };
  }
};