// src/components/inbox/CustomerCampaignSidebar.tsx
"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';
import {
  BuildingOfficeIcon,
  MegaphoneIcon,
  InboxIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  PlusIcon
} from '@heroicons/react/20/solid';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface CustomerCampaignSidebarProps {
  selectedCustomerId?: string;
  selectedCampaignId?: string;
  selectedFolderType: 'customer' | 'campaign' | 'general';
  onFolderSelect: (type: 'customer' | 'campaign' | 'general', id?: string) => void;
  unreadCounts: Record<string, number>;
  organizationId: string;
}

interface CustomerFolder {
  id: string;
  name: string;
  campaigns: CampaignFolder[];
  unreadCount: number;
  isExpanded: boolean;
}

interface CampaignFolder {
  id: string;
  name: string;
  unreadCount: number;
}

export function CustomerCampaignSidebar({
  selectedCustomerId,
  selectedCampaignId,
  selectedFolderType,
  onFolderSelect,
  unreadCounts,
  organizationId
}: CustomerCampaignSidebarProps) {
  const [customers, setCustomers] = useState<CustomerFolder[]>([]);
  const [generalUnread, setGeneralUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // Lade Kunden und Kampagnen
  useEffect(() => {
    loadCustomersAndCampaigns();
  }, [organizationId, unreadCounts]);

  const loadCustomersAndCampaigns = async () => {
    try {
      setLoading(true);
      
      // Lade alle Kunden (Companies aus CRM)
      const customersQuery = query(
        collection(db, 'companies'),
        where('organizationId', '==', organizationId),
        orderBy('name', 'asc')
      );
      
      const customersSnapshot = await getDocs(customersQuery);
      const customerData: CustomerFolder[] = [];
      
      for (const doc of customersSnapshot.docs) {
        const customer = doc.data();
        
        // Lade Kampagnen für diesen Kunden
        const campaignsQuery = query(
          collection(db, 'pr_campaigns'),
          where('organizationId', '==', organizationId),
          where('clientId', '==', doc.id),
          where('status', 'in', ['sent', 'approved']),
          orderBy('createdAt', 'desc')
        );
        
        const campaignsSnapshot = await getDocs(campaignsQuery);
        const campaigns: CampaignFolder[] = [];
        
        campaignsSnapshot.forEach(campaignDoc => {
          const campaign = campaignDoc.data();
          campaigns.push({
            id: campaignDoc.id,
            name: campaign.title,
            unreadCount: unreadCounts[`campaign_${campaignDoc.id}`] || 0
          });
        });
        
        const customerUnread = unreadCounts[`customer_${doc.id}`] || 0;
        const campaignUnreadTotal = campaigns.reduce((sum, c) => sum + c.unreadCount, 0);
        
        customerData.push({
          id: doc.id,
          name: customer.name,
          campaigns,
          unreadCount: customerUnread + campaignUnreadTotal,
          isExpanded: expandedCustomers.has(doc.id)
        });
      }
      
      setCustomers(customerData);
      setGeneralUnread(unreadCounts['general'] || 0);
      
    } catch (error) {
      console.error('Error loading customers and campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerExpanded = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.campaigns.some(c => c.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col">
      {/* Header mit Suche */}
      <div className="p-4 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">E-Mail Organisation</h3>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kunde oder Kampagne suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
          />
        </div>
      </div>

      {/* Folder List */}
      <nav className="flex-1 overflow-y-auto">
        {/* Allgemeine Anfragen */}
        <div className="px-2 pt-4">
          <button
            onClick={() => onFolderSelect('general')}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedFolderType === 'general' && !selectedCustomerId
                ? 'bg-[#005fab] text-white'
                : 'text-gray-700 hover:bg-gray-200'
            )}
          >
            <div className="flex items-center gap-3">
              <InboxIcon className="h-5 w-5" />
              <span>Allgemeine Anfragen</span>
            </div>
            {generalUnread > 0 && (
              <Badge 
                color={selectedFolderType === 'general' ? 'zinc' : 'blue'} 
                className={clsx(
                  'whitespace-nowrap',
                  selectedFolderType === 'general' ? 'bg-white/20 text-white' : ''
                )}
              >
                {generalUnread}
              </Badge>
            )}
          </button>
        </div>

        {/* Kunden & Kampagnen */}
        <div className="px-2 pt-4">
          <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Kunden & Kampagnen
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab]"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              {searchQuery ? 'Keine Ergebnisse gefunden' : 'Noch keine Kunden mit E-Mails'}
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredCustomers.map((customer) => {
                const isCustomerSelected = selectedFolderType === 'customer' && selectedCustomerId === customer.id;
                const isExpanded = expandedCustomers.has(customer.id);
                
                return (
                  <li key={customer.id}>
                    {/* Customer Folder */}
                    <div
                      className={clsx(
                        'flex items-center rounded-lg text-sm transition-colors',
                        isCustomerSelected
                          ? 'bg-[#005fab] text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleCustomerExpanded(customer.id)}
                        className="p-2 hover:bg-black/10 rounded"
                        disabled={customer.campaigns.length === 0}
                      >
                        {customer.campaigns.length > 0 ? (
                          isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </button>

                      {/* Customer Name */}
                      <button
                        onClick={() => onFolderSelect('customer', customer.id)}
                        className="flex-1 flex items-center justify-between px-2 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{customer.name}</span>
                        </div>
                        {customer.unreadCount > 0 && (
                          <Badge 
                            color={isCustomerSelected ? 'zinc' : 'blue'} 
                            className={clsx(
                              'whitespace-nowrap ml-2',
                              isCustomerSelected ? 'bg-white/20 text-white' : ''
                            )}
                          >
                            {customer.unreadCount}
                          </Badge>
                        )}
                      </button>
                    </div>

                    {/* Campaign Sub-folders */}
                    {isExpanded && customer.campaigns.length > 0 && (
                      <ul className="mt-1 ml-6 space-y-1">
                        {customer.campaigns.map((campaign) => {
                          const isCampaignSelected = selectedFolderType === 'campaign' && selectedCampaignId === campaign.id;
                          
                          return (
                            <li key={campaign.id}>
                              <button
                                onClick={() => onFolderSelect('campaign', campaign.id)}
                                className={clsx(
                                  'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors',
                                  isCampaignSelected
                                    ? 'bg-[#005fab] text-white'
                                    : 'text-gray-600 hover:bg-gray-200'
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <MegaphoneIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate text-xs">{campaign.name}</span>
                                </div>
                                {campaign.unreadCount > 0 && (
                                  <Badge 
                                    color={isCampaignSelected ? 'zinc' : 'blue'} 
                                    className={clsx(
                                      'whitespace-nowrap ml-2 text-xs',
                                      isCampaignSelected ? 'bg-white/20 text-white' : ''
                                    )}
                                  >
                                    {campaign.unreadCount}
                                  </Badge>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </nav>

    </div>
  );
}