// src/app/dashboard/contacts/contacts/[contactId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Contact, Tag } from "@/types/crm";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import ContactModal from "@/app/dashboard/contacts/ContactModal"; 

// Hilfsfunktion zum Formatieren des Datums (könnte man in eine eigene Datei auslagern)
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

export default function ContactDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadData = async () => {
    if (!user || !contactId) return;
    setLoading(true);
    try {
      // Der getById Service für Kontakte holt den Firmennamen praktischerweise schon mit
      const contactData = await contactsService.getById(contactId);

      if (contactData) {
        setContact(contactData);
        if (contactData.tagIds && contactData.tagIds.length > 0) {
          const tagsData = await tagsService.getByIds(contactData.tagIds);
          setTags(tagsData);
        }
      } else {
        setError("Kontakt nicht gefunden.");
      }
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Daten.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, [user, contactId]);

  if (loading) {
    return <div className="p-6">Lade Kontaktdaten...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  
  if (!contact) {
    return <div className="p-6">Kontakt konnte nicht gefunden werden.</div>;
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Heading>{contact.firstName} {contact.lastName}</Heading>
            {contact.position && <Text className="mt-1">{contact.position}</Text>}
          </div>
          <Button onClick={() => setShowEditModal(true)}>Kontakt bearbeiten</Button>
        </div>

        {/* Hauptinhalt in zwei Spalten */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Linke Spalte */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Kontaktdaten</h3>
              <p><strong>E-Mail:</strong> <a href={`mailto:${contact.email}`} className="text-indigo-600">{contact.email}</a></p>
              <p><strong>Telefon:</strong> {contact.phone || '-'}</p>
            </div>
            {contact.notes && (
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Notizen</h3>
                    <p className="whitespace-pre-wrap">{contact.notes}</p>
                </div>
            )}
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Details</h3>
              {contact.companyId && contact.companyName && (
                <p>
                  <strong>Firma:</strong>{' '}
                  <Link href={`/dashboard/contacts/companies/${contact.companyId}`} className="text-indigo-600 hover:underline">
                    {contact.companyName}
                  </Link>
                </p>
              )}
              <p><strong>Erstellt am:</strong> {formatDate(contact.createdAt)}</p>
              <p><strong>Zuletzt geändert:</strong> {formatDate(contact.updatedAt)}</p>
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag.id} color={tag.color as any}>{tag.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Das Bearbeiten-Modal */}
      {showEditModal && (
        <ContactModal
          contact={contact}
          // Wir müssen hier die Firmenliste für das Dropdown im Modal übergeben
          // Da wir sie auf dieser Seite nicht haben, übergeben wir ein leeres Array
          // oder eine angereicherte Version, falls vorhanden.
          // Für den Moment ist das die einfachste Lösung.
          companies={contact.companyId && contact.companyName ? [{ id: contact.companyId, name: contact.companyName, type: 'customer', userId: user!.uid }] : []}
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