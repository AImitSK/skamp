// src/app/dashboard/listen/[listId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from "@/context/AuthContext";
import { listsService } from "@/lib/firebase/lists-service";

// KORRIGIERTE IMPORTS:
import { DistributionList } from "@/types/lists"; // DistributionList kommt aus lists.ts
import { Contact, companyTypeLabels } from "@/types/crm"; // Contact kommt aus crm.ts

import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import ListModal from "../ListModal";
import { CalendarIcon, ClockIcon, HashtagIcon, ListBulletIcon } from "@heroicons/react/24/outline";

// Hilfsfunktion zum Formatieren des Datums
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function ListDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const listId = params.listId as string;

  const [list, setList] = useState<DistributionList | null>(null);
  const [contactsInList, setContactsInList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !listId) return;
    setLoading(true);
    setError(null);
    try {
      const listData = await listsService.getById(listId);
      if (listData) {
        setList(listData);
        const contactsData = await listsService.getContacts(listData);
        setContactsInList(contactsData);
      } else {
        setError("Liste nicht gefunden.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Laden der Listendetails.");
      if (err.code === 'failed-precondition') {
          setError("Fehler: Ein Datenbank-Index ist erforderlich. Bitte erstelle den Index gemäß der Anweisung in der Browser-Konsole und lade die Seite neu.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, listId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if(!list?.id) return;
    // Wir müssen den Service direkt aufrufen, da onSave im Modal keine Id erwartet
    await listsService.update(list.id, listData);
    setShowEditModal(false);
    await loadData(); // Lade Daten nach dem Speichern neu
  };
  
  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Lade Listendetails...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  
  if (!list) {
    return <div className="p-8 text-center">Liste konnte nicht gefunden werden.</div>;
  }

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
             <div className={clsx("h-4 w-4 rounded-full", list.color ? `bg-${list.color}-500` : 'bg-zinc-500')} />
            <div>
              <Heading>{list.name}</Heading>
              <Text className="mt-1">{list.description || 'Keine Beschreibung'}</Text>
            </div>
          </div>
          <Button onClick={() => setShowEditModal(true)}>Liste bearbeiten</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="border rounded-lg bg-white">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Enthaltene Kontakte ({list.contactCount})</h3>
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Position</TableHeader>
                    <TableHeader>Firma</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contactsInList.length > 0 ? contactsInList.map(contact => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/contacts/contacts/${contact.id}`} className="text-indigo-600 hover:underline">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{contact.position || '-'}</TableCell>
                      <TableCell>
                        {contact.companyId && contact.companyName ? (
                          <Link href={`/dashboard/contacts/companies/${contact.companyId}`} className="text-indigo-600 hover:underline">
                            {contact.companyName}
                          </Link>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center text-zinc-500 py-8">Diese Liste enthält keine Kontakte.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-white">
              <h3 className="font-semibold mb-3 text-lg">Listen-Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><ListBulletIcon className="w-5 h-5 text-zinc-500" /><Badge color={list.type === 'dynamic' ? 'green' : 'zinc'}>{list.type === 'dynamic' ? 'Dynamische Liste' : 'Statische Liste'}</Badge></div>
                <div className="flex items-center gap-3"><HashtagIcon className="w-5 h-5 text-zinc-500" /><Badge color={list.color as any}>{list.category}</Badge></div>
                <div className="flex items-center gap-3"><CalendarIcon className="w-5 h-5 text-zinc-500" /><span>Erstellt: {formatDate(list.createdAt)}</span></div>
                <div className="flex items-center gap-3"><ClockIcon className="w-5 h-5 text-zinc-500" /><span>Aktualisiert: {formatDate(list.lastUpdated)}</span></div>
              </div>
            </div>
            
            {list.type === 'dynamic' && list.filters && Object.values(list.filters).some(v => v && (!Array.isArray(v) || v.length > 0)) && (
              <div className="p-4 border rounded-lg bg-white">
                <h3 className="font-semibold mb-3 text-lg">Aktive Filter</h3>
                <ul className="text-sm space-y-2">
                  {Object.entries(list.filters).map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return <li key={key}><span className="font-medium capitalize">{readableKey}:</span> {Array.isArray(value) ? value.join(', ') : String(value)}</li>
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && user && (
        <ListModal
          list={list}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
          userId={user.uid}
        />
      )}
    </>
  );
}