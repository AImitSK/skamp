// src/app/dashboard/contacts/crm/ImportModal.tsx
"use client";

import { useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import Papa from 'papaparse';
import { companiesService, contactsService } from '@/lib/firebase/crm-service';
import { Company, Contact, CompanyType } from '@/types/crm';
import { useAuth } from '@/context/AuthContext';
import {
  InformationCircleIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/20/solid';

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'success' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: InformationCircleIcon,
    error: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

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
  const [success, setSuccess] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleImport = () => {
    if (!file || !user) return;
    
    setIsImporting(true);
    setError('');
    setSuccess('');

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
              setSuccess(`${newCompanies.length} Firmen erfolgreich importiert!`);
              setTimeout(() => {
                onImportSuccess();
                onClose();
              }, 2000);
            } else {
              setError('Keine gültigen Firmen in der Datei gefunden.');
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
              setSuccess(`${newContacts.length} Kontakte erfolgreich importiert!`);
              setTimeout(() => {
                onImportSuccess();
                onClose();
              }, 2000);
            } else {
              setError('Keine gültigen Kontakte in der Datei gefunden.');
            }
          }
        } catch (err) {
          console.error("Fehler beim Import:", err);
          setError("Ein Fehler ist aufgetreten. Bitte überprüfen Sie das Dateiformat.");
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  const expectedColumns = activeTab === 'companies'
    ? 'Firmenname, Typ, Branche, Website, Telefon, Strasse, Adresszeile 2, PLZ, Stadt, Land, Notizen'
    : 'Vorname, Nachname, Position, E-Mail, Telefon, Notizen';

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle className="px-6 py-4 text-lg font-semibold">
        Daten importieren
      </DialogTitle>
      
      <DialogBody className="p-6">
        <div className="space-y-4">
          <Text>
            Laden Sie eine CSV-Datei hoch, um neue {activeTab === 'companies' ? 'Firmen' : 'Kontakte'} zu importieren. 
            Die erste Zeile muss die Spaltenüberschriften enthalten.
          </Text>
          
          <div className="rounded-md bg-gray-50 p-4">
            <div className="flex">
              <div className="shrink-0">
                <InformationCircleIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="ml-3">
                <Text className="text-sm font-medium text-gray-900">Erwartete Spalten:</Text>
                <Text className="text-sm text-gray-700 mt-1">{expectedColumns}</Text>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              CSV-Datei auswählen
            </label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-gray-400" />
                  <Text className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Klicken Sie hier</span> oder ziehen Sie eine Datei hierher
                  </Text>
                  <Text className="text-xs text-gray-500">CSV-Datei (max. 10MB)</Text>
                </div>
                <input 
                  id="file-upload" 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Ausgewählte Datei: <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {error && (
            <Alert type="error" message={error} />
          )}
          
          {success && (
            <Alert type="success" title="Erfolg!" message={success} />
          )}
        </div>
      </DialogBody>
      
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>Abbrechen</Button>
        <Button 
          onClick={handleImport} 
          disabled={!file || isImporting}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
        >
          {isImporting ? 'Importiere...' : 'Import starten'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}