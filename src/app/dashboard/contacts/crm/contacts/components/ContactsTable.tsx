// src/app/dashboard/contacts/crm/contacts/components/ContactsTable.tsx
"use client";

import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon
} from "@heroicons/react/24/outline";
import { ContactEnhanced } from "@/types/crm-enhanced";
import { Tag } from "@/types/crm";
import { TagsOverflowPopover } from "@/components/ui/tags-overflow-popover";

export interface ContactsTableProps {
  contacts: ContactEnhanced[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (contact: ContactEnhanced) => void;
  onDelete: (id: string, name: string) => void;
  tags: Tag[];
  getPrimaryEmail: (emails?: Array<{ email: string; isPrimary?: boolean }>) => string;
  getPrimaryPhone: (phones?: Array<{ number: string; countryCode?: string; isPrimary?: boolean }>) => string;
}

/**
 * Contacts Table Component
 *
 * Zeigt eine tabellarische Liste von Kontakten mit Aktionen an.
 *
 * @component
 */
/**
 * Formatiert den Kontaktnamen als "Nachname, Vorname" (ohne Titel wie Dr.)
 * Für Funktionskontakte wird der functionName angezeigt
 */
function formatContactName(contact: ContactEnhanced): string {
  // Funktionskontakte zeigen functionName
  if (contact.contactType && contact.contactType !== 'person') {
    return contact.functionName || contact.displayName || '(Kein Name)';
  }

  // Personen zeigen "Nachname, Vorname"
  const firstName = contact.name?.firstName || '';
  const lastName = contact.name?.lastName || '';

  if (lastName && firstName) {
    return `${lastName}, ${firstName}`;
  }
  if (lastName) {
    return lastName;
  }
  if (firstName) {
    return firstName;
  }
  return contact.displayName || '(Kein Name)';
}

/**
 * Gibt ein Badge für den Kontakttyp zurück
 */
function getContactTypeBadge(contact: ContactEnhanced): { label: string; color: string } | null {
  if (!contact.contactType || contact.contactType === 'person') {
    return null;
  }
  // Funktionskontakte (inkl. legacy 'editorial') zeigen graues Badge
  if (contact.contactType === 'function' || contact.contactType === 'editorial') {
    return { label: 'Funktion', color: 'zinc' };
  }
  return null;
}

export function ContactsTable({
  contacts,
  selectedIds,
  onSelectAll,
  onSelect,
  onView,
  onEdit,
  onDelete,
  tags,
  getPrimaryEmail,
  getPrimaryPhone
}: ContactsTableProps) {
  const router = useRouter();

  // Defensive: Stelle sicher, dass Arrays nie undefined sind
  const safeContacts = contacts || [];
  const safeTags = tags || [];

  const allSelected = safeContacts.length > 0 && selectedIds.size === safeContacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < safeContacts.length;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center">
          <div className="flex items-center w-[25%]">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(checked: boolean) => onSelectAll(checked)}
            />
            <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Name
            </span>
          </div>
          <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Firma / Position
          </div>
          <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Telefon / E-Mail
          </div>
          <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Social Media
          </div>
          <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pr-14">
            Tags
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {safeContacts.map((contact) => (
          <div key={contact.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center">
              {/* Name */}
              <div className="flex items-center w-[25%]">
                <Checkbox
                  checked={selectedIds.has(contact.id!)}
                  onChange={(checked: boolean) => onSelect(contact.id!, checked)}
                />
                <div className="ml-4 min-w-0 flex-1">
                  <button
                    onClick={() => onView(contact.id!)}
                    className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                  >
                    {formatContactName(contact)}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex flex-wrap gap-1">
                      {/* Kontakttyp-Badge für Funktionskontakte */}
                      {getContactTypeBadge(contact) && (
                        <Badge color={getContactTypeBadge(contact)!.color as any} className="text-xs">
                          {getContactTypeBadge(contact)!.label}
                        </Badge>
                      )}
                      {contact.mediaProfile?.isJournalist && (
                        <Badge color="purple" className="text-xs">
                          Journalist
                        </Badge>
                      )}
                      {(contact as any)._isReference && (
                        <Badge color="blue" className="text-xs">
                          🌐 Verweis
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Firma / Position */}
              <div className="w-[20%]">
                <div className="text-sm">
                  {contact.companyName && (
                    <div className="text-zinc-900 dark:text-white font-medium truncate">
                      {contact.companyName}
                    </div>
                  )}
                  {contact.position && (
                    <div className="text-zinc-600 dark:text-zinc-400 text-xs truncate mt-0.5">
                      {contact.position}
                    </div>
                  )}
                  {!contact.companyName && !contact.position && (
                    <span className="text-zinc-400">—</span>
                  )}
                </div>
              </div>

              {/* Telefon / E-Mail */}
              <div className="w-[20%]">
                <div className="space-y-1">
                  {getPrimaryPhone(contact.phones) ? (
                    <a
                      href={`tel:${getPrimaryPhone(contact.phones)}`}
                      className="text-sm text-primary hover:text-primary-hover flex items-center gap-1.5"
                    >
                      <PhoneIcon className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                      <span className="truncate">{getPrimaryPhone(contact.phones)}</span>
                    </a>
                  ) : (
                    <div className="text-sm text-zinc-400 flex items-center gap-1.5">
                      <PhoneIcon className="h-4 w-4 shrink-0" />
                      <span>—</span>
                    </div>
                  )}
                  {getPrimaryEmail(contact.emails) ? (
                    <a
                      href={`mailto:${getPrimaryEmail(contact.emails)}`}
                      className="text-sm text-primary hover:text-primary-hover flex items-center gap-1.5 min-w-0"
                      title={getPrimaryEmail(contact.emails)}
                    >
                      <EnvelopeIcon className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                      <span className="truncate block max-w-[160px]">{getPrimaryEmail(contact.emails)}</span>
                    </a>
                  ) : (
                    <div className="text-sm text-zinc-400 flex items-center gap-1.5">
                      <EnvelopeIcon className="h-4 w-4 shrink-0" />
                      <span>—</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media */}
              <div className="w-[10%]">
                {contact.socialProfiles && contact.socialProfiles.length > 0 ? (
                  <div className="flex gap-2">
                    {contact.socialProfiles.map((profile, idx) => (
                      <a
                        key={idx}
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-primary transition-colors"
                        title={profile.platform}
                      >
                        {profile.platform.toLowerCase() === 'linkedin' && (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        )}
                        {profile.platform.toLowerCase() === 'twitter' && (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        )}
                        {profile.platform.toLowerCase() === 'facebook' && (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                        )}
                        {profile.platform.toLowerCase() === 'instagram' && (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        )}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Tags */}
              <div className="flex-1 pr-14">
                <div className="flex flex-wrap gap-1">
                  {contact.tagIds?.slice(0, 3).map(tagId => {
                    const tag = safeTags.find(t => t.id === tagId);
                    return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                  })}
                  {contact.tagIds && contact.tagIds.length > 3 && (
                    <TagsOverflowPopover
                      tags={contact.tagIds.map(tagId => {
                        const tag = safeTags.find(t => t.id === tagId);
                        return tag ? { id: tag.id!, name: tag.name, color: tag.color } : null;
                      }).filter((t): t is { id: string; name: string; color: string } => t !== null)}
                      overflowCount={contact.tagIds.length - 3}
                    />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="ml-4">
                <Dropdown>
                  <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-400 stroke-[2.5]" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem onClick={() => onView(contact.id!)}>
                      <EyeIcon className="h-4 w-4" />
                      Anzeigen
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => onEdit(contact)}
                      disabled={(contact as any)?._isReference}
                      className={(contact as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <PencilIcon className="h-4 w-4" />
                      Bearbeiten {(contact as any)?._isReference && '(Verweis)'}
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() => onDelete(contact.id!, contact.displayName)}
                      disabled={(contact as any)?._isReference}
                      className={(contact as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="text-red-600">Löschen {(contact as any)?._isReference && '(Verweis)'}</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
