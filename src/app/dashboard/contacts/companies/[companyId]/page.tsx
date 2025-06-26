// src/app/dashboard/contacts/companies/[companyId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, socialPlatformLabels } from "@/types/crm";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import CompanyModal from '@/app/dashboard/contacts/CompanyModal';
import CompanyMediaSection from '@/components/crm/CompanyMediaSection'; // NEU: Media Section

// Hilfsfunktion zum Formatieren des Datums
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) {
    return 'Unbekannt';
  }
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

export default function CompanyDetailPage() {
  const { user } = useAuth();
  const params = useParams(); // Hook, um die [companyId] aus der URL zu bekommen
  const companyId = params.companyId as string;

  // States für die auf dieser Seite benötigten Daten
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State für die Sichtbarkeit des Bearbeiten-Modals
  const [showEditModal, setShowEditModal] = useState(false);

  // Funktion zum Laden aller benötigten Daten
  const loadData = async () => {
    if (!user || !companyId) return;
    setLoading(true);
    try {
      const companyData = await companiesService.getById(companyId);
      if (companyData) {
        setCompany(companyData);
        // Lade die zugehörigen Kontakte und Tags
        const contactsData = await contactsService.getByCompanyId(companyId);
        setContacts(contactsData);

        if (companyData.tagIds && companyData.tagIds.length > 0) {
          const tagsData = await tagsService.getByIds(companyData.tagIds);
          setTags(tagsData);
        }
      } else {
        setError("Firma nicht gefunden.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Laden der Daten.");
      // Hier wird wahrscheinlich der Fehler wegen des fehlenden Indexes auftreten
      if (err.code === 'failed-precondition') {
          setError("Fehler: Ein Datenbank-Index ist erforderlich. Bitte erstelle den Index gemäß der Anweisung in der Browser-Konsole und lade die Seite neu.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, [user, companyId]);

  // Lade-Zustand
  if (loading) {
    return <div className="p-6">Lade Firmendaten...</div>;
  }

  // Fehler-Zustand
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  
  // "Nicht gefunden"-Zustand
  if (!company) {
    return <div className="p-6">Firma konnte nicht gefunden werden.</div>;
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header der Seite */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Heading>{company.name}</Heading>
            <Text className="mt-1">
              {companyTypeLabels[company.type]} {company.industry && `• ${company.industry}`}
            </Text>
          </div>
          <Button onClick={() => setShowEditModal(true)}>Firma bearbeiten</Button>
        </div>

        {/* Hauptinhalt in zwei Spalten */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Linke, breitere Spalte für Hauptinformationen */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Kontaktdaten</h3>
              <p><strong>Website:</strong> <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600">{company.website}</a></p>
              <p><strong>Telefon:</strong> {company.phone || '-'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Adresse</h3>
              <p>{company.address?.street}</p>
              {company.address?.street2 && <p>{company.address.street2}</p>}
              <p>{company.address?.zip} {company.address?.city}</p>
              <p>{company.address?.country}</p>
            </div>
            {company.notes && (
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Notizen</h3>
                    <p className="whitespace-pre-wrap">{company.notes}</p>
                </div>
            )}
          </div>

          {/* Rechte, schmalere Spalte für verknüpfte Daten */}
          <div className="space-y-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Details</h3>
              <p><strong>Erstellt am:</strong> {formatDate(company.createdAt)}</p>
              <p><strong>Zuletzt geändert:</strong> {formatDate(company.updatedAt)}</p>
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag.id} color={tag.color as any}>{tag.name}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Zugehörige Kontakte ({contacts.length})</h3>
              <ul className="space-y-2">
                {contacts.map(contact => (
                  <li key={contact.id}>
                    <Link href={`/dashboard/contacts/contacts/${contact.id}`} className="text-indigo-600 hover:underline">
                      {contact.firstName} {contact.lastName}
                    </Link>
                    {contact.position && <span className="text-sm text-zinc-500 ml-2">• {contact.position}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ✨ NEU: Media Section - Volle Breite unter dem Grid */}
        <CompanyMediaSection 
          companyId={companyId}
          companyName={company.name}
        />
      </div>

      {/* Das Bearbeiten-Modal wird nur bei Bedarf gerendert */}
      {showEditModal && (
        <CompanyModal
          company={company}
          userId={user!.uid}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadData(); // Lade die Daten neu, um Änderungen anzuzeigen
          }}
        />
      )}
    </>
  );
}