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

  // Add title and date if available
  if (context.campaign?.title) {
    parts.push(`<h1 class="text-2xl font-bold text-gray-900 mb-2">${context.campaign.title}</h1>`);
    
    // Format current date in German format
    const today = new Date();
    const formattedDate = today.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    parts.push(`<p class="text-sm text-gray-600 mb-6">${formattedDate}</p>`);
  }

  // Add header sections
  for (const section of headerSections) {
    if (section.boilerplate) {
      const processed = processVariables(section.boilerplate.content, context);
      parts.push(`<div class="boilerplate-header">${processed}</div>`);
    }
  }

  // Add separator after headers if any exist
  if (headerSections.length > 0 && customSections.length > 0) {
    parts.push('<hr class="mt-12 mb-3 border-gray-300" />');
  }

  // Add custom sections (including AI-generated content and structured elements)
  for (const section of customSections) {
    if (section.boilerplate) {
      // Traditional boilerplate
      const processed = processVariables(section.boilerplate.content, context);
      parts.push(`<div class="boilerplate-custom mt-4">${processed}</div>`);
    } else if (section.content) {
      // Structured content (lead, main, quote)
      let content = `<div class="structured-content mt-4">`;
      
      // Handle different types of structured content
      if (section.type === 'lead') {
        content += `<div class="lead-paragraph font-semibold">${section.content}</div>`;
      } else if (section.type === 'main') {
        content += `<div class="main-content">${section.content}</div>`;
      } else if (section.type === 'quote') {
        content += `<div class="quote-block">`;
        content += `<blockquote class="italic text-gray-700 border-l-4 border-blue-400 pl-4">`;
        content += `"${section.content}"`;
        content += `</blockquote>`;
        
        // Add attribution if available
        if (section.metadata) {
          const { person, role, company } = section.metadata;
          content += `<p class="mt-2 text-sm text-gray-600">`;
          content += `— ${person}`;
          if (role) content += `, ${role}`;
          if (company) content += ` bei ${company}`;
          content += `</p>`;
        }
        
        content += `</div>`;
      } else {
        // Fallback for other content
        content += section.content;
      }
      
      content += `</div>`;
      parts.push(content);
    }
  }

  // Add separator before footers if any exist
  if (footerSections.length > 0 && parts.length > 0) {
    parts.push('<hr class="mt-12 mb-3 border-gray-300" />');
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