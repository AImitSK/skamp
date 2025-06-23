// src/app/dashboard/contacts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Badge } from "@/components/badge";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { companiesService, contactsService } from "@/lib/firebase/crm-service";
// Importiere alle Typen aus der zentralen Datei
import { Company, Contact, companyTypeLabels } from "@/types/crm";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";

type TabType = 'companies' | 'contacts';

export default function ContactsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [companiesData, contactsData] = await Promise.all([
        companiesService.getAll(user.uid),
        contactsService.getAll(user.uid)
      ]);
      setCompanies(companiesData);
      setContacts(contactsData);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Kontakte</Heading>
          <Text className="mt-1">
            Verwalte deine Firmen und Ansprechpartner
          </Text>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <PlusIcon className="size-4" />
          {activeTab === 'companies' ? 'Firma hinzufügen' : 'Person hinzufügen'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('companies')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          Firmen ({companies.length})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
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




      {loading ? (
        <div className="text-center py-12 text-zinc-500">Lade Daten...</div>
      ) : (
        <>
          {activeTab === 'companies' && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Typ</TableHeader>
                  <TableHeader>Branche</TableHeader>
                  <TableHeader>Website</TableHeader>
                  <TableHeader>Telefon</TableHeader>
                  <TableHeader className="text-right">Aktionen</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <Badge color="zinc">
                          {companyTypeLabels[company.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.industry || '-'}</TableCell>
                      <TableCell>{company.website || '-'}</TableCell>
                      <TableCell>{company.phone || '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditCompany(company)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(company.id!)}
                          className="text-sm font-medium text-red-600 hover:text-red-500"
                        >
                          Löschen
                        </button>
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
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Firma</TableHeader>
                  <TableHeader>Position</TableHeader>
                  <TableHeader>E-Mail</TableHeader>
                  <TableHeader>Telefon</TableHeader>
                  <TableHeader className="text-right">Aktionen</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell>{contact.companyName || '-'}</TableCell>
                      <TableCell>{contact.position || '-'}</TableCell>
                      <TableCell>{contact.email || '-'}</TableCell>
                      <TableCell>{contact.phone || '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditContact(contact)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact.id!)}
                          className="text-sm font-medium text-red-600 hover:text-red-500"
                        >
                          Löschen
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {showCompanyModal && (
        <CompanyModal
          company={selectedCompany}
          onClose={() => setShowCompanyModal(false)}
          onSave={loadData}
          userId={user?.uid || ''}
        />
      )}

      {showContactModal && (
        <ContactModal
          contact={selectedContact}
          companies={companies}
          onClose={() => setShowContactModal(false)}
          onSave={loadData}
          userId={user?.uid || ''}
        />
      )}
    </div>
  );
}
