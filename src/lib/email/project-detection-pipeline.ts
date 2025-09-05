// src/lib/email/project-detection-pipeline.ts - PLAN 7/9 MULTI-STRATEGIE PROJEKT-ERKENNUNG
import { geminiService, ProjectForAnalysis } from '@/lib/ai/gemini-service';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

// ============================================
// INTERFACES FÜR PROJEKT-DETECTION
// ============================================

export interface IncomingEmailData {
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  subject: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  organizationId: string;
  headers?: Record<string, string>;
  textContent?: string;
  campaignId?: string;
}

export interface ProjectMatch {
  projectId: string;
  projectTitle?: string;
  confidence: number;
  detectionMethod: string;
  evidence: string;
  contextType?: string;
  contextId?: string;
  strategy?: string;
}

export interface ProjectDetectionResult {
  bestMatch: ProjectMatch | null;
  allMatches: ProjectMatch[];
  confidence: number;
  reasoning: string;
}

// ============================================
// DETECTION STRATEGIEN
// ============================================

/**
 * Basis-Klasse für alle Detection-Strategien
 */
abstract class ProjectDetectionStrategy {
  abstract readonly name: string;
  abstract readonly priority: number; // Niedrigere Zahl = höhere Priorität
  
  abstract detect(emailData: IncomingEmailData): Promise<ProjectMatch | null>;
}

/**
 * Strategie 1: Explizite Marker (Reply-To Pattern, Header)
 */
export class ExplicitMarkerStrategy extends ProjectDetectionStrategy {
  readonly name = 'explicit-marker';
  readonly priority = 1;
  
  async detect(emailData: IncomingEmailData): Promise<ProjectMatch | null> {
    // 1. Reply-To-Pattern prüfen
    const replyToMatch = this.parseReplyToForProject(emailData.from.email);
    if (replyToMatch) return replyToMatch;
    
    // 2. Custom Headers prüfen
    const headerMatch = this.parseHeadersForProject(emailData.headers);
    if (headerMatch) return headerMatch;
    
    return null;
  }
  
  private parseReplyToForProject(email: string): ProjectMatch | null {
    // Pattern: pr-PROJECT_ID-CONTEXT_TYPE-CONTEXT_ID@domain.com
    const match = email.match(/^pr-([^-]+)-([^-]+)-([^@]+)@/);
    if (match) {
      const [, projectId, contextType, contextId] = match;
      return {
        projectId,
        confidence: 1.0,
        detectionMethod: 'reply-to',
        evidence: `Reply-To pattern: ${email}`,
        contextType,
        contextId,
        strategy: this.name
      };
    }
    return null;
  }
  
  private parseHeadersForProject(headers?: Record<string, string>): ProjectMatch | null {
    if (!headers) return null;
    
    const projectId = headers['X-CeleroPress-Project-ID'];
    const contextType = headers['X-CeleroPress-Context-Type'];
    const contextId = headers['X-CeleroPress-Context-ID'];
    
    if (projectId && contextType && contextId) {
      return {
        projectId,
        confidence: 1.0,
        detectionMethod: 'header',
        evidence: 'Custom headers present',
        contextType,
        contextId,
        strategy: this.name
      };
    }
    
    return null;
  }
}

/**
 * Strategie 2: Campaign-Linking
 */
export class CampaignLinkingStrategy extends ProjectDetectionStrategy {
  readonly name = 'campaign-linking';
  readonly priority = 2;
  
  async detect(emailData: IncomingEmailData): Promise<ProjectMatch | null> {
    if (!emailData.campaignId) return null;
    
    try {
      // Suche nach Kampagne um Projekt-ID zu finden
      const campaignQuery = query(
        collection(db, 'pr_campaigns'),
        where('id', '==', emailData.campaignId),
        limit(1)
      );
      
      const snapshot = await getDocs(campaignQuery);
      if (!snapshot.empty) {
        const campaign = snapshot.docs[0].data();
        if (campaign.projectId) {
          return {
            projectId: campaign.projectId,
            projectTitle: campaign.title,
            confidence: 0.9,
            detectionMethod: 'campaign-link',
            evidence: `Campaign ${emailData.campaignId} linked to project`,
            contextType: 'campaign',
            contextId: emailData.campaignId,
            strategy: this.name
          };
        }
      }
    } catch (error) {
      console.error('Campaign lookup failed:', error);
    }
    
    return null;
  }
}

/**
 * Strategie 3: Customer Matching
 */
export class CustomerMatchingStrategy extends ProjectDetectionStrategy {
  readonly name = 'customer-matching';
  readonly priority = 3;
  
  async detect(emailData: IncomingEmailData): Promise<ProjectMatch | null> {
    try {
      // Suche nach aktiven Projekten mit dieser Kunden-E-Mail
      const projectQuery = query(
        collection(db, 'projects'),
        where('customer.email', '==', emailData.from.email),
        where('organizationId', '==', emailData.organizationId),
        where('status', '==', 'active'),
        limit(5)
      );
      
      const snapshot = await getDocs(projectQuery);
      if (!snapshot.empty) {
        // Nimm das neueste Projekt
        const projects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const newestProject = projects.sort((a: any, b: any) => 
          (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
        )[0] as any;
        
        return {
          projectId: newestProject.id,
          projectTitle: newestProject.title,
          confidence: 0.7,
          detectionMethod: 'customer',
          evidence: `Customer email ${emailData.from.email} matches active project`,
          contextType: 'general',
          contextId: 'customer-email',
          strategy: this.name
        };
      }
    } catch (error) {
      console.error('Customer project lookup failed:', error);
    }
    
    return null;
  }
}

/**
 * Strategie 4: Content Analysis (KI-basiert)
 */
export class ContentAnalysisStrategy extends ProjectDetectionStrategy {
  readonly name = 'content-analysis';
  readonly priority = 4;
  
  async detect(emailData: IncomingEmailData): Promise<ProjectMatch | null> {
    if (!emailData.textContent) return null;
    
    try {
      // Hole aktive Projekte für die Organisation
      const activeProjects = await this.getActiveProjectsForOrganization(emailData.organizationId);
      
      if (activeProjects.length === 0) {
        return null; // Keine Projekte vorhanden
      }
      
      // KI-Analyse durchführen
      const analysis = await geminiService.analyzeEmailForProject({
        subject: emailData.subject,
        content: emailData.textContent,
        fromEmail: emailData.from.email,
        organizationId: emailData.organizationId,
        activeProjects: activeProjects.map(p => ({
          id: p.id,
          title: p.title,
          clientName: p.customer?.name,
          stage: p.currentStage
        }))
      });
      
      // Nur verwenden wenn Konfidenz hoch genug ist
      if (analysis.projectId && analysis.confidence > 0.6) {
        return {
          projectId: analysis.projectId,
          projectTitle: analysis.projectTitle || undefined,
          confidence: analysis.confidence,
          detectionMethod: 'ai',
          evidence: `KI-Analyse: ${analysis.reasoning}`,
          contextType: analysis.contextType,
          contextId: 'ai-analysis',
          strategy: this.name
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('AI-based project detection failed:', error);
      return null;
    }
  }
  
  private async getActiveProjectsForOrganization(organizationId: string): Promise<any[]> {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        limit(20) // Begrenzt auf 20 Projekte für Performance
      );
      
      const snapshot = await getDocs(projectsQuery);
      const projects: any[] = [];
      
      snapshot.forEach(doc => {
        projects.push({ ...doc.data(), id: doc.id });
      });
      
      return projects;
      
    } catch (error) {
      console.error('Failed to get active projects:', error);
      return [];
    }
  }
}

/**
 * Strategie 5: Domain-based (Fallback)
 */
export class DomainBasedStrategy extends ProjectDetectionStrategy {
  readonly name = 'domain-based';
  readonly priority = 5;
  
  async detect(emailData: IncomingEmailData): Promise<ProjectMatch | null> {
    try {
      const domain = emailData.from.email.split('@')[1];
      
      // Suche nach Projekten mit diesem Domain
      const projectQuery = query(
        collection(db, 'projects'),
        where('organizationId', '==', emailData.organizationId),
        where('status', '==', 'active'),
        limit(10)
      );
      
      const snapshot = await getDocs(projectQuery);
      
      for (const doc of snapshot.docs) {
        const project = doc.data();
        
        // Prüfe ob Domain im Projekt-Kontext erwähnt wird
        if (project.customer?.email && project.customer.email.includes(domain)) {
          return {
            projectId: doc.id,
            projectTitle: project.title,
            confidence: 0.4, // Niedrige Konfidenz
            detectionMethod: 'domain',
            evidence: `Domain ${domain} found in project customer data`,
            contextType: 'general',
            contextId: 'domain-match',
            strategy: this.name
          };
        }
      }
      
    } catch (error) {
      console.error('Domain-based project lookup failed:', error);
    }
    
    return null;
  }
}

// ============================================
// PROJEKT-DETECTION-PIPELINE
// ============================================

export class ProjectDetectionPipeline {
  private strategies: ProjectDetectionStrategy[];
  
  constructor() {
    this.strategies = [
      new ExplicitMarkerStrategy(),    // Höchste Priorität
      new CampaignLinkingStrategy(),   // Sehr hoch
      new CustomerMatchingStrategy(),  // Hoch
      new ContentAnalysisStrategy(),   // Mittel (KI-basiert)
      new DomainBasedStrategy()        // Niedrig (Fallback)
    ].sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Führt Multi-Strategie-Projekt-Erkennung durch
   */
  async detectProjectForEmail(emailData: IncomingEmailData): Promise<ProjectDetectionResult> {
    let bestMatch: ProjectMatch | null = null;
    const allMatches: ProjectMatch[] = [];
    
    // Alle Strategien parallel ausführen (Performance)
    const results = await Promise.allSettled(
      this.strategies.map(strategy => strategy.detect(emailData))
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const match = result.value;
        match.strategy = this.strategies[index].name;
        allMatches.push(match);
        
        // Beste Match basierend auf Konfidenz und Priorität
        if (!bestMatch || this.isBetterMatch(match, bestMatch)) {
          bestMatch = match;
        }
      }
    });
    
    // Konsistenz-Check: Stimmen mehrere Strategien überein?
    const consistentMatches = this.findConsistentMatches(allMatches);
    if (consistentMatches.length > 1) {
      bestMatch = this.selectBestConsistentMatch(consistentMatches);
    }
    
    return {
      bestMatch,
      allMatches,
      confidence: bestMatch?.confidence || 0,
      reasoning: this.generateReasoning(allMatches, bestMatch)
    };
  }
  
  /**
   * Prüft ob Match A besser ist als Match B
   */
  private isBetterMatch(matchA: ProjectMatch, matchB: ProjectMatch): boolean {
    // Zuerst Konfidenz vergleichen
    if (matchA.confidence !== matchB.confidence) {
      return matchA.confidence > matchB.confidence;
    }
    
    // Bei gleicher Konfidenz: Strategie-Priorität verwenden
    const strategyA = this.strategies.find(s => s.name === matchA.strategy);
    const strategyB = this.strategies.find(s => s.name === matchB.strategy);
    
    if (strategyA && strategyB) {
      return strategyA.priority < strategyB.priority;
    }
    
    return false;
  }
  
  /**
   * Findet übereinstimmende Matches zwischen Strategien
   */
  private findConsistentMatches(matches: ProjectMatch[]): ProjectMatch[] {
    const projectGroups = new Map<string, ProjectMatch[]>();
    
    // Gruppiere nach Projekt-ID
    matches.forEach(match => {
      if (!projectGroups.has(match.projectId)) {
        projectGroups.set(match.projectId, []);
      }
      projectGroups.get(match.projectId)!.push(match);
    });
    
    // Finde Projekte die von mehreren Strategien erkannt wurden
    const consistentMatches: ProjectMatch[] = [];
    projectGroups.forEach((groupMatches) => {
      if (groupMatches.length > 1) {
        // Nimm den besten Match aus der Gruppe
        const bestInGroup = groupMatches.reduce((best, current) =>
          this.isBetterMatch(current, best) ? current : best
        );
        consistentMatches.push(bestInGroup);
      }
    });
    
    return consistentMatches;
  }
  
  /**
   * Wählt besten konsistenten Match aus
   */
  private selectBestConsistentMatch(consistentMatches: ProjectMatch[]): ProjectMatch {
    return consistentMatches.reduce((best, current) =>
      this.isBetterMatch(current, best) ? current : best
    );
  }
  
  /**
   * Generiert Begründungs-Text für die Erkennung
   */
  private generateReasoning(allMatches: ProjectMatch[], bestMatch: ProjectMatch | null): string {
    if (!bestMatch) {
      return `Kein Projekt erkannt. ${allMatches.length} Strategien verwendet, keine ausreichende Konfidenz.`;
    }
    
    const alternativeCount = allMatches.filter(m => m.projectId !== bestMatch.projectId).length;
    const consistentCount = allMatches.filter(m => m.projectId === bestMatch.projectId).length;
    
    let reasoning = `Projekt "${bestMatch.projectTitle || bestMatch.projectId}" erkannt `;
    reasoning += `über ${bestMatch.strategy} (Konfidenz: ${(bestMatch.confidence * 100).toFixed(1)}%).`;
    
    if (consistentCount > 1) {
      reasoning += ` Bestätigt durch ${consistentCount} Strategien.`;
    }
    
    if (alternativeCount > 0) {
      reasoning += ` ${alternativeCount} alternative Matches gefunden.`;
    }
    
    return reasoning;
  }
}

// Singleton Export
export const projectDetectionPipeline = new ProjectDetectionPipeline();