// src/app/dashboard/contacts/crm/CompanyModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { Checkbox } from "@/components/checkbox";
import { companiesService, tagsService } from "@/lib/firebase/crm-service";
import { companyServiceEnhanced } from "@/lib/firebase/company-service-enhanced";
import { publicationService, advertisementService, mediaKitService } from "@/lib/firebase/library-service";
import { Company, CompanyType, Tag, TagColor, SocialPlatform, socialPlatformLabels } from "@/types/crm";
import { CompanyEnhanced, COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS } from "@/types/crm-enhanced";
import { CountryCode, LanguageCode, CurrencyCode } from "@/types/international";
import { Publication, Advertisement, MediaKit } from "@/types/library";
import { TagInput } from "@/components/tag-input";
import { FocusAreasInput } from "@/components/FocusAreasInput";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CountrySelector } from "@/components/country-selector";
import { LanguageSelector } from "@/components/language-selector";
import { CurrencyInput } from "@/components/currency-input";
import { PhoneInput } from "@/components/phone-input";
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  GlobeAltIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  NewspaperIcon,
  BookOpenIcon,
  MegaphoneIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/20/solid";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Tab Definition
type TabId = 'general' | 'legal' | 'international' | 'financial' | 'corporate' | 'media';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  visible?: (formData: Partial<CompanyEnhanced>) => boolean;
}

const TABS: TabConfig[] = [
  { 
    id: 'general', 
    label: 'Allgemein', 
    icon: BuildingOfficeIcon,
    description: 'Basis-Informationen zur Firma' 
  },
  { 
    id: 'legal', 
    label: 'Rechtliches', 
    icon: ScaleIcon,
    description: 'Offizieller Name, Identifikatoren, Rechtsform' 
  },
  { 
    id: 'international', 
    label: 'International', 
    icon: GlobeAltIcon,
    description: 'Adressen, Telefonnummern, Sprachen' 
  },
  { 
    id: 'financial', 
    label: 'Finanzen', 
    icon: BanknotesIcon,
    description: 'Umsatz, Währung, Finanzkennzahlen' 
  },
  { 
    id: 'corporate', 
    label: 'Konzern', 
    icon: BuildingOffice2Icon,
    description: 'Muttergesellschaft, Tochterunternehmen' 
  },
  { 
    id: 'media', 
    label: 'Medien', 
    icon: NewspaperIcon,
    description: 'Publikationen und Medien-Informationen',
    visible: (formData) => ['publisher', 'media_house', 'agency'].includes(formData.type!)
  }
];

// Business Identifier Types
const IDENTIFIER_TYPES = [
  { value: 'VAT_EU', label: 'USt-IdNr. (EU)' },
  { value: 'EIN_US', label: 'EIN (US)' },
  { value: 'COMPANY_REG_DE', label: 'Handelsregister (DE)' },
  { value: 'COMPANY_REG_UK', label: 'Companies House (UK)' },
  { value: 'UID_CH', label: 'UID (CH)' },
  { value: 'SIREN_FR', label: 'SIREN (FR)' },
  { value: 'DUNS', label: 'D-U-N-S' },
  { value: 'LEI', label: 'LEI' },
  { value: 'OTHER', label: 'Sonstige' }
];

// Legal Forms
const LEGAL_FORMS = [
  { value: 'GmbH', label: 'GmbH' },
  { value: 'AG', label: 'AG' },
  { value: 'KG', label: 'KG' },
  { value: 'OHG', label: 'OHG' },
  { value: 'GbR', label: 'GbR' },
  { value: 'UG', label: 'UG (haftungsbeschränkt)' },
  { value: 'Ltd', label: 'Ltd.' },
  { value: 'Inc', label: 'Inc.' },
  { value: 'LLC', label: 'LLC' },
  { value: 'SA', label: 'SA' },
  { value: 'SAS', label: 'SAS' },
  { value: 'BV', label: 'BV' },
  { value: 'Other', label: 'Sonstige' }
];

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    error: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

export default function CompanyModal({ company, onClose, onSave, userId }: CompanyModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [formData, setFormData] = useState<Partial<CompanyEnhanced>>({
    // Basic fields
    name: '',
    type: 'customer',
    website: '',
    
    // Enhanced fields
    officialName: '',
    tradingName: '',
    legalForm: '',
    status: 'active',
    lifecycleStage: 'lead',
    
    // Address
    mainAddress: {
      street: '',
      city: '',
      postalCode: '',
      region: '',
      countryCode: 'DE' as CountryCode
    },
    
    // Arrays
    addresses: [],
    phones: [],
    emails: [],
    identifiers: [],
    socialMedia: [],
    tagIds: [],
    
    // Financial
    financial: {
      annualRevenue: undefined,
      employees: undefined,
      fiscalYearEnd: undefined
    },
    
    // Industry
    industryClassification: {
      primary: ''
    },
    
    // Other
    internalNotes: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]); // For parent company selection
  const formRef = useRef<HTMLFormElement>(null);

  // Library data for media companies
  const [linkedPublications, setLinkedPublications] = useState<Publication[]>([]);
  const [linkedAdvertisements, setLinkedAdvertisements] = useState<Advertisement[]>([]);
  const [linkedMediaKits, setLinkedMediaKits] = useState<MediaKit[]>([]);
  const [loadingLibraryData, setLoadingLibraryData] = useState(false);

  useEffect(() => {
    if (company) {
      // Map old company format to enhanced format
      setFormData({
        ...company,
        officialName: company.name,
        mainAddress: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          postalCode: company.address?.zip || '',
          region: company.address?.state || '',
          countryCode: 'DE' as CountryCode
        },
        phones: company.phone ? [{ 
          type: 'business' as const, 
          number: company.phone, 
          isPrimary: true 
        }] : [],
        emails: company.email ? [{
          type: 'general' as const,
          email: company.email,
          isPrimary: true
        }] : [],
        financial: {
          annualRevenue: company.revenue ? { amount: company.revenue, currency: 'EUR' as CurrencyCode } : undefined,
          employees: company.employees || undefined,
          fiscalYearEnd: undefined
        },
        tagIds: company.tagIds || [],
        socialMedia: company.socialMedia || [],
        internalNotes: company.notes || '',
        industryClassification: {
          primary: company.industry || ''
        }
      });

      // Load linked library data for media companies
      if (company.id && ['publisher', 'media_house', 'agency'].includes(company.type)) {
        loadLibraryData(company.id);
      }
    }
    loadTags();
    loadCompanies();
  }, [company]);

  const loadTags = async () => {
    if (!userId) return;
    try {
      const userTags = await tagsService.getAll(userId);
      setTags(userTags);
    } catch (error) {
      // Silent error handling
    }
  };

  const loadCompanies = async () => {
    if (!userId) return;
    try {
      const userCompanies = await companiesService.getAll(userId);
      setCompanies(userCompanies.filter(c => c.id !== company?.id));
    } catch (error) {
      // Silent error handling
    }
  };

  const loadLibraryData = async (companyId: string) => {
    if (!userId) return;
    
    setLoadingLibraryData(true);
    try {
      // Load publications
      const publications = await publicationService.getByPublisherId(companyId, userId);
      setLinkedPublications(publications);

      // Load advertisements (filter by publications of this company)
      if (publications.length > 0) {
        const publicationIds = publications.map(p => p.id!).filter(Boolean);
        const allAds = await advertisementService.getAll(userId);
        const companyAds = allAds.filter(ad => 
          ad.publicationIds.some(pubId => publicationIds.includes(pubId))
        );
        setLinkedAdvertisements(companyAds);
      } else {
        setLinkedAdvertisements([]);
      }

      // Load media kits
      const mediaKits = await mediaKitService.getByCompanyId(companyId, userId);
      setLinkedMediaKits(mediaKits);
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoadingLibraryData(false);
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    try {
      const tagId = await tagsService.create({ name, color, userId });
      await loadTags();
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  // Tab visibility check
  const isTabVisible = (tab: TabConfig): boolean => {
    if (!tab.visible) return true;
    return tab.visible(formData);
  };

  const visibleTabs = TABS.filter(isTabVisible);

  // Handler functions
  const handleSocialMediaChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updatedSocialMedia = [...(formData.socialMedia || [])];
    updatedSocialMedia[index] = { ...updatedSocialMedia[index], [field]: value };
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  const addSocialMediaField = () => {
    const newField = { platform: 'linkedin' as SocialPlatform, url: '' };
    setFormData({ ...formData, socialMedia: [...(formData.socialMedia || []), newField] });
  };

  const removeSocialMediaField = (index: number) => {
    const updatedSocialMedia = (formData.socialMedia || []).filter((_, i) => i !== index);
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  // Phone handlers
  const addPhoneField = () => {
    const newPhone = { type: 'business' as const, number: '', isPrimary: false };
    setFormData({ ...formData, phones: [...(formData.phones || []), newPhone] });
  };

  const removePhoneField = (index: number) => {
    const updatedPhones = (formData.phones || []).filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updatedPhones });
  };

  // Email handlers
  const addEmailField = () => {
    const newEmail = { type: 'general' as const, email: '', isPrimary: false };
    setFormData({ ...formData, emails: [...(formData.emails || []), newEmail] });
  };

  const removeEmailField = (index: number) => {
    const updatedEmails = (formData.emails || []).filter((_, i) => i !== index);
    setFormData({ ...formData, emails: updatedEmails });
  };

  // Identifier handlers
  const addIdentifier = () => {
    const newIdentifier = { 
      type: 'VAT_EU' as const, 
      value: '', 
      issuingAuthority: 'DE',
      validFrom: undefined,
      validUntil: undefined
    };
    setFormData({ ...formData, identifiers: [...(formData.identifiers || []), newIdentifier] });
  };

  const removeIdentifier = (index: number) => {
    const updatedIdentifiers = (formData.identifiers || []).filter((_, i) => i !== index);
    setFormData({ ...formData, identifiers: updatedIdentifiers });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: string[] = [];
    if (!formData.name?.trim()) {
      errors.push('Firmenname ist erforderlich');
    }
    if (formData.emails?.some(e => e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email))) {
      errors.push('Ungültige E-Mail-Adresse');
    }
    if (formData.website && !/^https?:\/\/.+\..+/.test(formData.website)) {
      errors.push('Website muss mit http:// oder https:// beginnen');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      // Use the enhanced service for backward compatibility
      const dataToSave: Partial<Company> = {
        name: formData.name!,
        type: formData.type as CompanyType,
        industry: formData.industryClassification?.primary,
        website: formData.website,
        phone: formData.phones?.find(p => p.isPrimary)?.number || '',
        email: formData.emails?.find(e => e.isPrimary)?.email || '',
        address: {
          street: formData.mainAddress?.street,
          street2: '',
          city: formData.mainAddress?.city,
          zip: formData.mainAddress?.postalCode,
          state: formData.mainAddress?.region,
          country: formData.mainAddress?.countryCode
        },
        employees: formData.financial?.employees || undefined,
        revenue: formData.financial?.annualRevenue?.amount || undefined,
        notes: formData.internalNotes,
        tagIds: formData.tagIds || [],
        socialMedia: formData.socialMedia || []
      };
      
      if (company?.id) {
        // Update using legacy format for now
        await companiesService.update(company.id, dataToSave);
      } else {
        // Create using legacy format for now
        await companiesService.create({ ...dataToSave as Omit<Company, 'id'>, userId });
      }
      onSave();
      onClose();
    } catch (error) {
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  };
  
  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <form ref={formRef} onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          {company ? 'Firma bearbeiten' : 'Neue Firma hinzufügen'}
        </DialogTitle>
        
        <DialogBody className="p-0">
          {validationErrors.length > 0 && (
            <div className="px-6 pt-4">
              <Alert type="error" message={validationErrors[0]} />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap',
                      activeTab === tab.id
                        ? 'border-[#005fab] text-[#005fab]'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'mr-2 h-5 w-5',
                        activeTab === tab.id ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            {/* General Tab */}
            {activeTab === 'general' && (
              <FieldGroup>
                <Field>
                  <Label>Anzeigename *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    required 
                    autoFocus
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Der Name, wie er in Listen und Übersichten angezeigt wird
                  </Text>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>Typ</Label>
                    <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as CompanyType })}>
                      <option value="customer">Kunde</option>
                      <option value="supplier">Lieferant</option>
                      <option value="partner">Partner</option>
                      <option value="publisher">Verlag</option>
                      <option value="media_house">Medienhaus</option>
                      <option value="agency">Agentur</option>
                      <option value="other">Sonstiges</option>
                    </Select>
                  </Field>
                  <Field>
                    <Label>
                      Branche
                      {isMediaCompany && (
                        <InfoTooltip content="Bei Medienunternehmen wird die Branche durch den Typ definiert" className="ml-1.5 inline-flex align-text-top" />
                      )}
                    </Label>
                    <Input 
                      value={formData.industryClassification?.primary || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        industryClassification: { 
                          ...formData.industryClassification,
                          primary: e.target.value 
                        }
                      })} 
                      placeholder={isMediaCompany ? "—" : "z.B. IT, Handel, Industrie"}
                      disabled={isMediaCompany}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      {COMPANY_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    <Label>Lifecycle Stage</Label>
                    <Select 
                      value={formData.lifecycleStage} 
                      onChange={(e) => setFormData({ ...formData, lifecycleStage: e.target.value as any })}
                    >
                      {LIFECYCLE_STAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field>
                  <Label>Website</Label>
                  <Input 
                    type="url" 
                    value={formData.website || ''} 
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                    placeholder="https://..."
                  />
                </Field>

                {/* Tags */}
                <Field>
                  <Label>Tags</Label>
                  <TagInput 
                    selectedTagIds={formData.tagIds || []} 
                    availableTags={tags} 
                    onChange={(tagIds) => setFormData({ ...formData, tagIds })} 
                    onCreateTag={handleCreateTag} 
                  />
                </Field>

                {/* Notes */}
                <Field>
                  <Label>Interne Notizen</Label>
                  <Textarea 
                    value={formData.internalNotes || ''} 
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })} 
                    rows={3}
                    placeholder="Notizen, die nicht für Kunden sichtbar sind..." 
                  />
                </Field>

                <Field>
                  <Label>Öffentliche Beschreibung</Label>
                  <Textarea 
                    value={formData.description || ''} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    rows={3}
                    placeholder="Beschreibung, die in Media Kits verwendet werden kann..." 
                  />
                </Field>
              </FieldGroup>
            )}

            {/* Legal Tab */}
            {activeTab === 'legal' && (
              <FieldGroup>
                <Field>
                  <Label>
                    Offizieller Firmenname
                    <InfoTooltip content="Name laut Handelsregister oder offiziellen Dokumenten" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Input 
                    value={formData.officialName || ''} 
                    onChange={(e) => setFormData({ ...formData, officialName: e.target.value })}
                    placeholder="z.B. Example GmbH" 
                  />
                </Field>

                <Field>
                  <Label>
                    Handelsname (DBA)
                    <InfoTooltip content="Falls anders als offizieller Name" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Input 
                    value={formData.tradingName || ''} 
                    onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                    placeholder="z.B. Example" 
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>Rechtsform</Label>
                    <Select 
                      value={formData.legalForm || ''} 
                      onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
                    >
                      <option value="">Bitte wählen...</option>
                      {LEGAL_FORMS.map(form => (
                        <option key={form.value} value={form.value}>{form.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    <Label>Gründungsdatum</Label>
                    <Input 
                      type="date" 
                      value={formData.foundedDate ? new Date(formData.foundedDate).toISOString().split('T')[0] : ''} 
                      onChange={(e) => setFormData({ ...formData, foundedDate: e.target.value ? new Date(e.target.value) : undefined })} 
                    />
                  </Field>
                </div>

                {/* Business Identifiers */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      Geschäftliche Kennungen
                      <InfoTooltip content="USt-ID, Handelsregister, etc." className="ml-1.5 inline-flex align-text-top" />
                    </div>
                    <Button type="button" onClick={addIdentifier} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      Kennung hinzufügen
                    </Button>
                  </div>
                  
                  {formData.identifiers && formData.identifiers.length > 0 ? (
                    <div className="space-y-2">
                      {formData.identifiers.map((identifier, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-lg">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <Select 
                                value={identifier.type} 
                                onChange={(e) => {
                                  const updated = [...formData.identifiers!];
                                  updated[index].type = e.target.value as any;
                                  setFormData({ ...formData, identifiers: updated });
                                }}
                              >
                                {IDENTIFIER_TYPES.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </Select>
                            </div>
                            <div className="col-span-6">
                              <Input 
                                value={identifier.value} 
                                onChange={(e) => {
                                  const updated = [...formData.identifiers!];
                                  updated[index].value = e.target.value;
                                  setFormData({ ...formData, identifiers: updated });
                                }}
                                placeholder="Wert eingeben..." 
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                value={identifier.issuingAuthority || ''}
                                onChange={(e) => {
                                  const updated = [...formData.identifiers!];
                                  updated[index].issuingAuthority = e.target.value;
                                  setFormData({ ...formData, identifiers: updated });
                                }}
                                placeholder="Land/Behörde"
                              />
                            </div>
                            <div className="col-span-1">
                              <Button type="button" plain onClick={() => removeIdentifier(index)}>
                                <TrashIcon className="h-5 w-5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">Keine Kennungen hinzugefügt</Text>
                  )}
                </div>
              </FieldGroup>
            )}

            {/* International Tab */}
            {activeTab === 'international' && (
              <FieldGroup>
                {/* Main Address */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">Hauptadresse</div>
                  
                  <Field>
                    <Label>Straße und Hausnummer</Label>
                    <Input 
                      value={formData.mainAddress?.street || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        mainAddress: { ...formData.mainAddress!, street: e.target.value }
                      })} 
                      placeholder="Musterstraße 123" 
                    />
                  </Field>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <Label>PLZ</Label>
                      <Input 
                        value={formData.mainAddress?.postalCode || ''} 
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mainAddress: { ...formData.mainAddress!, postalCode: e.target.value }
                        })} 
                        placeholder="12345" 
                      />
                    </Field>
                    <Field className="col-span-2">
                      <Label>Stadt</Label>
                      <Input 
                        value={formData.mainAddress?.city || ''} 
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mainAddress: { ...formData.mainAddress!, city: e.target.value }
                        })} 
                        placeholder="Berlin" 
                      />
                    </Field>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <Label>Bundesland/Region</Label>
                      <Input 
                        value={formData.mainAddress?.region || ''} 
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mainAddress: { ...formData.mainAddress!, region: e.target.value }
                        })} 
                        placeholder="Bayern" 
                      />
                    </Field>
                    <Field>
                      <Label>Land</Label>
                      <CountrySelector
                        value={formData.mainAddress?.countryCode}
                        onChange={(country) => setFormData({ 
                          ...formData, 
                          mainAddress: { ...formData.mainAddress!, countryCode: country as CountryCode }
                        })}
                        showCommonOnly={true}
                      />
                    </Field>
                  </div>
                </div>

                {/* Phone Numbers */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Telefonnummern</div>
                    <Button type="button" onClick={addPhoneField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      Nummer hinzufügen
                    </Button>
                  </div>
                  
                  {formData.phones && formData.phones.length > 0 ? (
                    <div className="space-y-3">
                      {formData.phones.map((phone, index) => (
                        <div key={index} className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-3">
                              <Select 
                                value={phone.type} 
                                onChange={(e) => {
                                  const updated = [...formData.phones!];
                                  updated[index].type = e.target.value as any;
                                  setFormData({ ...formData, phones: updated });
                                }}
                              >
                                <option value="business">Geschäftlich</option>
                                <option value="mobile">Mobil</option>
                                <option value="fax">Fax</option>
                                <option value="private">Privat</option>
                                <option value="other">Sonstige</option>
                              </Select>
                            </div>
                            <div className="col-span-7">
                              <PhoneInput
                                value={phone.number}
                                onChange={(value) => {
                                  const updated = [...formData.phones!];
                                  updated[index].number = value || '';
                                  setFormData({ ...formData, phones: updated });
                                }}
                                defaultCountry={formData.mainAddress?.countryCode || 'DE'}
                              />
                            </div>
                            <div className="col-span-1 flex items-center pt-2">
                              <Checkbox
                                checked={phone.isPrimary}
                                onChange={(checked) => {
                                  const updated = [...formData.phones!];
                                  // Ensure only one primary
                                  updated.forEach((p, i) => {
                                    p.isPrimary = i === index && checked;
                                  });
                                  setFormData({ ...formData, phones: updated });
                                }}
                                aria-label="Primär"
                              />
                            </div>
                            <div className="col-span-1 pt-2">
                              <Button type="button" plain onClick={() => removePhoneField(index)}>
                                <TrashIcon className="h-5 w-5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">Keine Telefonnummern hinzugefügt</Text>
                  )}
                </div>

                {/* Email Addresses */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">E-Mail-Adressen</div>
                    <Button type="button" onClick={addEmailField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      E-Mail hinzufügen
                    </Button>
                  </div>
                  
                  {formData.emails && formData.emails.length > 0 ? (
                    <div className="space-y-2">
                      {formData.emails.map((email, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <Select 
                              value={email.type} 
                              onChange={(e) => {
                                const updated = [...formData.emails!];
                                updated[index].type = e.target.value as any;
                                setFormData({ ...formData, emails: updated });
                              }}
                            >
                              <option value="general">Allgemein</option>
                              <option value="support">Support</option>
                              <option value="sales">Vertrieb</option>
                              <option value="billing">Buchhaltung</option>
                              <option value="press">Presse</option>
                            </Select>
                          </div>
                          <div className="col-span-7">
                            <Input 
                              type="email"
                              value={email.email} 
                              onChange={(e) => {
                                const updated = [...formData.emails!];
                                updated[index].email = e.target.value;
                                setFormData({ ...formData, emails: updated });
                              }}
                              placeholder="email@firma.de" 
                            />
                          </div>
                          <div className="col-span-1 flex items-center">
                            <Checkbox
                              checked={email.isPrimary}
                              onChange={(checked) => {
                                const updated = [...formData.emails!];
                                // Ensure only one primary
                                updated.forEach((e, i) => {
                                  e.isPrimary = i === index && checked;
                                });
                                setFormData({ ...formData, emails: updated });
                              }}
                              aria-label="Primär"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button type="button" plain onClick={() => removeEmailField(index)}>
                              <TrashIcon className="h-5 w-5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">Keine E-Mail-Adressen hinzugefügt</Text>
                  )}
                </div>

                {/* Social Media */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
                  {(formData.socialMedia || []).map((profile, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Select 
                          value={profile.platform} 
                          onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                        >
                          {Object.entries(socialPlatformLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-6">
                        <Input 
                          value={profile.url} 
                          onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)} 
                          placeholder="https://..." 
                        />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" plain onClick={() => removeSocialMediaField(index)}>
                          <TrashIcon className="h-5 w-5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" onClick={addSocialMediaField} plain className="w-full">
                    <PlusIcon className="h-4 w-4" />
                    Profil hinzufügen
                  </Button>
                </div>
              </FieldGroup>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <FieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>Jahresumsatz</Label>
                    <CurrencyInput
                      value={formData.financial?.annualRevenue?.amount}
                      onChange={(value) => setFormData({ 
                        ...formData, 
                        financial: { 
                          ...formData.financial!, 
                          annualRevenue: value ? { amount: value, currency: 'EUR' as CurrencyCode } : undefined
                        }
                      })}
                      currency={'EUR'}
                      placeholder="0,00"
                    />
                  </Field>
                  <Field>
                    <Label>Mitarbeiterzahl</Label>
                    <Input 
                      type="number" 
                      value={formData.financial?.employees || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        financial: { 
                          ...formData.financial!, 
                          employees: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      placeholder="0" 
                    />
                  </Field>
                </div>

                <Field>
                  <Label>Geschäftsjahresende</Label>
                  <Input 
                    type="text" 
                    value={formData.financial?.fiscalYearEnd || ''} 
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      financial: { 
                        ...formData.financial!, 
                        fiscalYearEnd: e.target.value || undefined
                      }
                    })} 
                    placeholder="31.12."
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Format: TT.MM. (z.B. 31.12. für 31. Dezember)
                  </Text>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label>Kreditrating</Label>
                    <Input 
                      value={formData.financial?.creditRating || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        financial: { ...formData.financial!, creditRating: e.target.value || undefined }
                      })}
                      placeholder="AAA, BB+, etc." 
                    />
                  </Field>
                </div>
              </FieldGroup>
            )}

            {/* Corporate Tab */}
            {activeTab === 'corporate' && (
              <FieldGroup>
                <Field>
                  <Label>
                    Muttergesellschaft
                    <InfoTooltip content="Direkte Muttergesellschaft dieses Unternehmens" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Select 
                    value={formData.parentCompanyId || ''} 
                    onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value || undefined })}
                  >
                    <option value="">Keine Muttergesellschaft</option>
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </Select>
                </Field>

                <Field>
                  <Label>
                    Oberste Muttergesellschaft
                    <InfoTooltip content="Oberste Muttergesellschaft in der Konzernstruktur" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Select 
                    value={formData.ultimateParentId || ''} 
                    onChange={(e) => setFormData({ ...formData, ultimateParentId: e.target.value || undefined })}
                  >
                    <option value="">Keine oberste Muttergesellschaft</option>
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </Select>
                </Field>

                {/* TODO: Subsidiary selection would need a more complex UI */}
                <div className="rounded-md bg-gray-50 p-4">
                  <Text className="text-sm text-gray-600">
                    Tochtergesellschaften können nach dem Speichern über die Konzernstruktur-Ansicht verwaltet werden.
                  </Text>
                </div>
              </FieldGroup>
            )}

            {/* Media Tab (simplified - only shows linked items) */}
            {activeTab === 'media' && isMediaCompany && (
              <div className="space-y-6">
                {/* Info Alert */}
                <Alert 
                  type="info" 
                  title="Medien-Verwaltung"
                  message="Publikationen, Werbemittel und Media Kits werden jetzt zentral im Bibliotheks-Bereich verwaltet. Hier sehen Sie alle verknüpften Elemente." 
                />

                {/* Publikationen */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpenIcon className="h-5 w-5 text-gray-400" />
                      <div className="text-sm font-medium text-gray-900">
                        Publikationen
                        <InfoTooltip content="Alle Publikationen dieses Verlags/Medienhauses" className="ml-1.5 inline-flex align-text-top" />
                      </div>
                    </div>
                    <Button 
                      type="button"
                      plain 
                      onClick={() => {
                        // Save current form state if needed
                        const publisherId = company?.id;
                        router.push(`/dashboard/library/publications/new${publisherId ? `?publisherId=${publisherId}` : ''}`);
                      }}
                      className="text-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Neue Publikation
                    </Button>
                  </div>
                  
                  {loadingLibraryData ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : linkedPublications.length > 0 ? (
                    <div className="space-y-2">
                      {linkedPublications.slice(0, 5).map((pub) => (
                        <div key={pub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{pub.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge color="zinc" className="text-xs">
                                {pub.type === 'magazine' ? 'Magazin' :
                                 pub.type === 'newspaper' ? 'Zeitung' :
                                 pub.type === 'website' ? 'Website' :
                                 pub.type === 'blog' ? 'Blog' :
                                 pub.type === 'newsletter' ? 'Newsletter' :
                                 pub.type === 'podcast' ? 'Podcast' :
                                 pub.type === 'tv' ? 'TV' :
                                 pub.type === 'radio' ? 'Radio' :
                                 pub.type === 'trade_journal' ? 'Fachzeitschrift' :
                                 pub.type === 'press_agency' ? 'Nachrichtenagentur' :
                                 pub.type === 'social_media' ? 'Social Media' :
                                 pub.type}
                              </Badge>
                              {pub.verified && (
                                <Badge color="green" className="text-xs">
                                  Verifiziert
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Link
                            href={`/dashboard/library/publications/${pub.id}`}
                            className="text-sm text-primary hover:text-primary-hover"
                          >
                            Anzeigen
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500 text-center py-4">
                      Noch keine Publikationen verknüpft
                    </Text>
                  )}
                  
                  {linkedPublications.length > 5 && (
                    <Link
                      href={`/dashboard/library/publications?publisherId=${company?.id}`}
                      className="block text-sm text-primary hover:text-primary-hover text-center pt-2"
                    >
                      Alle {linkedPublications.length} Publikationen anzeigen →
                    </Link>
                  )}
                </div>

                {/* Werbemittel */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MegaphoneIcon className="h-5 w-5 text-gray-400" />
                      <div className="text-sm font-medium text-gray-900">
                        Werbemittel
                        <InfoTooltip content="Verfügbare Werbeplätze und -formate" className="ml-1.5 inline-flex align-text-top" />
                      </div>
                    </div>
                    <Button 
                      type="button"
                      plain 
                      onClick={() => {
                        const publisherId = company?.id;
                        router.push(`/dashboard/library/advertisements/new${publisherId ? `?publisherId=${publisherId}` : ''}`);
                      }}
                      className="text-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Neues Werbemittel
                    </Button>
                  </div>
                  
                  {loadingLibraryData ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : linkedAdvertisements.length > 0 ? (
                    <div className="space-y-2">
                      {linkedAdvertisements.slice(0, 5).map((ad) => (
                        <div key={ad.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{ad.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge color="blue" className="text-xs">
                                {ad.type === 'display_banner' ? 'Display Banner' :
                                 ad.type === 'native_ad' ? 'Native Ad' :
                                 ad.type === 'video_ad' ? 'Video' :
                                 ad.type === 'print_ad' ? 'Print' :
                                 ad.type === 'audio_spot' ? 'Audio' :
                                 ad.type === 'newsletter_ad' ? 'Newsletter' :
                                 ad.type === 'social_media_ad' ? 'Social Media' :
                                 ad.type === 'advertorial' ? 'Advertorial' :
                                 ad.type === 'event_sponsoring' ? 'Event' :
                                 ad.type === 'content_partnership' ? 'Content' :
                                 ad.type}
                              </Badge>
                              <Badge color={ad.status === 'active' ? 'green' : 'zinc'} className="text-xs">
                                {ad.status === 'active' ? 'Aktiv' :
                                 ad.status === 'draft' ? 'Entwurf' :
                                 ad.status === 'paused' ? 'Pausiert' :
                                 'Eingestellt'}
                              </Badge>
                            </div>
                          </div>
                          <Link
                            href={`/dashboard/library/advertisements/${ad.id}`}
                            className="text-sm text-primary hover:text-primary-hover"
                          >
                            Anzeigen
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500 text-center py-4">
                      Noch keine Werbemittel verknüpft
                    </Text>
                  )}
                  
                  {linkedAdvertisements.length > 5 && (
                    <Link
                      href={`/dashboard/library/advertisements?publisherId=${company?.id}`}
                      className="block text-sm text-primary hover:text-primary-hover text-center pt-2"
                    >
                      Alle {linkedAdvertisements.length} Werbemittel anzeigen →
                    </Link>
                  )}
                </div>

                {/* Media Kits */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                      <div className="text-sm font-medium text-gray-900">
                        Media Kits
                        <InfoTooltip content="Zusammenstellungen für Werbetreibende" className="ml-1.5 inline-flex align-text-top" />
                      </div>
                    </div>
                    <Button 
                      type="button"
                      plain 
                      onClick={() => {
                        const publisherId = company?.id;
                        router.push(`/dashboard/library/media-kits/new${publisherId ? `?companyId=${publisherId}` : ''}`);
                      }}
                      className="text-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Neues Media Kit
                    </Button>
                  </div>
                  
                  {loadingLibraryData ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : linkedMediaKits.length > 0 ? (
                    <div className="space-y-2">
                      {linkedMediaKits.slice(0, 5).map((kit) => (
                        <div key={kit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{kit.name}</div>
                            <div className="text-xs text-gray-500">Version {kit.version}</div>
                          </div>
                          <Link
                            href={`/dashboard/library/media-kits/${kit.id}`}
                            className="text-sm text-primary hover:text-primary-hover"
                          >
                            Anzeigen
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500 text-center py-4">
                      Noch keine Media Kits erstellt
                    </Text>
                  )}
                  
                  {linkedMediaKits.length > 5 && (
                    <Link
                      href={`/dashboard/library/media-kits?companyId=${company?.id}`}
                      className="block text-sm text-primary hover:text-primary-hover text-center pt-2"
                    >
                      Alle {linkedMediaKits.length} Media Kits anzeigen →
                    </Link>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{linkedPublications.length}</div>
                    <div className="text-sm text-gray-600">Publikationen</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{linkedAdvertisements.length}</div>
                    <div className="text-sm text-gray-600">Werbemittel</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{linkedMediaKits.length}</div>
                    <div className="text-sm text-gray-600">Media Kits</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}