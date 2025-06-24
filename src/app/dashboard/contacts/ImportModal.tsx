// src/app/dashboard/contacts/ImportModal.tsx
"use client";

import { useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { Button } from '@/components/button';
import Papa from 'papaparse';
import { companiesService, contactsService } from '@/lib/firebase/crm-service';
import { Company, Contact, CompanyType } from '@/types/crm';
import { useAuth } from '@/context/AuthContext';

interface ImportModalProps {
  activeTab: 'companies' | 'contacts';
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportModal({ activeTab, onClose, onImportSuccess }: ImportModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleImport = () => {
    if (!file || !user) return;
    
    setIsImporting(true);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (activeTab === 'companies') {
            const newCompanies = results.data.map((row: any) => {
              if (!row["Firmenname"]) return null;
              return {
                name: row["Firmenname"],
                type: (row["Typ"]?.toLowerCase() as CompanyType) || 'other',
                industry: row["Branche"] || '',
                website: row["Website"] || '',
                phone: row["Telefon"] || '',
                address: {
                  street: row["Strasse"] || '',
                  street2: row["Adresszeile 2"] || '',
                  zip: row["PLZ"] || '',
                  city: row["Stadt"] || '',
                  country: row["Land"] || '',
                },
                notes: row["Notizen"] || '',
                userId: user.uid,
              } as Omit<Company, 'id'>;
            }).filter(Boolean) as Omit<Company, 'id'>[];

            if (newCompanies.length > 0) {
              await companiesService.createMany(newCompanies);
              alert(`${newCompanies.length} Firmen erfolgreich importiert!`);
            }
          } else { // Contacts
            const newContacts = results.data.map((row: any) => {
              if (!row["Vorname"] || !row["Nachname"]) return null;
              return {
                firstName: row["Vorname"],
                lastName: row["Nachname"],
                position: row["Position"] || '',
                email: row["E-Mail"] || '',
                phone: row["Telefon"] || '',
                notes: row["Notizen"] || '',
                userId: user.uid,
              } as Omit<Contact, 'id'>;
            }).filter(Boolean) as Omit<Contact, 'id'>[];

            if (newContacts.length > 0) {
              await contactsService.createMany(newContacts);
              alert(`${newContacts.length} Kontakte erfolgreich importiert!`);
            }
          }
          onImportSuccess();
          onClose();

        } catch (err) {
          console.error("Fehler beim Import:", err);
          setError("Ein Fehler ist aufgetreten. Bitte überprüfe das Dateiformat.");
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  return (
    <Dialog open={true} onClose={onClose} className="max-w-lg">
      <DialogTitle className="p-6">Daten importieren</DialogTitle>
      <DialogBody className="p-6">
        <p className="text-sm text-zinc-600 mb-4">
          Lade eine CSV-Datei hoch, um neue {activeTab === 'companies' ? 'Firmen' : 'Kontakte'} zu importieren. Die erste Zeile muss die Spaltenüberschriften enthalten.
        </p>
        <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </DialogBody>
      <DialogActions className="p-6">
        <Button plain onClick={onClose}>Abbrechen</Button>
        <Button color="indigo" onClick={handleImport} disabled={!file || isImporting}>
          {isImporting ? 'Importiere...' : 'Import starten'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}