// src/app/dashboard/listen/ContactSelectorModal.tsx
"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Checkbox } from "@/components/checkbox";
import { useCrmData } from "@/context/CrmDataContext";
import { Contact } from "@/types/crm";
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

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return allContacts;
    return allContacts.filter(contact => 
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
      <DialogTitle className="px-6 py-4">Kontakte auswählen</DialogTitle>
      <div className="p-6 border-b border-t">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Kontakte durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
      </div>
      <DialogBody className="p-0 max-h-[50vh] overflow-y-auto">
        {loading ? (
            <div className="p-6 text-center text-zinc-500">Lade Kontakte...</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredContacts.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => handleToggleSelection(contact.id!)}
                className="flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-zinc-50"
              >
                <Checkbox 
                  checked={selectedIds.has(contact.id!)} 
                  onChange={() => {}}
                  className="text-[#005fab] focus:ring-[#005fab]"
                />
                <div>
                  <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                  <p className="text-sm text-zinc-500">{contact.position}{contact.companyName && ` bei ${contact.companyName}`}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogBody>
      <DialogActions className="px-6 py-4 flex justify-between items-center bg-zinc-50">
        <div className="text-sm text-zinc-600">
          {selectedIds.size} Kontakte ausgewählt
        </div>
        <div className="flex gap-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <button 
            onClick={handleSave}
            className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
          >
            Auswahl übernehmen
          </button>
        </div>
      </DialogActions>
    </Dialog>
  );
}