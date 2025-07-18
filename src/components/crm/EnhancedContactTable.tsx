// src/components/crm/EnhancedContactTable.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { Contact } from "@/types/crm";
import { ContactEnhanced, CONTACT_STATUS_OPTIONS, ContactEnhancedListView } from "@/types/crm-enhanced";
import {
  EllipsisVerticalIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  NewspaperIcon,
  TagIcon,
  CalendarIcon,
  UserIcon
} from "@heroicons/react/20/solid";
import clsx from "clsx";

interface EnhancedContactTableProps {
  contacts: ContactEnhanced[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onEdit: (contact: ContactEnhanced) => void;
  onDelete: (contact: ContactEnhanced) => void;
  onView: (contact: ContactEnhanced) => void;
  tags?: Map<string, { name: string; color: string }>;
  companies?: Map<string, { name: string; type: string }>;
  publications?: Map<string, { name: string; type: string }>;
  viewMode?: 'compact' | 'detailed';
}

export function EnhancedContactTable({
  contacts,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
  onView,
  tags = new Map(),
  companies = new Map(),
  publications = new Map(),
  viewMode = 'compact'
}: EnhancedContactTableProps) {
  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id!));
  const someSelected = contacts.some(c => selectedIds.has(c.id!)) && !allSelected;

  // Get primary phone
  const getPrimaryPhone = (contact: ContactEnhanced) => {
    const primary = contact.phones?.find(p => p.isPrimary);
    return primary || contact.phones?.[0];
  };

  // Get primary email
  const getPrimaryEmail = (contact: ContactEnhanced) => {
    const primary = contact.emails?.find(e => e.isPrimary);
    return primary || contact.emails?.[0];
  };

  // Format phone for display
  const formatPhone = (phone: { number: string; type: string }) => {
    // Simple formatting - you might want to use a library like libphonenumber-js
    const cleaned = phone.number.replace(/\D/g, '');
    if (cleaned.startsWith('49')) {
      // German number
      const match = cleaned.match(/^49(\d{2,4})(\d+)$/);
      if (match) {
        return `+49 ${match[1]} ${match[2]}`;
      }
    }
    return phone.number;
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'zinc';
      case 'unsubscribed': return 'yellow';
      case 'bounced': return 'red';
      case 'archived': return 'zinc';
      default: return 'zinc';
    }
  };

  // Get publication names for a contact
  const getContactPublications = (contact: ContactEnhanced) => {
    if (!contact.mediaProfile?.publicationIds || contact.mediaProfile.publicationIds.length === 0) {
      return [];
    }
    return contact.mediaProfile.publicationIds
      .map(id => publications.get(id))
      .filter(Boolean);
  };

  // Check if contact is a journalist
  const isJournalist = (contact: ContactEnhanced) => {
    return contact.mediaProfile?.isJournalist === true;
  };

  if (viewMode === 'detailed') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center">
            <div className="flex items-center w-[25%]">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onSelectAll}
              />
              <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Name & Position
              </span>
            </div>
            <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Firma
            </div>
            <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Publikationen
            </div>
            <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Tags/Ressort
            </div>
            <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Status
            </div>
            <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
              Kontakt
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {contacts.map((contact) => {
            const company = contact.companyId ? companies.get(contact.companyId) : null;
            const primaryPhone = getPrimaryPhone(contact);
            const primaryEmail = getPrimaryEmail(contact);
            const contactPublications = getContactPublications(contact);
            
            return (
              <div key={contact.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center">
                  {/* Name & Position */}
                  <div className="flex items-center w-[25%]">
                    <Checkbox
                      checked={selectedIds.has(contact.id!)}
                      onChange={(checked) => onSelectOne(contact.id!, checked)}
                    />
                    <div className="ml-4 min-w-0 flex-1">
                      <button
                        onClick={() => onView(contact)}
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                      >
                        {contact.displayName}
                      </button>
                      {contact.position && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {contact.position}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company */}
                  <div className="w-[20%]">
                    {company ? (
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                          {company.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </div>

                  {/* Publications */}
                  <div className="w-[20%]">
                    {isJournalist(contact) && contactPublications.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {contactPublications.slice(0, 2).map((pub, idx) => (
                          <Badge key={idx} color="blue" className="text-xs whitespace-nowrap">
                            <NewspaperIcon className="h-3 w-3 mr-1" />
                            {pub?.name}
                          </Badge>
                        ))}
                        {contactPublications.length > 2 && (
                          <span className="text-xs text-zinc-500">
                            +{contactPublications.length - 2}
                          </span>
                        )}
                      </div>
                    ) : isJournalist(contact) ? (
                      <Badge color="zinc" className="text-xs">
                        <NewspaperIcon className="h-3 w-3 mr-1" />
                        Journalist
                      </Badge>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </div>

                  {/* Tags/Beats */}
                  <div className="w-[15%]">
                    <div className="space-y-1">
                      {/* Beats for journalists */}
                      {contact.mediaProfile?.beats && contact.mediaProfile.beats.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {contact.mediaProfile.beats.slice(0, 2).map((beat, idx) => (
                            <Badge key={idx} color="purple" className="text-xs">
                              {beat}
                            </Badge>
                          ))}
                          {contact.mediaProfile.beats.length > 2 && (
                            <span className="text-xs text-zinc-500">
                              +{contact.mediaProfile.beats.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Regular tags */}
                      {contact.tagIds && contact.tagIds.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {contact.tagIds.slice(0, 2).map(tagId => {
                            const tag = tags.get(tagId);
                            return tag ? (
                              <Badge key={tagId} color={tag.color as any} className="text-xs">
                                {tag.name}
                              </Badge>
                            ) : null;
                          })}
                          {contact.tagIds.length > 2 && (
                            <span className="text-xs text-zinc-500">
                              +{contact.tagIds.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!contact.mediaProfile?.beats?.length && !contact.tagIds?.length && (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="w-[10%]">
                    <Badge color={getStatusColor(contact.status)} className="text-xs whitespace-nowrap">
                      {CONTACT_STATUS_OPTIONS.find(opt => opt.value === contact.status)?.label || 'Aktiv'}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-center gap-4 flex-1 justify-end pr-14 text-sm">
                    {primaryPhone && (
                      <a
                        href={`tel:${primaryPhone.number}`}
                        className="flex items-center gap-1 text-zinc-600 hover:text-primary dark:text-zinc-400"
                        title={formatPhone(primaryPhone)}
                      >
                        <PhoneIcon className="h-4 w-4" />
                        <span className="text-xs">{formatPhone(primaryPhone)}</span>
                      </a>
                    )}
                    {primaryEmail && (
                      <a
                        href={`mailto:${primaryEmail.email}`}
                        className="text-zinc-500 hover:text-primary dark:text-zinc-400"
                        title={primaryEmail.email}
                      >
                        <EnvelopeIcon className="h-4 w-4" />
                      </a>
                    )}
                    {contact.lastActivityAt && (
                      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="text-xs">
                          {new Date(contact.lastActivityAt.toDate()).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-4">
                    <Dropdown>
                      <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem onClick={() => onView(contact)}>
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem onClick={() => onEdit(contact)}>
                          Bearbeiten
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem onClick={() => onDelete(contact)}>
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact view (default) - matching Google Docs specification
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center">
          <div className="flex items-center w-[25%]">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onSelectAll}
            />
            <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Vollständiger Name / Position
            </span>
          </div>
          <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Firma
          </div>
          <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Telefon
          </div>
          <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Publikation(en)
          </div>
          <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Tags / Ressort
          </div>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {contacts.map((contact) => {
          const company = contact.companyId ? companies.get(contact.companyId) : null;
          const primaryPhone = getPrimaryPhone(contact);
          const contactPublications = getContactPublications(contact);
          
          return (
            <div key={contact.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center">
                {/* Name & Position */}
                <div className="flex items-center w-[25%]">
                  <Checkbox
                    checked={selectedIds.has(contact.id!)}
                    onChange={(checked) => onSelectOne(contact.id!, checked)}
                  />
                  <div className="ml-4 min-w-0 flex-1">
                    <button
                      onClick={() => onView(contact)}
                      className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                    >
                      {contact.name.salutation && `${contact.name.salutation} `}
                      {contact.name.title && `${contact.name.title} `}
                      {contact.displayName}
                    </button>
                    {contact.position && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {contact.position}
                      </div>
                    )}
                  </div>
                </div>

                {/* Company */}
                <div className="w-[20%] text-sm text-zinc-700 dark:text-zinc-300 truncate">
                  {company?.name || '—'}
                </div>

                {/* Phone */}
                <div className="w-[15%]">
                  {primaryPhone ? (
                    <a
                      href={`tel:${primaryPhone.number}`}
                      className="text-sm text-primary hover:text-primary-hover"
                      title={`${primaryPhone.type}: ${formatPhone(primaryPhone)}`}
                    >
                      {formatPhone(primaryPhone)}
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-400">—</span>
                  )}
                </div>

                {/* Publications */}
                <div className="w-[20%]">
                  {contactPublications.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {contactPublications.slice(0, 2).map((pub, idx) => (
                        <Badge key={idx} color="blue" className="text-xs whitespace-nowrap">
                          {pub?.name}
                        </Badge>
                      ))}
                      {contactPublications.length > 2 && (
                        <span className="text-xs text-zinc-500">
                          +{contactPublications.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">—</span>
                  )}
                </div>

                {/* Tags/Beats */}
                <div className="flex-1">
                  <div className="flex gap-1 flex-wrap">
                    {/* Show beats first for journalists */}
                    {contact.mediaProfile?.beats && contact.mediaProfile.beats.length > 0 && (
                      <>
                        {contact.mediaProfile.beats.slice(0, 2).map((beat, idx) => (
                          <Badge key={`beat-${idx}`} color="purple" className="text-xs">
                            {beat}
                          </Badge>
                        ))}
                      </>
                    )}
                    
                    {/* Then show regular tags */}
                    {contact.tagIds && contact.tagIds.length > 0 && (
                      <>
                        {contact.tagIds.slice(0, 2).map(tagId => {
                          const tag = tags.get(tagId);
                          return tag ? (
                            <Badge key={tagId} color={tag.color as any} className="text-xs">
                              {tag.name}
                            </Badge>
                          ) : null;
                        })}
                      </>
                    )}
                    
                    {/* Show count of remaining items */}
                    {((contact.mediaProfile?.beats?.length || 0) + (contact.tagIds?.length || 0)) > 2 && (
                      <span className="text-xs text-zinc-500">
                        +{(contact.mediaProfile?.beats?.length || 0) + (contact.tagIds?.length || 0) - 2}
                      </span>
                    )}
                    
                    {/* Show dash if no tags or beats */}
                    {!contact.mediaProfile?.beats?.length && !contact.tagIds?.length && (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 w-16 flex justify-end">
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => onView(contact)}>
                        Anzeigen
                      </DropdownItem>
                      <DropdownItem onClick={() => onEdit(contact)}>
                        Bearbeiten
                      </DropdownItem>
                      <DropdownDivider />
                      <DropdownItem onClick={() => onDelete(contact)}>
                        <span className="text-red-600">Löschen</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}