// src/app/dashboard/contacts/crm/components/modals/ContactModal/GdprSection.tsx
"use client";

import { FieldGroup } from "@/components/ui/fieldset";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { ContactModalSectionProps } from "./types";

/**
 * GDPR Section für ContactModal
 *
 * Enthält: GDPR-Einwilligungen (Marketing, Newsletter, Telefonische Kontaktaufnahme)
 */
export function GdprSection({ formData, setFormData }: ContactModalSectionProps) {
  const updateGdprConsent = (purpose: string, granted: boolean) => {
    const existingConsents = formData.gdprConsents || [];
    const existingIndex = existingConsents.findIndex(c => c.purpose === purpose);

    const newConsent = {
      id: `consent_${purpose.toLowerCase()}_${Date.now()}`,
      purpose,
      status: granted ? 'granted' as const : 'revoked' as const,
      method: 'webform' as const,
      legalBasis: 'consent' as const,
      informationProvided: 'Via CRM',
      privacyPolicyVersion: '1.0'
    };

    if (existingIndex >= 0) {
      existingConsents[existingIndex] = newConsent;
    } else {
      existingConsents.push(newConsent);
    }

    setFormData({
      ...formData,
      gdprConsents: existingConsents
    });
  };

  return (
    <FieldGroup>
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium">Marketing-Kommunikation</Text>
              <Text className="text-sm text-gray-500">Erlaubnis für Marketing-E-Mails und -Anrufe</Text>
            </div>
            <label className="flex items-center">
              <Checkbox
                checked={formData.gdprConsents?.some(c => c.purpose === 'Marketing' && c.status === 'granted') || false}
                onChange={(checked) => updateGdprConsent('Marketing', checked)}
              />
              <span className="ml-2">Einwilligung erteilt</span>
            </label>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium">Newsletter</Text>
              <Text className="text-sm text-gray-500">Erlaubnis für Newsletter-Versand</Text>
            </div>
            <label className="flex items-center">
              <Checkbox
                checked={formData.gdprConsents?.some(c => c.purpose === 'Newsletter' && c.status === 'granted') || false}
                onChange={(checked) => updateGdprConsent('Newsletter', checked)}
              />
              <span className="ml-2">Einwilligung erteilt</span>
            </label>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium">Telefonische Kontaktaufnahme</Text>
              <Text className="text-sm text-gray-500">Erlaubnis für Anrufe</Text>
            </div>
            <label className="flex items-center">
              <Checkbox
                checked={formData.gdprConsents?.some(c => c.purpose === 'Telefonische Kontaktaufnahme' && c.status === 'granted') || false}
                onChange={(checked) => updateGdprConsent('Telefonische Kontaktaufnahme', checked)}
              />
              <span className="ml-2">Einwilligung erteilt</span>
            </label>
          </div>
        </div>
      </div>
    </FieldGroup>
  );
}
