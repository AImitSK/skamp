// src/app/dashboard/contacts/lists/ContactSelectorModal.tsx
"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { useCrmData } from "@/context/CrmDataContext";
import { ContactEnhanced } from "@/types/crm-enhanced";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";

interface ContactSelectorModalProps {
  initialSelectedIds: string[];
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
}

export default function ContactSelectorModal({
  initialSelectedIds,
  onClose,
  onSave,
}: ContactSelectorModalProps) {
  const { contacts: allContacts, loading } = useCrmData();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to get contact name
  const getContactName = (contact: ContactEnhanced): string => {
    if (contact.displayName) {
      return contact.displayName;
    }
    const parts = [];
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ');
  };

  // Helper function to get contact email
  const getContactEmail = (contact: ContactEnhanced): string | undefined => {
    if (contact.emails && contact.emails.length > 0) {
      const primaryEmail = contact.emails.find(e => e.isPrimary);
      return primaryEmail?.email || contact.emails[0]?.email;
    }
    return undefined;
  };

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return allContacts;
    
    const searchLower = searchTerm.toLowerCase();
    return allContacts.filter(contact => {
      const name = getContactName(contact).toLowerCase();
      const email = getContactEmail(contact)?.toLowerCase() || '';
      
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [allContacts, searchTerm]);
  
  const handleToggleSelection = (contactId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedIds(newSelection);
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds));
  };

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle className="px-6 py-4 text-lg font-semibold">
        Kontakte auswählen
      </DialogTitle>
      
      <div className="px-6 py-4 border-b border-t">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
          <Input
            type="search"
            placeholder="Kontakte durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <DialogBody className="p-0 max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
            <Text className="mt-2">Lade Kontakte...</Text>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredContacts.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => handleToggleSelection(contact.id!)}
                className="flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Checkbox 
                  checked={selectedIds.has(contact.id!)} 
                  onChange={() => {}}
                  className="text-[#005fab] focus:ring-[#005fab]"
                />
                <div className="flex-1">
                  <p className="font-medium">{getContactName(contact)}</p>
                  <p className="text-sm text-gray-500">
                    {contact.position}
                    {contact.companyName && ` bei ${contact.companyName}`}
                  </p>
                  {/* Show email if available */}
                  {getContactEmail(contact) && (
                    <p className="text-sm text-gray-400">{getContactEmail(contact)}</p>
                  )}
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="p-6 text-center">
                <Text>Keine Kontakte gefunden</Text>
              </div>
            )}
          </div>
        )}
      </DialogBody>
      
      <DialogActions className="px-6 py-4 flex justify-between items-center bg-gray-50">
        <Text className="text-sm">
          {selectedIds.size} Kontakte ausgewählt
        </Text>
        <div className="flex gap-3">
          <Button plain onClick={onClose} className="whitespace-nowrap">
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            Auswahl übernehmen
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}