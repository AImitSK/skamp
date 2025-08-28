// src/types/approvals-enhanced.ts - Erweiterte Freigabe-System Typen
import { Timestamp } from 'firebase/firestore';
import { ApprovalData } from './pr';

// Erweiterte Approval-Daten für mehrstufigen Workflow
export interface EnhancedApprovalData extends ApprovalData {
  // Team-Freigabe
  teamApprovalRequired: boolean;
  teamApprovers: Array<{
    userId: string;
    displayName: string;
    email: string;
    photoUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Timestamp;
    message?: string;
  }>;
  teamApprovalMessage?: string;
  
  // Kunden-Freigabe
  customerApprovalRequired: boolean;
  customerContact?: {
    contactId: string;
    name: string;
    email: string;
    companyName: string;
  };
  customerApprovalMessage?: string;
  
  // Workflow-Status
  currentStage: 'team' | 'customer' | 'completed';
  workflowStartedAt: Timestamp;
  workflowId?: string; // Referenz zur Workflow-Instanz
}

// Team-Approver Typ
export interface TeamApprover {
  userId: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  message?: string;
  notifiedAt?: Timestamp;
}

// Kunden-Kontakt für Freigabe
export interface CustomerContact {
  contactId: string;
  name: string;
  email: string;
  companyName: string;
  role?: string;
}

// Workflow-Stufe
export interface ApprovalWorkflowStage {
  stage: 'team' | 'customer';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requiredApprovals: number;
  receivedApprovals: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

// Vollständige Workflow-Instanz
export interface ApprovalWorkflow {
  id?: string;
  campaignId: string;
  organizationId: string;
  stages: ApprovalWorkflowStage[];
  currentStage: 'team' | 'customer' | 'completed';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  
  // Team-Stufe Details
  teamSettings: {
    required: boolean;
    approvers: TeamApprover[];
    message?: string;
    allApproved: boolean;
    completedAt?: Timestamp;
  };
  
  // Kunden-Stufe Details
  customerSettings: {
    required: boolean;
    contact?: CustomerContact;
    message?: string;
    shareId: string;
    status: 'pending' | 'approved' | 'rejected';
    completedAt?: Timestamp;
  };
}

// Team-Approval Instanz (Subcollection von workflows)
export interface TeamApproval {
  id?: string;
  userId: string;
  workflowId: string;
  campaignId: string;
  organizationId: string;
  shareId: string; // 🆕 ShareID für Team-Approval Link
  status: 'pending' | 'approved' | 'rejected';
  decision?: {
    choice: 'approved' | 'rejected';
    comment?: string;
    submittedAt: Timestamp;
  };
  notifiedAt: Timestamp;
  createdAt: Timestamp;
}

// Team-Approval Status Übersicht
export interface TeamApprovalStatus {
  totalApprovers: number;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  allApproved: boolean;
  anyRejected: boolean;
  approvers: TeamApprover[];
}

// Workflow-Transition Events
export type WorkflowEvent = 
  | { type: 'WORKFLOW_STARTED'; workflowId: string; campaignId: string }
  | { type: 'TEAM_APPROVAL_REQUIRED'; workflowId: string; approvers: TeamApprover[] }
  | { type: 'TEAM_MEMBER_DECIDED'; workflowId: string; userId: string; decision: 'approved' | 'rejected' }
  | { type: 'TEAM_STAGE_COMPLETED'; workflowId: string; approved: boolean }
  | { type: 'CUSTOMER_APPROVAL_REQUIRED'; workflowId: string; contact: CustomerContact }
  | { type: 'CUSTOMER_DECIDED'; workflowId: string; decision: 'approved' | 'rejected' }
  | { type: 'WORKFLOW_COMPLETED'; workflowId: string; finalStatus: 'approved' | 'rejected' };

// Helper Types für UI-Komponenten
export interface ApprovalSettingsProps {
  value: EnhancedApprovalData;
  onChange: (data: EnhancedApprovalData) => void;
  organizationId: string;
  clientId?: string;
  clientName?: string;
}

export interface TeamMemberSelectorProps {
  selectedMembers: string[];
  onSelectionChange: (memberIds: string[]) => void;
  organizationId: string;
}

export interface CustomerContactSelectorProps {
  selectedContact?: string | CustomerContact;
  onContactChange: (contact?: string | CustomerContact) => void;
  clientId: string;
}

// Default-Werte für neue Enhanced Approval Data
export function createDefaultEnhancedApprovalData(): EnhancedApprovalData {
  return {
    // Legacy ApprovalData Felder
    shareId: '',
    status: 'pending',
    feedbackHistory: [],
    
    // Enhanced Felder
    teamApprovalRequired: false,
    teamApprovers: [],
    customerApprovalRequired: false,
    currentStage: 'team',
    workflowStartedAt: Timestamp.now()
  };
}

// Type Guards
export function isEnhancedApprovalData(data: ApprovalData): data is EnhancedApprovalData {
  return 'teamApprovalRequired' in data && 'customerApprovalRequired' in data;
}

export function hasTeamApproval(data: EnhancedApprovalData): boolean {
  return data.teamApprovalRequired && data.teamApprovers.length > 0;
}

export function hasCustomerApproval(data: EnhancedApprovalData): boolean {
  return data.customerApprovalRequired && !!data.customerContact;
}