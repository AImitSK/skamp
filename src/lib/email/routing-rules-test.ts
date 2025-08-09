// src/lib/email/routing-rules-test.ts
import { EmailMessage, EmailAddress } from '@/types/email-enhanced';
import { flexibleEmailProcessor } from '@/lib/email/email-processor-flexible';
import { Timestamp } from 'firebase/firestore';

/**
 * Test-Service für Routing Rules
 * Hilfsfunktionen um zu prüfen ob Routing Rules korrekt funktionieren
 */
export class RoutingRulesTestService {
  
  /**
   * Erstelle eine Test-E-Mail-Adresse mit Routing Rules
   */
  createTestEmailAddress(): EmailAddress {
    return {
      id: 'test-address-123',
      organizationId: 'test-org',
      email: 'test@example.com',
      localPart: 'test',
      domainId: 'example.com',
      displayName: 'Test Address',
      isActive: true,
      inboxEnabled: true,
      routingRules: [
        // Test Rule 1: Support-E-Mails an Team-Mitglied
        {
          id: 'rule-support',
          name: 'Support Requests',
          conditions: {
            subject: 'Support',
            keywords: ['hilfe', 'problem', 'fehler']
          },
          actions: {
            assignTo: ['user-support-123'],
            addTags: ['support', 'urgent'],
            setPriority: 'high'
          },
          enabled: true,
          priority: 1
        },
        // Test Rule 2: Newsletter Anfragen
        {
          id: 'rule-newsletter',
          name: 'Newsletter Signup',
          conditions: {
            subject: 'Newsletter',
            from: 'marketing'
          },
          actions: {
            assignTo: ['user-marketing-456'],
            addTags: ['newsletter', 'marketing'],
            setPriority: 'normal'
          },
          enabled: true,
          priority: 2
        },
        // Test Rule 3: Presse-Anfragen
        {
          id: 'rule-press',
          name: 'Press Inquiries',
          conditions: {
            keywords: ['presse', 'interview', 'journalist', 'medien']
          },
          actions: {
            assignTo: ['user-pr-789'],
            addTags: ['press', 'media'],
            setPriority: 'high',
            autoReply: 'press-response-template'
          },
          enabled: true,
          priority: 1
        }
      ]
    } as EmailAddress;
  }

  /**
   * Erstelle Test-E-Mail-Nachrichten
   */
  createTestMessages(): EmailMessage[] {
    const baseMessage = {
      id: '',
      organizationId: 'test-org',
      messageId: '',
      threadId: 'test-thread',
      emailAccountId: 'test-address-123',
      folder: 'inbox' as const,
      isRead: false,
      isStarred: false,
      importance: 'normal' as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      receivedAt: Timestamp.now()
    };

    return [
      // Test Message 1: Support Request (sollte Rule 1 matchen)
      {
        ...baseMessage,
        id: 'msg-support-test',
        messageId: 'support-test@example.com',
        subject: 'Support - Problem mit Login',
        textContent: 'Ich habe ein Problem mit meinem Login. Können Sie mir helfen?',
        snippet: 'Ich habe ein Problem mit meinem Login. Können Sie mir helfen?',
        isArchived: false,
        isDraft: false,
        userId: 'test-user-123',
        from: {
          email: 'kunde@example.com',
          name: 'Max Mustermann'
        },
        to: [{
          email: 'test@example.com',
          name: 'Test Address'
        }]
      },
      // Test Message 2: Newsletter Request (sollte Rule 2 matchen)
      {
        ...baseMessage,
        id: 'msg-newsletter-test',
        messageId: 'newsletter-test@example.com',
        subject: 'Newsletter Anmeldung',
        textContent: 'Ich möchte mich für Ihren Newsletter anmelden.',
        snippet: 'Ich möchte mich für Ihren Newsletter anmelden.',
        isArchived: false,
        isDraft: false,
        userId: 'test-user-123',
        from: {
          email: 'marketing@partner.com',
          name: 'Marketing Team'
        },
        to: [{
          email: 'test@example.com',
          name: 'Test Address'
        }]
      },
      // Test Message 3: Press Inquiry (sollte Rule 3 matchen)
      {
        ...baseMessage,
        id: 'msg-press-test',
        messageId: 'press-test@example.com',
        subject: 'Interview Anfrage für Artikel',
        textContent: 'Ich bin Journalist und würde gerne ein Interview für einen Artikel führen.',
        snippet: 'Ich bin Journalist und würde gerne ein Interview für einen Artikel führen.',
        isArchived: false,
        isDraft: false,
        userId: 'test-user-123',
        from: {
          email: 'journalist@zeitung.de',
          name: 'Anna Journalist'
        },
        to: [{
          email: 'test@example.com',
          name: 'Test Address'
        }]
      },
      // Test Message 4: Regular Email (sollte keine Rule matchen)
      {
        ...baseMessage,
        id: 'msg-regular-test',
        messageId: 'regular-test@example.com',
        subject: 'Allgemeine Anfrage',
        textContent: 'Dies ist eine allgemeine Anfrage ohne spezielle Keywords.',
        snippet: 'Dies ist eine allgemeine Anfrage ohne spezielle Keywords.',
        isArchived: false,
        isDraft: false,
        userId: 'test-user-123',
        from: {
          email: 'info@firma.de',
          name: 'Firma Info'
        },
        to: [{
          email: 'test@example.com',
          name: 'Test Address'
        }]
      }
    ] as EmailMessage[];
  }

  /**
   * Teste Routing Rules mit Test-Daten
   */
  async testRoutingRules(): Promise<void> {
    
    const emailAddress = this.createTestEmailAddress();
    const testMessages = this.createTestMessages();
    
    
    // Teste jede Nachricht
    for (const message of testMessages) {
      
      try {
        // Simuliere applyRoutingRules()
        await this.simulateRoutingRules(message, emailAddress);
        
        
      } catch (error) {
      }
    }
    
  }

  /**
   * Simuliere die applyRoutingRules Logik für Tests
   */
  private async simulateRoutingRules(message: EmailMessage, emailAddress: EmailAddress): Promise<void> {
    if (!emailAddress.routingRules || emailAddress.routingRules.length === 0) {
      return;
    }


    // Sortiere Regeln nach Priorität
    const sortedRules = [...emailAddress.routingRules].sort((a, b) => 
      (a.priority || 999) - (b.priority || 999)
    );

    // Durchlaufe alle Regeln
    for (const rule of sortedRules) {
      if (rule.enabled === false) {
        continue;
      }

      
      if (this.matchesRuleConditions(message, rule.conditions)) {
        
        // Simuliere Actions
        const updates: any = {
          labels: [...(message.labels || [])]
        };

        // Team-Zuweisung
        if (rule.actions.assignTo && rule.actions.assignTo.length > 0) {
          const assignmentLabels = rule.actions.assignTo.map(userId => `assigned:${userId}`);
          updates.labels = [...updates.labels, ...assignmentLabels, 'assigned'];
        }

        // Tags hinzufügen
        if (rule.actions.addTags && rule.actions.addTags.length > 0) {
          rule.actions.addTags.forEach(tag => {
            if (!updates.labels.includes(tag)) {
              updates.labels.push(tag);
            }
          });
        }

        // Priorität setzen
        if (rule.actions.setPriority) {
          updates.importance = rule.actions.setPriority;
          updates.labels.push(`priority:${rule.actions.setPriority}`);
        }

        // Auto-Reply
        if (rule.actions.autoReply) {
          updates.labels.push(`auto-reply:${rule.actions.autoReply}`, 'auto-reply-pending');
        }

        // Rule-Name als Label
        const ruleLabel = `rule:${rule.name.toLowerCase().replace(/\s+/g, '-')}`;
        updates.labels.push(ruleLabel);

        // Wende Updates an
        Object.assign(message, updates);
        
        break; // Stoppe nach erster passender Regel
      } else {
      }
    }
  }

  /**
   * Prüfe Rule Conditions (vereinfachte Version für Tests)
   */
  private matchesRuleConditions(message: EmailMessage, conditions: any): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return false;
    }

    let conditionsChecked = 0;
    let conditionsMet = 0;

    // Subject Check
    if (conditions.subject !== undefined && conditions.subject !== '') {
      conditionsChecked++;
      if (message.subject.toLowerCase().includes(conditions.subject.toLowerCase())) {
        conditionsMet++;
      } else {
      }
    }

    // From Check
    if (conditions.from !== undefined && conditions.from !== '') {
      conditionsChecked++;
      const fromCheck = conditions.from.toLowerCase();
      const emailMatches = message.from.email.toLowerCase().includes(fromCheck);
      const nameMatches = message.from.name ? 
        message.from.name.toLowerCase().includes(fromCheck) : false;
      
      if (emailMatches || nameMatches) {
        conditionsMet++;
      } else {
      }
    }

    // Keywords Check
    if (conditions.keywords && conditions.keywords.length > 0) {
      conditionsChecked++;
      const content = `${message.subject} ${message.textContent}`.toLowerCase();
      const matchedKeywords: string[] = [];
      
      conditions.keywords.forEach((keyword: string) => {
        if (content.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      });
      
      if (matchedKeywords.length > 0) {
        conditionsMet++;
      } else {
      }
    }

    // Alle Bedingungen müssen erfüllt sein (AND-Verknüpfung)
    const allConditionsMet = conditionsChecked > 0 && conditionsMet === conditionsChecked;
    
    return allConditionsMet;
  }
}

// Export singleton instance
export const routingRulesTestService = new RoutingRulesTestService();

// Console-Funktion für einfache Tests
export const testRoutingRules = () => routingRulesTestService.testRoutingRules();