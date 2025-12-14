'use client';

import React, { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface Client {
  id: string;
  name: string;
  type: string;
  contactCount: number;
}

interface ClientSelectorProps {
  clients: Client[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
}

export function ClientSelector({ clients, selectedClientId, onSelect }: ClientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslations('projects.creation.clientSelector');
  const tTypes = useTranslations('crm.companyTypes');

  // Helper function to translate company types
  const getCompanyTypeLabel = (type: string): string => {
    const typeKey = type.toLowerCase();
    // Map enterprise and startup to their German equivalents
    if (typeKey === 'enterprise') return t('companyTypes.enterprise');
    if (typeKey === 'startup') return t('companyTypes.startup');
    // Use CRM company types for standard types
    return tTypes(typeKey as any) || type;
  };

  // Filter Kunden basierend auf Suchbegriff
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sortiere Kunden - Recent zuerst (Mock-Logic)
  const sortedClients = [...filteredClients].sort((a, b) => {
    // In der Praxis würde hier nach letzter Verwendung sortiert
    return b.contactCount - a.contactCount;
  });

  const handleClientSelect = (e: React.MouseEvent, clientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(clientId);
  };

  return (
    <div className="space-y-4">
      {/* Suchfeld */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('searchPlaceholder')}
        />
      </div>

      {/* Recent Clients Shortcuts (Mock) */}
      {searchTerm === '' && sortedClients.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{t('recentlyUsed')}</p>
          <div className="flex flex-wrap gap-2">
            {sortedClients.slice(0, 3).map((client) => (
              <button
                type="button"
                key={`recent-${client.id}`}
                onClick={(e) => handleClientSelect(e, client.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full border ${
                  selectedClientId === client.id
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {client.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kunden-Liste */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sortedClients.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              {searchTerm ? t('noClientsFound') : t('noClientsAvailable')}
            </p>
          </div>
        ) : (
          sortedClients.map((client) => (
            <div
              key={client.id}
              onClick={(e) => handleClientSelect(e, client.id)}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedClientId === client.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {client.name}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500">
                      {t('typeLabel')} {getCompanyTypeLabel(client.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {client.contactCount} {t('contactsCount')}
                    </span>
                  </div>
                </div>
                
                {/* Client-Type-Indicator */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    client.type === 'enterprise'
                      ? 'bg-purple-100 text-purple-800'
                      : client.type === 'startup'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {getCompanyTypeLabel(client.type)}
                  </span>
                </div>
              </div>

              {/* Client-Details-Preview bei Auswahl */}
              {selectedClientId === client.id && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="text-xs text-blue-700">
                    <div className="flex justify-between items-center">
                      <span>{t('contactsLabel')} {client.contactCount}</span>
                      <span className="text-blue-600">{t('selected')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}