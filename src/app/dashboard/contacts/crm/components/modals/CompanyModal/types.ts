// src/app/dashboard/contacts/crm/components/modals/CompanyModal/types.ts

import { CompanyEnhanced } from "@/types/crm-enhanced";
import { Tag, TagColor } from "@/types/crm";

/**
 * Shared Types für CompanyModal und seine Sections
 */

export interface CompanyModalSectionProps {
  formData: Partial<CompanyEnhanced>;
  setFormData: (data: Partial<CompanyEnhanced>) => void;
  tags?: Tag[];
  companies?: CompanyEnhanced[];
  onCreateTag?: (name: string, color: TagColor) => Promise<string>;
}

export interface CompanyModalProps {
  company: CompanyEnhanced | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
  organizationId: string;
}
