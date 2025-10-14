// src/app/dashboard/contacts/lists/components/sections/ContactSelectorSection.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UsersIcon } from "@heroicons/react/24/outline";
import { ContactSelectorSectionProps } from './types';

export function ContactSelectorSection({ contactCount, onOpenSelector }: ContactSelectorSectionProps) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium mb-2 text-gray-900">Manuelle Kontaktauswahl</h3>
      <Text className="text-sm mb-4">
        Füge Kontakte manuell zu dieser Liste hinzu. Die Auswahl bleibt unverändert, bis du sie wieder anpasst.
      </Text>
      <Button
        type="button"
        onClick={onOpenSelector}
        className="whitespace-nowrap"
      >
        <UsersIcon />
        {contactCount.toLocaleString()} Kontakte auswählen
      </Button>
    </div>
  );
}
