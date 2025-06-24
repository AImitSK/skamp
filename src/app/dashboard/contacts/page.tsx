// src/app/dashboard/contacts/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { PlusIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/20/solid";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";
import ImportModal from "./ImportModal";
import clsx from "clsx";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import Papa from 'papaparse';

type TabType = 'companies' | 'contacts';

export default function ContactsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Filter-States für Firmen
  const [selectedTypes, setSelectedTypes] = useState<CompanyType[]>([]);
  const [selectedCompanyTagIds, setSelectedCompanyTagIds] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  
  // Filter-States für Kontakte
  const [selectedContactCompanyIds, setSelectedContactCompanyIds] = useState<string[]>([]);
  const [selectedContactTagIds, setSelectedContactTagIds] = useState<string[]>([]);
  const [selectedContactPositions, setSelectedContactPositions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesService.getAll(user.uid),
        contactsService.getAll(user.uid),
        tagsService.getAll(user.uid)
      ]);
      setCompanies(companiesData);
      setContacts(contactsData);
      setTags(tagsData);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setLoading(false);
    }
  };

  const industryOptions = useMemo(() => {
    const industries = companies.map(c => c.industry).filter(Boolean) as string[];
    return Array.from(new Set(industries)).sort();
  }, [companies]);

  const tagOptions = useMemo(() => {
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const positionOptions = useMemo(() => {
    const positions = contacts.map(c => c.position).filter(Boolean) as string[];
    return Array.from(new Set(positions)).sort();
  }, [contacts]);
  
  const companyOptions = useMemo(() => {
    return companies
      .map(c => ({ value: c.id!, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter(company => {
        const searchMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) || company.industry?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchMatch) return false;
        
        const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(company.type);
        if (!typeMatch) return false;

        const industryMatch = selectedIndustries.length === 0 || (company.industry && selectedIndustries.includes(company.industry));
        if (!industryMatch) return false;
          
        const tagMatch = selectedCompanyTagIds.length === 0 || company.tagIds?.some(tagId => selectedCompanyTagIds.includes(tagId));
        if (!tagMatch) return false;

        return true;
      });
  }, [companies, searchTerm, selectedTypes, selectedIndustries, selectedCompanyTagIds]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const searchMatch = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) || contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      const companyMatch = selectedContactCompanyIds.length === 0 || (contact.companyId && selectedContactCompanyIds.includes(contact.companyId));
      if (!companyMatch) return false;
      
      const positionMatch = selectedContactPositions.length === 0 || (contact.position && selectedContactPositions.includes(contact.position));
      if (!positionMatch) return false;
        
      const tagMatch = selectedContactTagIds.length === 0 || contact.tagIds?.some(tagId => selectedContactTagIds.includes(tagId));
      if (!tagMatch) return false;

      return true;
    });
  }, [contacts, searchTerm, selectedContactCompanyIds, selectedContactPositions, selectedContactTagIds]);


  const handleSelectAllCompanies = (checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds(new Set(filteredCompanies.map(c => c.id!)));
    } else {
      setSelectedCompanyIds(new Set());
    }
  };

  const handleSelectAllContacts = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id!)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const handleSelectCompany = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedCompanyIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedCompanyIds(newSelection);
  };

  const handleSelectContact = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedContactIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedContactIds(newSelection);
  };

  const handleBulkDelete = async () => {
    const count = activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size;
    if (count === 0) return;
    const type = activeTab === 'companies' ? 'Firmen' : 'Kontakte';
    
    if (confirm(`Möchten Sie wirklich ${count} ausgewählte ${type} löschen?`)) {
      const ids = activeTab === 'companies' ? Array.from(selectedCompanyIds) : Array.from(selectedContactIds);
      const service = activeTab === 'companies' ? companiesService : contactsService;
      
      try {
        await Promise.all(ids.map(id => service.delete(id)));
        if (activeTab === 'companies') {
          setSelectedCompanyIds(new Set());
        } else {
          setSelectedContactIds(new Set());
        }
        await loadData();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
        alert("Fehler beim Löschen der Einträge");
      }
    }
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactModal(true);
  };

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm("Möchten Sie diese Firma wirklich löschen?")) {
      await companiesService.delete(id);
      await loadData();
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm("Möchten Sie diesen Kontakt wirklich löschen?")) {
      await contactsService.delete(id);
      await loadData();
    }
  };
  
  const handleAddNew = () => {
    if (activeTab === 'companies') {
        setSelectedCompany(null);
        setShowCompanyModal(true);
    } else {
        setSelectedContact(null);
        setShowContactModal(true);
    }
  };

  const renderTags = (tagIds?: string[]) => {
    if (!tagIds || tagIds.length === 0) return null;
    const entityTags = tags.filter(tag => tagIds.includes(tag.id!));
    return (
      <div className="flex flex-wrap gap-1">
        {entityTags.map(tag => (
          <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge>
        ))}
      </div>
    );
  };
  
  const handleExport = () => {
    const isCompanies = activeTab === 'companies';
    const data = isCompanies ? filteredCompanies : filteredContacts;
    const filename = isCompanies ? 'firmen-export.csv' : 'kontakte-export.csv';

    if (data.length === 0) {
      alert("Keine Daten zum Exportieren in der aktuellen Ansicht.");
      return;
    }

    let csv;
    if (isCompanies) {
      const companyData = (data as Company[]).map(company => ({
        "Firmenname": company.name,
        "Typ": companyTypeLabels[company.type],
        "Branche": company.industry || '',
        "Website": company.website || '',
        "Telefon": company.phone || '',
        "Strasse": company.address?.street || '',
        "Adresszeile 2": company.address?.street2 || '',
        "PLZ": company.address?.zip || '',
        "Stadt": company.address?.city || '',
        "Land": company.address?.country || '',
        "Notizen": company.notes || '',
        "Tags": (company.tagIds || []).map(tagId => tags.find(t => t.id === tagId)?.name).filter(Boolean).join(', '),
      }));
      csv = Papa.unparse(companyData);
    } else {
      const contactData = (data as Contact[]).map(contact => ({
        "Vorname": contact.firstName,
        "Nachname": contact.lastName,
        "Firma": contact.companyName || '',
        "Position": contact.position || '',
        "E-Mail": contact.email || '',
        "Telefon": contact.phone || '',
        "Notizen": contact.notes || '',
        "Tags": (contact.tagIds || []).map(tagId => tags.find(t => t.id === tagId)?.name).filter(Boolean).join(', '),
      }));
      csv = Papa.unparse(contactData);
    }
    
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Kontakte</Heading>
          <Text className="mt-1">Verwalte deine Firmen und Ansprechpartner</Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button plain onClick={() => setShowImportModal(true)}>Importieren</Button>
          <Button plain onClick={handleExport}>Exportieren</Button>
          <Button onClick={handleAddNew}>
            <PlusIcon className="size-4 mr-2" />
            {activeTab === 'companies' ? 'Firma hinzufügen' : 'Person hinzufügen'}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <button
          onClick={() => { setActiveTab('companies'); setSearchTerm(''); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          Firmen ({companies.length})
        </button>
        <button
          onClick={() => { setActiveTab('contacts'); setSearchTerm(''); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'contacts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          Personen ({contacts.length})
        </button>
      </div>

      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          placeholder={activeTab === 'companies' ? 'Firmen suchen...' : 'Personen suchen...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 border rounded-lg bg-zinc-50">
          <MultiSelectDropdown label="Typ" placeholder="Nach Typ filtern..." options={Object.entries(companyTypeLabels).map(([value, label]) => ({ value, label }))} selectedValues={selectedTypes} onChange={(values) => setSelectedTypes(values as CompanyType[])}/>
          <MultiSelectDropdown label="Branche" placeholder="Nach Branche filtern..." options={industryOptions.map(industry => ({ value: industry, label: industry }))} selectedValues={selectedIndustries} onChange={(values) => setSelectedIndustries(values)}/>
          <MultiSelectDropdown label="Tags" placeholder="Nach Tags filtern..." options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} selectedValues={selectedCompanyTagIds} onChange={(values) => setSelectedCompanyTagIds(values)}/>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 border rounded-lg bg-zinc-50">
          <MultiSelectDropdown label="Firma" placeholder="Nach Firma filtern..." options={companyOptions} selectedValues={selectedContactCompanyIds} onChange={(values) => setSelectedContactCompanyIds(values)}/>
          <MultiSelectDropdown label="Position" placeholder="Nach Position filtern..." options={positionOptions.map(pos => ({ value: pos, label: pos }))} selectedValues={selectedContactPositions} onChange={(values) => setSelectedContactPositions(values)}/>
          <MultiSelectDropdown label="Tags" placeholder="Nach Tags filtern..." options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} selectedValues={selectedContactTagIds} onChange={(values) => setSelectedContactTagIds(values)}/>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between h-9">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {activeTab === 'companies' ? `${filteredCompanies.length} von ${companies.length} Firmen` : `${filteredContacts.length} von ${contacts.length} Kontakten`}
        </p>
        <div className={clsx("flex items-center gap-4 transition-opacity", (((activeTab === 'companies' && selectedCompanyIds.size > 0) || (activeTab === 'contacts' && selectedContactIds.size > 0)) ? "opacity-100" : "opacity-0 pointer-events-none"))}>
          <span className="text-sm text-zinc-600">{activeTab === 'companies' ? `${selectedCompanyIds.size} ausgewählt` : `${selectedContactIds.size} ausgewählt`}</span>
          <button onClick={handleBulkDelete} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"><TrashIcon className="size-4" /> Löschen</button>
        </div>
      </div>

      {loading ? ( <div className="text-center py-12 text-zinc-500">Lade Daten...</div> ) : (
        <>
          {activeTab === 'companies' && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-12">
                    <Checkbox
                      checked={filteredCompanies.length > 0 && selectedCompanyIds.size === filteredCompanies.length}
                      indeterminate={selectedCompanyIds.size > 0 && selectedCompanyIds.size < filteredCompanies.length}
                      onChange={(checked) => handleSelectAllCompanies(checked)}
                    />
                  </TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Typ</TableHeader>
                  <TableHeader>Tags</TableHeader>
                  <TableHeader>Branche</TableHeader>
                  <TableHeader>Website</TableHeader>
                  <TableHeader>Telefon</TableHeader>
                  <TableHeader className="text-right">Aktionen</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell><Checkbox checked={selectedCompanyIds.has(company.id!)} onChange={(checked) => handleSelectCompany(company.id!, checked)}/></TableCell>
                      <TableCell className="font-medium"><button onClick={() => handleEditCompany(company)} className="text-indigo-600 hover:text-indigo-500 hover:underline">{company.name}</button></TableCell>
                      <TableCell><Badge color="zinc">{companyTypeLabels[company.type]}</Badge></TableCell>
                      <TableCell>{renderTags(company.tagIds)}</TableCell>
                      <TableCell>{company.industry || '-'}</TableCell>
                      <TableCell>{company.website || '-'}</TableCell>
                      <TableCell>{company.phone || '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <button type="button" onClick={() => handleEditCompany(company)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Bearbeiten</button>
                        <button type="button" onClick={() => handleDeleteCompany(company.id!)} className="text-sm font-medium text-red-600 hover:text-red-500">Löschen</button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'contacts' && (
             <Table>
               <TableHead>
                 <TableRow>
                   <TableHeader className="w-12"><Checkbox checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length} indeterminate={selectedContactIds.size > 0 && selectedContactIds.size < filteredContacts.length} onChange={(checked) => handleSelectAllContacts(checked)}/></TableHeader>
                   <TableHeader>Name</TableHeader>
                   <TableHeader>Firma</TableHeader>
                   <TableHeader>Tags</TableHeader>
                   <TableHeader>Position</TableHeader>
                   <TableHeader>E-Mail</TableHeader>
                   <TableHeader>Telefon</TableHeader>
                   <TableHeader className="text-right">Aktionen</TableHeader>
                 </TableRow>
               </TableHead>
               <TableBody>
                 {filteredContacts.map((contact) => (
                     <TableRow key={contact.id}>
                       <TableCell><Checkbox checked={selectedContactIds.has(contact.id!)} onChange={(checked) => handleSelectContact(contact.id!, checked)}/></TableCell>
                       <TableCell className="font-medium"><button onClick={() => handleEditContact(contact)} className="text-indigo-600 hover:text-indigo-500 hover:underline">{contact.firstName} {contact.lastName}</button></TableCell>
                       <TableCell>{contact.companyName || '-'}</TableCell>
                       <TableCell>{renderTags(contact.tagIds)}</TableCell>
                       <TableCell>{contact.position || '-'}</TableCell>
                       <TableCell>{contact.email || '-'}</TableCell>
                       <TableCell>{contact.phone || '-'}</TableCell>
                       <TableCell className="text-right space-x-2">
                        <button type="button" onClick={() => handleEditContact(contact)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Bearbeiten</button>
                        <button type="button" onClick={() => handleDeleteContact(contact.id!)} className="text-sm font-medium text-red-600 hover:text-red-500">Löschen</button>
                       </TableCell>
                     </TableRow>
                   ))}
               </TableBody>
             </Table>
          )}
        </>
      )}

      {showCompanyModal && <CompanyModal company={selectedCompany} onClose={() => setShowCompanyModal(false)} onSave={loadData} userId={user?.uid || ''}/>}
      {showContactModal && <ContactModal contact={selectedContact} companies={companies} onClose={() => setShowContactModal(false)} onSave={loadData} userId={user?.uid || ''}/>}
      {showImportModal && <ImportModal activeTab={activeTab} onClose={() => setShowImportModal(false)} onImportSuccess={() => { setShowImportModal(false); loadData(); }}/>}
    </div>
  );
}