// src/app/dashboard/contacts/crm/components/modals/ContactModal/types.ts

import { ContactEnhanced, CompanyEnhanced } from "@/types/crm-enhanced";
import { Tag, TagColor } from "@/types/crm";
import { Publication } from "@/types/library";

/**
 * Shared Types für ContactModal und seine Sections
 */

export interface ContactModalSectionProps {
  formData: Partial<ContactEnhanced>;
  setFormData: (data: Partial<ContactEnhanced>) => void;
  tags?: Tag[];
  companies?: CompanyEnhanced[];
  publications?: Publication[];
  onCreateTag?: (name: string, color: TagColor) => Promise<string>;
  onCompanyChange?: (companyId: string) => void;
}

export interface ContactModalProps {
  contact: ContactEnhanced | null;
  companies: CompanyEnhanced[];
  onClose: () => void;
  onSave: () => void;
  userId: string;
  organizationId: string;
}
