// src/app/dashboard/contacts/crm/components/modals/ContactModal/MediaSection.tsx
"use client";

import { Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { ContactModalSectionProps } from "./types";

/**
 * Media Section für ContactModal
 *
 * Enthält: Publikationen, Ressorts/Beats, Medientypen, Bevorzugte Formate, Einreichungs-Richtlinien
 * Nur sichtbar wenn mediaProfile.isJournalist = true
 */
export function MediaSection({ formData, setFormData, publications = [] }: ContactModalSectionProps) {
  // Beat handlers
  const addBeat = (beat: string) => {
    if (!beat.trim()) return;
    const currentBeats = formData.mediaProfile?.beats || [];
    if (!currentBeats.includes(beat)) {
      setFormData({
        ...formData,
        mediaProfile: {
          ...formData.mediaProfile!,
          beats: [...currentBeats, beat]
        }
      });
    }
  };

  const removeBeat = (beat: string) => {
    setFormData({
      ...formData,
      mediaProfile: {
        ...formData.mediaProfile!,
        beats: formData.mediaProfile?.beats?.filter(b => b !== beat) || []
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Publikationen */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">Publikationen</h3>
          <p className="text-xs text-gray-500">
            {formData.companyId ?
              'Wählen Sie die Publikationen dieser Firma aus, für die der Journalist arbeitet.' :
              'Wählen Sie zuerst eine Firma aus, um deren Publikationen anzuzeigen.'
            }
          </p>
        </div>

        {formData.companyId ? (
          <div className="max-h-60 overflow-y-auto rounded-lg border bg-gray-50 p-2">
            {publications.length > 0 ? (
              <div className="space-y-1">
                {publications.map((pub) => (
                  <label key={pub.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-white cursor-pointer transition-colors">
                    <Checkbox
                      checked={formData.mediaProfile?.publicationIds?.includes(pub.id!) || false}
                      onChange={(checked) => {
                        const currentIds = formData.mediaProfile?.publicationIds || [];
                        const newIds = checked
                          ? [...currentIds, pub.id!]
                          : currentIds.filter(id => id !== pub.id);
                        setFormData({
                          ...formData,
                          mediaProfile: {
                            ...formData.mediaProfile!,
                            publicationIds: newIds
                          }
                        });
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{pub.title}</div>
                      <div className="text-xs text-gray-500">
                        {pub.type === 'magazine' ? 'Magazin' :
                         pub.type === 'newspaper' ? 'Zeitung' :
                         pub.type === 'website' ? 'Website' :
                         pub.type === 'blog' ? 'Blog' :
                         pub.type === 'trade_journal' ? 'Fachzeitschrift' :
                         pub.type} • {pub.format === 'print' ? 'Print' : pub.format === 'online' ? 'Online' : 'Print & Online'}
                      </div>
                    </div>
                    {pub.verified && (
                      <Badge color="green" className="text-xs">Verifiziert</Badge>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <Text className="text-sm text-gray-500 text-center py-4">
                Diese Firma hat noch keine Publikationen.
              </Text>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 p-4">
            <Text className="text-sm text-amber-800">
              Bitte wählen Sie zuerst eine Firma im Tab &ldquo;Allgemein&rdquo; aus.
            </Text>
          </div>
        )}
      </div>

      {/* Ressorts/Beats */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">Ressorts & Themengebiete</h3>
          <p className="text-xs text-gray-500">Über welche Themen berichtet dieser Journalist?</p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="z.B. Technologie, Wirtschaft, Politik..."
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  addBeat(input.value);
                  input.value = '';
                }
              }}
            />
            <Button
              type="button"
              plain
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addBeat(input.value);
                input.value = '';
              }}
              className="whitespace-nowrap"
            >
              Hinzufügen
            </Button>
          </div>

          {formData.mediaProfile?.beats?.length ? (
            <div className="flex flex-wrap gap-2">
              {formData.mediaProfile.beats.map((beat) => (
                <Badge key={beat} color="blue">
                  {beat}
                  <button
                    type="button"
                    onClick={() => removeBeat(beat)}
                    className="ml-1.5 hover:text-blue-800"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <Text className="text-xs text-gray-500">Noch keine Ressorts hinzugefügt</Text>
          )}
        </div>
      </div>

      {/* Medientypen & Formate in zwei Spalten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Media Types */}
        <div className="space-y-4 rounded-md border p-4 bg-gray-50">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-900">Medientypen</h3>
            <p className="text-xs text-gray-500">In welchen Medien arbeitet der Journalist?</p>
          </div>

          <div className="space-y-2">
            {MEDIA_TYPES.map(type => (
              <label key={type.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.mediaProfile?.mediaTypes?.includes(type.value) || false}
                  onChange={(checked) => {
                    const current = formData.mediaProfile?.mediaTypes || [];
                    const updated = checked
                      ? [...current, type.value]
                      : current.filter(t => t !== type.value);
                    setFormData({
                      ...formData,
                      mediaProfile: {
                        ...formData.mediaProfile!,
                        mediaTypes: updated
                      }
                    });
                  }}
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submission Formats */}
        <div className="space-y-4 rounded-md border p-4 bg-gray-50">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-900">Bevorzugte Formate</h3>
            <p className="text-xs text-gray-500">Welche Inhaltsformate werden bevorzugt?</p>
          </div>

          <div className="space-y-2">
            {SUBMISSION_FORMATS.map(format => (
              <label key={format.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.mediaProfile?.preferredFormats?.includes(format.value) || false}
                  onChange={(checked) => {
                    const current = formData.mediaProfile?.preferredFormats || [];
                    const updated = checked
                      ? [...current, format.value]
                      : current.filter(f => f !== format.value);
                    setFormData({
                      ...formData,
                      mediaProfile: {
                        ...formData.mediaProfile!,
                        preferredFormats: updated
                      }
                    });
                  }}
                />
                <span>{format.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Guidelines */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">Einreichungs-Richtlinien</h3>
          <p className="text-xs text-gray-500">Spezielle Anforderungen oder Hinweise für die Kontaktaufnahme</p>
        </div>

        <Textarea
          value={formData.mediaProfile?.submissionGuidelines || ''}
          onChange={(e) => setFormData({
            ...formData,
            mediaProfile: {
              ...formData.mediaProfile!,
              submissionGuidelines: e.target.value
            }
          })}
          rows={3}
          placeholder="z.B. Bevorzugte Kontaktzeiten, spezielle Anforderungen an Pressemitteilungen, Deadlines..."
        />
      </div>
    </div>
  );
}
