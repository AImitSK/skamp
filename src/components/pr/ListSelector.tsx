// src/components/pr/ListSelector.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Field, Label, Description } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listsService } from '@/lib/firebase/lists-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { DistributionList } from '@/types/lists';
import { 
  MagnifyingGlassIcon, 
  UsersIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  UserGroupIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface ListSelectorProps {
  value: string;
  onChange: (listId: string, listName: string, contactCount: number) => void;
  lists?: DistributionList[]; // Optional, falls von außen übergeben
  loading?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  showStats?: boolean;
  showQuickAdd?: boolean;
}

export function ListSelector({
  value,
  onChange,
  lists: externalLists,
  loading = false,
  required = true,
  label,
  placeholder,
  className,
  error,
  disabled = false,
  showStats = true,
  showQuickAdd = true
}: ListSelectorProps) {
  const t = useTranslations('pr.listSelector');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [internalLists, setInternalLists] = useState<DistributionList[]>([]);
  const [loadingLists, setLoadingLists] = useState(!externalLists);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Use ref to prevent onChange from being called during render
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  
  // Verwende externe Listen wenn verfügbar, sonst interne
  const lists = externalLists || internalLists;
  
  // Setze OrganizationId aus Context
  useEffect(() => {
    if (currentOrganization?.id && !externalLists) {
      setOrganizationId(currentOrganization.id);
    }
  }, [currentOrganization?.id, externalLists]);
  
  // Lade Listen nur wenn keine externen Listen übergeben wurden
  useEffect(() => {
    const loadLists = async () => {
      if (!organizationId || externalLists) return;
      
      setLoadingLists(true);
      try {
        // listsService mit organizationId und user.uid Fallback
        console.log('🔍 ListSelector calling listsService with:', { organizationId, userId: user?.uid });
        const listsData = await listsService.getAll(organizationId, user?.uid);
        setInternalLists(listsData);
      } catch (error) {
        console.error('Error loading lists:', error);
      } finally {
        setLoadingLists(false);
      }
    };
    
    loadLists();
  }, [organizationId, externalLists]);
  
  // Selected list info
  const selectedList = useMemo(() => 
    lists.find(list => list.id === value),
    [lists, value]
  );

  // Filtered lists
  const filteredLists = useMemo(() => {
    let filtered = lists;
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(list => 
        list.name.toLowerCase().includes(search) ||
        list.description?.toLowerCase().includes(search)
      );
    }
    
    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [lists, searchTerm]);

  // Handle selection with callback ref
  const handleSelect = useCallback((listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (list) {
      // Use setTimeout to ensure this happens after render
      setTimeout(() => {
        onChangeRef.current(listId, list.name, list.contactCount);
      }, 0);
      setShowDropdown(false);
      setSearchTerm('');
    }
  }, [lists]);

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!showDropdown) {
      setSearchTerm('');
    }
  }, [showDropdown]);

  // Quick Add Handler (Placeholder)
  const handleQuickAdd = useCallback(async () => {
    if (!organizationId || !user) return;

    const listName = prompt(t('quickAdd.prompt'));
    if (!listName?.trim()) return;

    try {
      const newListData = {
        name: listName.trim(),
        description: t('quickAdd.descriptionTemplate', {
          date: new Date().toLocaleDateString()
        }),
        type: 'static' as const,
        category: 'custom' as const,
        color: 'blue' as const,
        organizationId, // Verwende organizationId für neue Listen
        userId: user.uid, // Backward compatibility
        contactIds: []
      };

      const newListId = await listsService.create(newListData);
      console.log('✅ New list created:', newListId);

      // Aktualisiere Liste wenn intern geladen
      if (!externalLists) {
        const updatedLists = await listsService.getAll(organizationId, user.uid);
        setInternalLists(updatedLists);
      }

      // Wähle die neue Liste aus
      onChangeRef.current(newListId, listName.trim(), 0);
      setShowDropdown(false);

    } catch (error) {
      console.error('Error creating list:', error);
      alert(t('quickAdd.error'));
    }
  }, [organizationId, user, externalLists, t]);

  // Toggle dropdown handler
  const handleToggleDropdown = useCallback(() => {
    if (!disabled) {
      setShowDropdown(prev => !prev);
    }
  }, [disabled]);

  // Render loading state
  if (loading || loadingLists) {
    return (
      <Field className={className}>
        <Label>
          {label || t('label')}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
      </Field>
    );
  }

  return (
    <Field className={className}>
      <Label>
        {label || t('label')}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Custom Dropdown Implementation */}
      <div className="relative mt-2">
        {/* Selected Value Display */}
        <button
          type="button"
          onClick={handleToggleDropdown}
          disabled={disabled}
          className={clsx(
            "w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            error ? "border-red-300" : "border-gray-300",
            disabled && "bg-gray-100 cursor-not-allowed",
            !disabled && "cursor-pointer hover:border-gray-400"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <UsersIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
              {selectedList ? (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {selectedList.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('contactCount', { count: selectedList.contactCount })}
                    {selectedList.type === 'dynamic' && ` • ${t('dynamicBadge')}`}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">{placeholder || t('placeholder')}</span>
              )}
            </div>
            {value && (
              <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
            )}
          </div>
        </button>

        {/* Dropdown Panel */}
        {showDropdown && !disabled && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown Content */}
            <div className="absolute z-20 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-hidden">
              {/* Search Input */}
              <div className="p-2 border-b">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="pl-9 pr-3 py-2"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Add Button */}
              {showQuickAdd && (
                <div className="p-2 border-b">
                  <Button
                    type="button"
                    onClick={handleQuickAdd}
                    plain
                    className="w-full justify-center text-indigo-600 hover:bg-indigo-50"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t('quickAdd.button')}
                  </Button>
                </div>
              )}

              {/* List Items */}
              <div className="max-h-64 overflow-y-auto">
                {filteredLists.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm ? t('emptyState.noResults') : t('emptyState.noLists')}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredLists.map((list) => {
                      const isSelected = list.id === value;
                      
                      return (
                        <li key={list.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(list.id!)}
                            className={clsx(
                              "w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                              isSelected && "bg-indigo-50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={clsx(
                                  "font-medium truncate",
                                  isSelected ? "text-indigo-900" : "text-gray-900"
                                )}>
                                  {list.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {t('contactCount', { count: list.contactCount })}
                                  </span>
                                  {list.type === 'dynamic' && (
                                    <Badge color="blue" className="text-xs">
                                      {t('dynamicBadge')}
                                    </Badge>
                                  )}
                                  {list.type === 'static' && (
                                    <Badge color="zinc" className="text-xs">
                                      {t('staticBadge')}
                                    </Badge>
                                  )}
                                  {list.description && (
                                    <span className="text-xs text-gray-400 truncate">
                                      {list.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircleIcon className="h-5 w-5 text-indigo-600 ml-2 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Stats Footer */}
              {showStats && filteredLists.length > 0 && (
                <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
                  {t('stats.available', { count: filteredLists.length })}
                  {searchTerm && ` • ${t('stats.search', { query: searchTerm })}`}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {/* Selected List Info */}
      {selectedList && showStats && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{selectedList.name}</p>
              <p className="text-gray-600 mt-1">
                {t('selectedInfo.recipients', { count: selectedList.contactCount })}
                {selectedList.type === 'dynamic' && ` • ${t('selectedInfo.autoUpdate')}`}
              </p>
              {selectedList.description && (
                <p className="text-gray-500 mt-1">{selectedList.description}</p>
              )}
            </div>
            <div className="ml-4">
              <a
                href={`/dashboard/contacts/lists/${selectedList.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-500"
              >
                {t('selectedInfo.viewList')}
              </a>
            </div>
          </div>
        </div>
      )}
    </Field>
  );
}